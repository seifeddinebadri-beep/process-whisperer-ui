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

    // Get document chunks for this process
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("content, chunk_index")
      .eq("process_id", process_id)
      .order("chunk_index");

    if (chunksError) throw new Error(`Failed to fetch chunks: ${chunksError.message}`);

    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ error: "No document chunks found for this process. Upload and parse a document first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullText = chunks.map((c: any) => c.content).join("\n\n");

    // Call LLM to extract structured steps
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
              "Tu es un expert en analyse de processus métier. À partir du texte brut d'un document (log d'événements, description de processus, JSON structuré), " +
              "extrais les étapes structurées du processus et le contexte global. " +
              "Identifie chaque étape avec son nom, description, rôle, outil utilisé, type de décision, données d'entrée/sortie, points de douleur, règles métier, fréquence et volume estimé. " +
              "Si le document est un JSON structuré avec des steps, extrais-les directement. " +
              "Retourne UNIQUEMENT via l'appel de fonction fourni.",
          },
          {
            role: "user",
            content: `Extrais les étapes de processus structurées et le contexte global de ce document :\n\n${fullText.slice(0, 30000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_process_data",
              description: "Extract structured process steps and context from document",
              parameters: {
                type: "object",
                properties: {
                  context: {
                    type: "object",
                    properties: {
                      process_objective: { type: "string", description: "Objectif global du processus" },
                      known_constraints: { type: "string", description: "Contraintes connues" },
                      assumptions: { type: "string", description: "Hypothèses" },
                      pain_points_summary: { type: "string", description: "Résumé des points de douleur" },
                      volume_and_frequency: { type: "string", description: "Volume et fréquence" },
                      stakeholder_notes: { type: "string", description: "Notes parties prenantes" },
                    },
                    required: ["process_objective"],
                    additionalProperties: false,
                  },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        role: { type: "string" },
                        tool_used: { type: "string" },
                        decision_type: { type: "string", enum: ["manual_judgment", "rule_based", "no_decision"] },
                        data_inputs: { type: "array", items: { type: "string" } },
                        data_outputs: { type: "array", items: { type: "string" } },
                        pain_points: { type: "string" },
                        business_rules: { type: "string" },
                        frequency: { type: "string" },
                        volume_estimate: { type: "string" },
                      },
                      required: ["name", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["context", "steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_process_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error [${status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { context, steps } = JSON.parse(toolCall.function.arguments);

    // Delete existing steps and context for this process (re-extraction)
    await supabase.from("process_steps").delete().eq("process_id", process_id);
    await supabase.from("process_context").delete().eq("process_id", process_id);

    // Insert context
    if (context) {
      await supabase.from("process_context").insert({
        process_id,
        process_objective: context.process_objective || null,
        known_constraints: context.known_constraints || null,
        assumptions: context.assumptions || null,
        pain_points_summary: context.pain_points_summary || null,
        volume_and_frequency: context.volume_and_frequency || null,
        stakeholder_notes: context.stakeholder_notes || null,
      });
    }

    // Insert steps
    if (steps && Array.isArray(steps)) {
      const stepInserts = steps.map((s: any, idx: number) => ({
        process_id,
        step_order: idx,
        name: s.name,
        description: s.description || null,
        role: s.role || null,
        tool_used: s.tool_used || null,
        decision_type: s.decision_type || null,
        data_inputs: s.data_inputs?.length ? s.data_inputs : null,
        data_outputs: s.data_outputs?.length ? s.data_outputs : null,
        pain_points: s.pain_points || null,
        business_rules: s.business_rules || null,
        frequency: s.frequency || null,
        volume_estimate: s.volume_estimate || null,
        source: "event_log",
      }));

      const { error: stepsError } = await supabase.from("process_steps").insert(stepInserts);
      if (stepsError) throw new Error(`Failed to insert steps: ${stepsError.message}`);
    }

    // Update process status to analyzed
    await supabase.from("uploaded_processes").update({ status: "analyzed" }).eq("id", process_id);

    return new Response(
      JSON.stringify({
        success: true,
        steps_count: steps?.length || 0,
        has_context: !!context,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-steps error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
