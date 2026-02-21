import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 5; // Process chunks in batches to avoid rate limits
const EMBEDDING_DIMENSION = 768;

async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  // Use Lovable AI to generate a pseudo-embedding via tool calling
  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
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
            content: `You are an embedding generator. Given text, produce a semantic embedding vector. Return ONLY the embedding values via the tool call. The embedding should capture the semantic meaning of the text for similarity search purposes. Generate exactly ${EMBEDDING_DIMENSION} floating point values between -1 and 1.`,
          },
          {
            role: "user",
            content: `Generate a ${EMBEDDING_DIMENSION}-dimensional semantic embedding vector for the following text. The values should reflect the semantic meaning for similarity search:\n\n${text.slice(0, 2000)}`,
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
                    description: `Array of ${EMBEDDING_DIMENSION} floating point numbers between -1 and 1`,
                  },
                },
                required: ["embedding"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "store_embedding" },
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (response.status === 402) {
      throw new Error("PAYMENT_REQUIRED");
    }
    throw new Error(`AI gateway error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) {
    throw new Error("No tool call in AI response");
  }

  const args = JSON.parse(toolCall.function.arguments);
  let embedding = args.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("Embedding is not an array");
  }

  // Pad or truncate to exact dimension
  if (embedding.length < EMBEDDING_DIMENSION) {
    embedding = [
      ...embedding,
      ...new Array(EMBEDDING_DIMENSION - embedding.length).fill(0),
    ];
  } else if (embedding.length > EMBEDDING_DIMENSION) {
    embedding = embedding.slice(0, EMBEDDING_DIMENSION);
  }

  // Normalize the vector
  const magnitude = Math.sqrt(
    embedding.reduce((sum: number, v: number) => sum + v * v, 0)
  );
  if (magnitude > 0) {
    embedding = embedding.map((v: number) => v / magnitude);
  }

  return embedding;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { process_id } = await req.json();
    if (!process_id) {
      return new Response(
        JSON.stringify({ error: "process_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get chunks without embeddings for this process
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, content, chunk_index")
      .eq("process_id", process_id)
      .is("embedding", null)
      .order("chunk_index");

    if (chunksError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch chunks",
          details: chunksError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No chunks to embed (all already have embeddings)",
          embedded_count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let embeddedCount = 0;
    let errors: string[] = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      for (const chunk of batch) {
        try {
          const embedding = await generateEmbedding(
            chunk.content,
            LOVABLE_API_KEY
          );

          // Format as pgvector string
          const embeddingStr = `[${embedding.join(",")}]`;

          const { error: updateError } = await supabase
            .from("document_chunks")
            .update({ embedding: embeddingStr })
            .eq("id", chunk.id);

          if (updateError) {
            errors.push(
              `Chunk ${chunk.chunk_index}: ${updateError.message}`
            );
          } else {
            embeddedCount++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          if (msg === "RATE_LIMITED") {
            // Wait and retry
            await sleep(5000);
            try {
              const embedding = await generateEmbedding(
                chunk.content,
                LOVABLE_API_KEY
              );
              const embeddingStr = `[${embedding.join(",")}]`;
              await supabase
                .from("document_chunks")
                .update({ embedding: embeddingStr })
                .eq("id", chunk.id);
              embeddedCount++;
            } catch (retryErr) {
              errors.push(
                `Chunk ${chunk.chunk_index}: Rate limited after retry`
              );
            }
          } else if (msg === "PAYMENT_REQUIRED") {
            return new Response(
              JSON.stringify({
                error:
                  "Payment required. Please add credits to your workspace.",
                embedded_count: embeddedCount,
              }),
              {
                status: 402,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              }
            );
          } else {
            errors.push(`Chunk ${chunk.chunk_index}: ${msg}`);
          }
        }

        // Small delay between requests to avoid rate limits
        await sleep(1000);
      }

      // Delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(2000);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        embedded_count: embeddedCount,
        total_chunks: chunks.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-embeddings error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
