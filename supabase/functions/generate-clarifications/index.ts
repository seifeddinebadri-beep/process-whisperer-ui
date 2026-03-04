import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { process_id } = await req.json();
    if (!process_id) {
      return new Response(JSON.stringify({ error: "process_id is required" }), {
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

    // Fetch process data
    const [stepsRes, contextRes, chunksRes] = await Promise.all([
      supabase.from("process_steps").select("*").eq("process_id", process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", process_id).maybeSingle(),
      supabase.from("document_chunks").select("content, chunk_index").eq("process_id", process_id).order("chunk_index").limit(10),
    ]);

    // Build context string
    const parts: string[] = [];
    const ctx = contextRes.data;
    if (ctx) {
      parts.push(`Objectif: ${ctx.process_objective || "N/A"}`);
      parts.push(`Contraintes: ${ctx.known_constraints || "N/A"}`);
      parts.push(`Points de douleur: ${ctx.pain_points_summary || "N/A"}`);
      parts.push(`Volume: ${ctx.volume_and_frequency || "N/A"}`);
    }

    const steps = stepsRes.data || [];
    if (steps.length > 0) {
      parts.push("\n--- Étapes ---");
      for (const s of steps) {
        parts.push(`${s.step_order}. ${s.name}: ${s.description || ""} (Outil: ${s.tool_used || "N/A"}, Rôle: ${s.role || "N/A"})`);
      }
    }

    const chunks = chunksRes.data || [];
    if (chunks.length > 0) {
      parts.push("\n--- Extraits ---");
      for (const c of chunks) {
        parts.push(c.content.slice(0, 500));
      }
    }

    const processContext = parts.join("\n");

    // Call LLM
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
              "Tu es un agent de clarification expert en analyse de processus. " +
              "Analyse le processus fourni et génère 6-8 questions de clarification pertinentes pour enrichir le contexte avant la découverte d'automatisation. " +
              "Chaque question doit cibler un manque d'information spécifique (volume, exceptions, règles métier, systèmes cachés, ambiguïtés, parties prenantes). " +
              "Pour chaque question, propose 3-4 options de réponse avec des descriptions. " +
              "Les questions doivent être concrètes et liées au processus analysé, pas génériques. " +
              "Retourne UNIQUEMENT via l'appel de fonction.",
          },
          {
            role: "user",
            content: `Génère des questions de clarification pour ce processus :\n\n${processContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate clarification questions for process analysis",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        category: { type: "string", enum: ["missing_context", "ambiguity", "volume_detail", "exception_handling", "business_rule", "stakeholder"] },
                        question: { type: "string" },
                        why: { type: "string", description: "Pourquoi cette question est importante" },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string" },
                              description: { type: "string" },
                            },
                            required: ["label"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["id", "category", "question", "why", "options"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error [${status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { questions } = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-clarifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
