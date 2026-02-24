import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_DIMENSION = 768;

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Generate exactly ${EMBEDDING_DIMENSION} floating point values between -1 and 1. Return ONLY via the tool call.`,
        },
        {
          role: "user",
          content: `Generate a ${EMBEDDING_DIMENSION}-dimensional semantic embedding vector for:\n\n${text.slice(0, 2000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "store_embedding",
            description: `Store a ${EMBEDDING_DIMENSION}-dimensional embedding vector`,
            parameters: {
              type: "object",
              properties: {
                embedding: {
                  type: "array",
                  items: { type: "number" },
                  description: `Array of ${EMBEDDING_DIMENSION} floats between -1 and 1`,
                },
              },
              required: ["embedding"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "store_embedding" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  let embedding = JSON.parse(toolCall.function.arguments).embedding;
  if (!Array.isArray(embedding)) throw new Error("Embedding is not an array");

  // Pad/truncate + normalize
  if (embedding.length < EMBEDDING_DIMENSION) {
    embedding = [...embedding, ...new Array(EMBEDDING_DIMENSION - embedding.length).fill(0)];
  } else if (embedding.length > EMBEDDING_DIMENSION) {
    embedding = embedding.slice(0, EMBEDDING_DIMENSION);
  }
  const magnitude = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0));
  if (magnitude > 0) embedding = embedding.map((v: number) => v / magnitude);

  return embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, process_id } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Generate embedding for the question
    const queryEmbedding = await generateEmbedding(question, LOVABLE_API_KEY);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // 2. Search similar chunks via pgvector
    const { data: matches, error: matchError } = await supabase.rpc("match_documents", {
      query_embedding: embeddingStr,
      match_count: 5,
      filter_process_id: process_id || null,
    });

    if (matchError) {
      return new Response(JSON.stringify({ error: "Search failed", details: matchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = (matches || [])
      .map((m: any) => `[Chunk ${m.chunk_index}, similarity: ${m.similarity.toFixed(3)}]\n${m.content}`)
      .join("\n\n---\n\n");

    // 3. Send context + question to AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en analyse de processus métier et automatisation. " +
              "Réponds en français de manière structurée et actionnable. " +
              "Base tes réponses UNIQUEMENT sur le contexte fourni. " +
              "Si le contexte ne contient pas assez d'information, indique-le clairement.",
          },
          {
            role: "user",
            content: `Contexte extrait des documents :\n\n${context}\n\n---\n\nQuestion : ${question}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error [${status}]`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "Pas de réponse générée.";

    return new Response(
      JSON.stringify({
        answer,
        sources: (matches || []).map((m: any) => ({
          chunk_index: m.chunk_index,
          similarity: m.similarity,
          process_id: m.process_id,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("rag-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
