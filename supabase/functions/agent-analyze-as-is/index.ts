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
    const extract_actions_only: boolean = body.extract_actions_only === true;

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

    // ==================== EXTRACT ACTIONS ONLY MODE ====================
    if (extract_actions_only) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "extract_actions", status: "started",
        message: "Extracting detailed actions for existing steps...",
      });

      // Fetch existing steps
      const { data: existingSteps, error: stepsErr } = await supabase
        .from("process_steps")
        .select("id, name, description, role, tool_used")
        .eq("process_id", process_id)
        .order("step_order");

      if (stepsErr || !existingSteps?.length) {
        return new Response(JSON.stringify({ error: "No steps found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch document chunks for context
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("content, chunk_index")
        .eq("process_id", process_id)
        .order("chunk_index");

      const fullText = (chunks || []).map((c: any) => c.content).join("\n\n");

      const stepsDescription = existingSteps.map((s: any, i: number) =>
        `Step ${i + 1} (id: ${s.id}): ${s.name} — ${s.description || "No description"} [Role: ${s.role || "N/A"}, Tool: ${s.tool_used || "N/A"}]`
      ).join("\n");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Tu es l'agent Analyst. À partir des étapes de processus existantes et du document source, " +
                "génère des actions granulaires pour chaque étape. Chaque action est une interaction utilisateur/système " +
                "spécifique (clic, saisie, validation, navigation, vérification). " +
                "Utilise les step_id fournis pour associer les actions. " +
                "RÈGLES: Ne jamais inventer d'informations absentes du document. Retourne UNIQUEMENT via l'appel de fonction.",
            },
            {
              role: "user",
              content: `Voici les étapes existantes:\n${stepsDescription}\n\nDocument source:\n${fullText.slice(0, 25000)}\n\nGénère les actions détaillées pour chaque étape.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_step_actions",
                description: "Extract granular actions for each existing process step",
                parameters: {
                  type: "object",
                  properties: {
                    step_actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          step_id: { type: "string", description: "The UUID of the existing step" },
                          actions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                description: { type: "string" },
                                system_used: { type: "string" },
                                screenshot_page: { type: "number" },
                              },
                              required: ["description"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["step_id", "actions"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["step_actions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_step_actions" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI error [${aiResponse.status}]: ${errText}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in AI response");

      const { step_actions } = JSON.parse(toolCall.function.arguments);
      const validStepIds = new Set(existingSteps.map((s: any) => s.id));
      let totalActions = 0;

      for (const sa of (step_actions || [])) {
        if (!validStepIds.has(sa.step_id) || !sa.actions?.length) continue;
        // Delete existing actions for this step first
        await supabase.from("step_actions").delete().eq("step_id", sa.step_id);
        const inserts = sa.actions.map((a: any, idx: number) => ({
          step_id: sa.step_id,
          action_order: idx,
          description: a.description,
          system_used: a.system_used || null,
          screenshot_page: a.screenshot_page ?? null,
        }));
        const { error: insErr } = await supabase.from("step_actions").insert(inserts);
        if (!insErr) totalActions += inserts.length;
      }

      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "extract_actions", status: "completed",
        message: `Extracted ${totalActions} detailed actions across ${step_actions?.length || 0} steps.`,
        metadata: { actions_count: totalActions, steps_count: step_actions?.length || 0 },
      });

      return new Response(
        JSON.stringify({ success: true, actions_count: totalActions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== FULL ANALYSIS MODE (original) ====================
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

    let fullText: string;

    if (chunks && chunks.length > 0) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "analyze_as_is", status: "started",
        message: `Reading ${chunks.length} document chunks${pdf_path ? " + PDF screenshots" : ""}...`,
      });
      fullText = chunks.map((c: any) => c.content).join("\n\n");
    } else {
      // Fallback: build text from existing process steps & context
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "analyst", action: "analyze_as_is", status: "started",
        message: "No document chunks found — falling back to process steps and context...",
      });

      const { data: fallbackSteps } = await supabase
        .from("process_steps")
        .select("*")
        .eq("process_id", process_id)
        .order("step_order");

      const { data: fallbackCtx } = await supabase
        .from("process_context")
        .select("*")
        .eq("process_id", process_id)
        .maybeSingle();

      const { data: processRecord } = await supabase
        .from("uploaded_processes")
        .select("file_name, notes")
        .eq("id", process_id)
        .single();

      const parts: string[] = [];
      if (processRecord) {
        parts.push(`Processus : ${processRecord.file_name}`);
        if (processRecord.notes) parts.push(`Notes : ${processRecord.notes}`);
      }
      if (fallbackCtx) {
        parts.push(`Objectif : ${fallbackCtx.process_objective || "N/A"}`);
        parts.push(`Contraintes : ${fallbackCtx.known_constraints || "N/A"}`);
        parts.push(`Points de douleur : ${fallbackCtx.pain_points_summary || "N/A"}`);
        parts.push(`Volume et fréquence : ${fallbackCtx.volume_and_frequency || "N/A"}`);
        parts.push(`Hypothèses : ${fallbackCtx.assumptions || "N/A"}`);
        parts.push(`Notes parties prenantes : ${fallbackCtx.stakeholder_notes || "N/A"}`);
      }
      if (fallbackSteps && fallbackSteps.length > 0) {
        parts.push("\n--- Étapes du processus ---");
        for (const s of fallbackSteps) {
          parts.push(
            `Étape ${s.step_order}: ${s.name}\nDescription: ${s.description || "N/A"}\n` +
            `Rôle: ${s.role || "N/A"}\nOutil: ${s.tool_used || "N/A"}`
          );
        }
      }

      fullText = parts.join("\n");
      if (!fullText.trim()) {
        await supabase.from("agent_logs").insert({
          process_id, agent_name: "analyst", action: "analyze_as_is", status: "error",
          message: "No data available: no chunks, no steps, no context.",
        });
        return new Response(JSON.stringify({ error: "No data available for analysis." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==================== FETCH KB CONTEXT ====================
    let kbContextBlock = "";
    try {
      const { data: proc } = await supabase
        .from("uploaded_processes")
        .select("company_id, department_id, entity_id, activity_id, service_id")
        .eq("id", process_id)
        .single();

      if (proc?.company_id) {
        const parts: string[] = ["--- CONTEXTE BASE DE CONNAISSANCES ---"];

        // Company
        const { data: company } = await supabase.from("companies").select("name, industry, size, strategy_notes").eq("id", proc.company_id).single();
        if (company) {
          parts.push(`Entreprise: ${company.name} | Secteur: ${company.industry || "N/A"} | Taille: ${company.size || "N/A"}`);
          if (company.strategy_notes) parts.push(`Stratégie: ${company.strategy_notes}`);
        }

        // Department
        if (proc.department_id) {
          const { data: dept } = await supabase.from("departments").select("name").eq("id", proc.department_id).single();
          if (dept) parts.push(`Département: ${dept.name}`);
        }

        // Entity
        if (proc.entity_id) {
          const { data: entity } = await supabase.from("entities").select("name").eq("id", proc.entity_id).single();
          if (entity) parts.push(`Entité: ${entity.name}`);
        }

        // Activity
        if (proc.activity_id) {
          const { data: activity } = await supabase.from("activities").select("name, description, business_objective").eq("id", proc.activity_id).single();
          if (activity) {
            parts.push(`Activité: ${activity.name}${activity.description ? " — " + activity.description : ""}`);
            if (activity.business_objective) parts.push(`Objectif métier: ${activity.business_objective}`);
          }

          // Tools linked to activity
          const { data: actTools } = await supabase.from("activity_tools").select("tool_id, tools(name, purpose, type)").eq("activity_id", proc.activity_id);
          if (actTools?.length) {
            const toolNames = actTools.map((t: any) => `${t.tools?.name || "?"}${t.tools?.purpose ? " (" + t.tools.purpose + ")" : ""}`);
            parts.push(`Outils référencés: ${toolNames.join(", ")}`);
          }
        }

        // Service
        if (proc.service_id) {
          const { data: service } = await supabase.from("services").select("name, description, business_objective").eq("id", proc.service_id).single();
          if (service) {
            parts.push(`Service: ${service.name}${service.description ? " — " + service.description : ""}`);
            if (service.business_objective) parts.push(`Objectif métier du service: ${service.business_objective}`);
          }
        }

        // KB Documents — fetch for all levels
        const entityLevels: { type: string; id: string }[] = [];
        if (proc.company_id) entityLevels.push({ type: "company", id: proc.company_id });
        if (proc.department_id) entityLevels.push({ type: "department", id: proc.department_id });
        if (proc.entity_id) entityLevels.push({ type: "entity", id: proc.entity_id });
        if (proc.activity_id) entityLevels.push({ type: "activity", id: proc.activity_id });
        if (proc.service_id) entityLevels.push({ type: "service", id: proc.service_id });

        const entityIds = entityLevels.map((l) => l.id);
        const { data: kbDocs } = await supabase.from("kb_documents").select("file_name, file_path, entity_type").in("entity_id", entityIds);

        if (kbDocs?.length) {
          parts.push("\nDocuments KB associés:");
          for (const doc of kbDocs.slice(0, 10)) {
            try {
              const ext = doc.file_name.toLowerCase().split(".").pop();
              if (["txt", "csv", "json", "md"].includes(ext || "")) {
                const { data: fileData } = await supabase.storage.from("process-files").download(doc.file_path);
                if (fileData) {
                  const text = await fileData.text();
                  parts.push(`\n[${doc.entity_type}] ${doc.file_name}:\n${text.slice(0, 5000)}`);
                }
              } else {
                parts.push(`[${doc.entity_type}] ${doc.file_name} (format non textuel, non inclus)`);
              }
            } catch (docErr) {
              console.error(`KB doc download error for ${doc.file_name}:`, docErr);
            }
          }
        }

        parts.push("---");
        kbContextBlock = parts.join("\n");
      }
    } catch (kbErr) {
      console.error("KB context fetch error:", kbErr);
    }

    // Build multimodal messages
    const kbInstruction = kbContextBlock
      ? "\n\nIMPORTANT: Utilise le contexte de la base de connaissances ci-dessous pour enrichir ton analyse. " +
        "Les outils, objectifs métier et contraintes mentionnés doivent être reflétés dans les étapes extraites.\n\n" + kbContextBlock
      : "";

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
          "IMPORTANT: Pour chaque étape, décompose les actions granulaires observées dans le journal d'événements ou le document. " +
          "Chaque action représente une interaction utilisateur/système spécifique (clic, saisie, validation, navigation). " +
          "Associe chaque action au système utilisé et à la page de capture d'écran correspondante quand disponible. " +
          "Retourne UNIQUEMENT via l'appel de fonction fourni.\n\n" +
          "RÈGLES ANTI-HALLUCINATION (STRICTES) :\n" +
          "- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le document ou les captures d'écran.\n" +
          "- Si une information est absente, écris 'Non mentionné dans le document'.\n" +
          "- Ne fabrique JAMAIS de noms d'outils, de systèmes ou de technologies non cités.\n" +
          "- Ne génère JAMAIS de chiffres sans données sources. Si tu estimes, préfixe par 'Estimation :'.\n" +
          "- Chaque affirmation doit être traçable vers le document source ou une capture d'écran.\n" +
          "- En cas de doute, signale-le plutôt que de deviner." +
          kbInstruction,
      },
    ];

    // Build user content (text + optional images)
    const userContent: any[] = [
      { type: "text", text: `Analyse ce document et extrais les étapes de processus :\n\n${fullText.slice(0, 30000)}` },
    ];

    // If PDF was uploaded, download and include pages as images
    if (pdf_path) {
      try {
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from("process-files")
          .download(pdf_path);

        if (!pdfError && pdfData) {
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

    // Delete existing data — scoped to this process only
    const { data: existingSteps } = await supabase
      .from("process_steps")
      .select("id")
      .eq("process_id", process_id);
    const stepIds = existingSteps?.map((s: any) => s.id) || [];
    if (stepIds.length > 0) {
      await supabase.from("step_actions").delete().in("step_id", stepIds);
    }
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

    // Insert steps and their actions
    if (steps && Array.isArray(steps)) {
      for (let idx = 0; idx < steps.length; idx++) {
        const s = steps[idx];
        const { data: insertedStep, error: stepErr } = await supabase.from("process_steps").insert({
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
        }).select("id").single();

        if (stepErr || !insertedStep) {
          console.error("Step insert error:", stepErr);
          continue;
        }

        // Insert actions for this step
        if (s.actions && Array.isArray(s.actions) && s.actions.length > 0) {
          const actionInserts = s.actions.map((a: any, aIdx: number) => ({
            step_id: insertedStep.id,
            action_order: aIdx,
            description: a.description,
            system_used: a.system_used || null,
            screenshot_page: a.screenshot_page ?? null,
          }));
          const { error: actErr } = await supabase.from("step_actions").insert(actionInserts);
          if (actErr) console.error("Actions insert error:", actErr);
        }
      }
    }

    // Update process status
    await supabase.from("uploaded_processes").update({ status: "analyzed" }).eq("id", process_id);

    // Build KB context summary for persistence
    let kb_context: any = null;
    try {
      const { data: proc } = await supabase
        .from("uploaded_processes")
        .select("company_id, department_id, entity_id, activity_id, service_id")
        .eq("id", process_id)
        .single();

      if (proc?.company_id) {
        kb_context = {};
        const { data: company } = await supabase.from("companies").select("name, industry, size, strategy_notes").eq("id", proc.company_id).single();
        if (company) kb_context.company = { name: company.name, industry: company.industry, size: company.size, strategy: company.strategy_notes };

        if (proc.department_id) {
          const { data: dept } = await supabase.from("departments").select("name").eq("id", proc.department_id).single();
          if (dept) kb_context.department = dept.name;
        }
        if (proc.entity_id) {
          const { data: entity } = await supabase.from("entities").select("name").eq("id", proc.entity_id).single();
          if (entity) kb_context.entity = entity.name;
        }
        if (proc.activity_id) {
          const { data: activity } = await supabase.from("activities").select("name, business_objective").eq("id", proc.activity_id).single();
          if (activity) kb_context.activity = { name: activity.name, objective: activity.business_objective };

          const { data: actTools } = await supabase.from("activity_tools").select("tool_id, tools(name)").eq("activity_id", proc.activity_id);
          if (actTools?.length) kb_context.tools = actTools.map((t: any) => t.tools?.name).filter(Boolean);
        }
        if (proc.service_id) {
          const { data: service } = await supabase.from("services").select("name, business_objective").eq("id", proc.service_id).single();
          if (service) kb_context.service = { name: service.name, objective: service.business_objective };
        }

        // KB documents
        const entityIds = [proc.company_id, proc.department_id, proc.entity_id, proc.activity_id, proc.service_id].filter(Boolean);
        const { data: kbDocs } = await supabase.from("kb_documents").select("file_name").in("entity_id", entityIds);
        if (kbDocs?.length) kb_context.documents = kbDocs.map((d: any) => d.file_name);
      }
    } catch (kbCtxErr) {
      console.error("KB context summary build error:", kbCtxErr);
    }

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
        ...(kb_context ? { kb_context } : {}),
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
