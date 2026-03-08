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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let process_id: string | undefined;

  try {
    const body = await req.json();
    process_id = body.process_id;
    const pdf_path: string | null = body.pdf_path || null;

    if (!process_id) {
      return new Response(JSON.stringify({ error: "process_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "analyst", action: "analyze_as_is", status: "started",
      message: "Analyst agent started — reading document chunks...",
    });

    // Get document chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("content, chunk_index")
      .eq("process_id", process_id)
      .order("chunk_index");

    if (chunksError) throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    if (!chunks || chunks.length === 0) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "analyze_as_is", status: "error",
        message: "No document chunks found for this process.",
      });
      return new Response(JSON.stringify({ error: "No document chunks found." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("agent_logs").insert({
      process_id, agent_name: "analyst", action: "analyze_as_is", status: "started",
      message: `Reading ${chunks.length} document chunks${pdf_path ? " + PDF screenshots" : ""}...`,
    });

    const fullText = chunks.map((c: any) => c.content).join("\n\n");

    // Build multimodal messages
    const messages: any[] = [
      {
        role: "system",
        content:
          "Tu es l'agent Analyst, expert en analyse de processus métier. " +
          "À partir du texte brut d'un document (et éventuellement de captures d'écran PDF), extrais les étapes structurées du processus et le contexte global. " +
          "En plus de l'extraction, fournis : un résumé de ton analyse (agent_summary), un score de confiance (0-100), " +
          "et une liste des lacunes identifiées (gaps_identified). " +
          "Le résumé doit expliquer ce que tu as trouvé, les lacunes doivent pointer les informations manquantes. " +
          "Si des captures d'écran sont fournies, utilise-les pour identifier des étapes visuelles, des interfaces système, et des actions utilisateur. " +
          "Pour chaque étape liée à une capture d'écran, indique le numéro de page dans screenshot_page. " +
          "Retourne UNIQUEMENT via l'appel de fonction fourni.\n\n" +
          "RÈGLES ANTI-HALLUCINATION (STRICTES) :\n" +
          "- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le document ou les captures d'écran.\n" +
          "- Si une information est absente, écris 'Non mentionné dans le document'.\n" +
          "- Ne fabrique JAMAIS de noms d'outils, de systèmes ou de technologies non cités.\n" +
          "- Ne génère JAMAIS de chiffres sans données sources. Si tu estimes, préfixe par 'Estimation :'.\n" +
          "- Chaque affirmation doit être traçable vers le document source ou une capture d'écran.\n" +
          "- En cas de doute, signale-le plutôt que de deviner.",
      },
    ];

    // Build user content (text + optional images)
    const userContent: any[] = [
      { type: "text", text: `Analyse ce document et extrais les étapes de processus :\n\n${fullText.slice(0, 30000)}` },
    ];

    // If PDF was uploaded, download and include pages as images
    let screenshotPaths: { page: number; path: string }[] = [];
    if (pdf_path) {
      try {
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from("process-files")
          .download(pdf_path);

        if (!pdfError && pdfData) {
          // Convert PDF to base64 and send as document to Gemini
          const pdfBytes = await pdfData.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
          
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${pdfBase64}`,
            },
          });
          
          userContent.push({
            type: "text",
            text: "\n\nLe PDF ci-dessus contient des captures d'écran du processus. Analyse chaque page et associe les étapes identifiées aux numéros de page correspondants via le champ screenshot_page.",
          });
        }
      } catch (e) {
        console.error("PDF processing error:", e);
        // Continue without PDF — text analysis still works
      }
    }

    messages.push({ role: "user", content: userContent });

    // Call LLM
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_process_data",
              description: "Extract structured process steps, context, and agent reasoning",
              parameters: {
                type: "object",
                properties: {
                  agent_summary: { type: "string", description: "Résumé en 2-3 phrases de l'analyse" },
                  confidence: { type: "number", description: "Score de confiance 0-100" },
                  gaps_identified: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lacunes ou informations manquantes",
                  },
                  context: {
                    type: "object",
                    properties: {
                      process_objective: { type: "string" },
                      known_constraints: { type: "string" },
                      assumptions: { type: "string" },
                      pain_points_summary: { type: "string" },
                      volume_and_frequency: { type: "string" },
                      stakeholder_notes: { type: "string" },
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
                        screenshot_page: { type: "number", description: "Numéro de page PDF correspondant à cette étape" },
                        actions: {
                          type: "array",
                          description: "Liste des actions granulaires observées dans le journal d'événements pour cette étape",
                          items: {
                            type: "object",
                            properties: {
                              description: { type: "string", description: "Description détaillée de l'action utilisateur/système" },
                              system_used: { type: "string", description: "Système ou application utilisé pour cette action" },
                              screenshot_page: { type: "number", description: "Numéro de page PDF correspondant à cette action" },
                            },
                            required: ["description"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["agent_summary", "confidence", "gaps_identified", "context", "steps"],
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
      const errText = await aiResponse.text();
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "analyze_as_is", status: "error",
        message: `AI error [${status}]`, metadata: { error: errText },
      });
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
      throw new Error(`AI error [${status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { context, steps, agent_summary, confidence, gaps_identified } = JSON.parse(toolCall.function.arguments);

    // Delete existing data
    await supabase.from("process_steps").delete().eq("process_id", process_id);
    await supabase.from("process_context").delete().eq("process_id", process_id);
    await supabase.from("process_screenshots").delete().eq("process_id", process_id);

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

    // If PDF was provided, store a reference in process_screenshots
    if (pdf_path) {
      await supabase.from("process_screenshots").insert({
        process_id,
        file_path: pdf_path,
        page_number: 0,
        caption: "Document PDF source",
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
        source: "agent_analyst",
        screenshot_url: s.screenshot_page != null && pdf_path
          ? `page:${s.screenshot_page}`
          : null,
      }));
      await supabase.from("process_steps").insert(stepInserts);
    }

    // Update process status
    await supabase.from("uploaded_processes").update({ status: "analyzed" }).eq("id", process_id);

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "analyst", action: "analyze_as_is", status: "completed",
      message: agent_summary || `Extracted ${steps?.length || 0} steps with ${confidence}% confidence.`,
      metadata: {
        steps_count: steps?.length || 0,
        confidence,
        gaps_count: gaps_identified?.length || 0,
        gaps: gaps_identified,
        has_pdf: !!pdf_path,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        steps_count: steps?.length || 0,
        has_context: !!context,
        agent_summary,
        confidence,
        gaps_identified,
        has_pdf: !!pdf_path,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-analyze-as-is error:", e);
    if (process_id) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "analyze_as_is", status: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
