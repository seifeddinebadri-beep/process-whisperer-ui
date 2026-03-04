import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildContext(processRes: any, stepsRes: any, contextRes: any, chunksRes: any): string {
  const parts: string[] = [];
  parts.push(`Processus : ${processRes.data.file_name}`);

  const ctx = contextRes.data;
  if (ctx) {
    parts.push(`Objectif : ${ctx.process_objective || "N/A"}`);
    parts.push(`Contraintes : ${ctx.known_constraints || "N/A"}`);
    parts.push(`Points de douleur : ${ctx.pain_points_summary || "N/A"}`);
    parts.push(`Volume et fréquence : ${ctx.volume_and_frequency || "N/A"}`);
    parts.push(`Hypothèses : ${ctx.assumptions || "N/A"}`);
    parts.push(`Notes parties prenantes : ${ctx.stakeholder_notes || "N/A"}`);
  }

  const steps = stepsRes.data || [];
  if (steps.length > 0) {
    parts.push("\n--- Étapes du processus ---");
    for (const s of steps) {
      parts.push(
        `Étape ${s.step_order}: ${s.name}\n` +
        `Description: ${s.description || "N/A"}\n` +
        `Rôle: ${s.role || "N/A"}\n` +
        `Outil: ${s.tool_used || "N/A"}\n` +
        `Type de décision: ${s.decision_type || "N/A"}\n` +
        `Entrées: ${(s.data_inputs || []).join(", ") || "N/A"}\n` +
        `Sorties: ${(s.data_outputs || []).join(", ") || "N/A"}\n` +
        `Points de douleur: ${s.pain_points || "N/A"}\n` +
        `Règles métier: ${s.business_rules || "N/A"}\n` +
        `Fréquence: ${s.frequency || "N/A"}\n` +
        `Volume estimé: ${s.volume_estimate || "N/A"}`
      );
    }
  }

  const chunks = chunksRes.data || [];
  if (chunks.length > 0) {
    parts.push("\n--- Extraits de documents ---");
    for (const c of chunks) {
      parts.push(`[Chunk ${c.chunk_index}] ${c.content}`);
    }
  }

  return parts.join("\n");
}

const detailToolSchema = {
  type: "function",
  function: {
    name: "store_use_case_detail",
    description: "Store the detailed enriched content for an automation use case",
    parameters: {
      type: "object",
      properties: {
        detectionSignals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["repetitive_manual", "rule_based", "high_frequency", "structured_inputs", "tool_transfer"] },
              label: { type: "string" },
              description: { type: "string" },
              triggeringStep: { type: "string" },
              ruleOrThreshold: { type: "string" },
            },
            required: ["id", "type", "label", "description", "triggeringStep", "ruleOrThreshold"],
            additionalProperties: false,
          },
        },
        contextReferences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["role", "tool", "business_rule", "constraint"] },
              name: { type: "string" },
              detail: { type: "string" },
            },
            required: ["id", "type", "name", "detail"],
            additionalProperties: false,
          },
        },
        confidenceLevel: { type: "string", enum: ["low", "medium", "high"] },
        confidenceExplanation: { type: "string" },
        willBeAutomated: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "string" },
              system: { type: "string" },
              decision: { type: "string" },
            },
            required: ["step"],
            additionalProperties: false,
          },
        },
        willRemainManual: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              reason: { type: "string" },
            },
            required: ["item", "reason"],
            additionalProperties: false,
          },
        },
        explicitExclusions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              scenario: { type: "string" },
              reason: { type: "string" },
            },
            required: ["scenario", "reason"],
            additionalProperties: false,
          },
        },
        detailedSteps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              stepName: { type: "string" },
              trigger: { type: "string" },
              inputData: { type: "array", items: { type: "string" } },
              validationRules: { type: "array", items: { type: "string" } },
              systemAction: { type: "string" },
              outputProduced: { type: "string" },
              logging: { type: "string" },
            },
            required: ["id", "stepName", "trigger", "inputData", "validationRules", "systemAction", "outputProduced", "logging"],
            additionalProperties: false,
          },
        },
        exceptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              whatCanGoWrong: { type: "string" },
              howDetected: { type: "string" },
              whatHappensNext: { type: "string" },
              whoIsNotified: { type: "string" },
              dataPreserved: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["id", "whatCanGoWrong", "howDetected", "whatHappensNext", "whoIsNotified", "dataPreserved", "severity"],
            additionalProperties: false,
          },
        },
        comparison: {
          type: "object",
          properties: {
            before: {
              type: "object",
              properties: {
                steps: { type: "number" },
                humanEffort: { type: "string" },
                toolsInvolved: { type: "array", items: { type: "string" } },
                errorRisks: { type: "array", items: { type: "string" } },
              },
              required: ["steps", "humanEffort", "toolsInvolved", "errorRisks"],
              additionalProperties: false,
            },
            after: {
              type: "object",
              properties: {
                steps: { type: "number" },
                automationCheckpoints: { type: "array", items: { type: "string" } },
                humanTouchpoints: { type: "array", items: { type: "string" } },
                residualRisks: { type: "array", items: { type: "string" } },
              },
              required: ["steps", "automationCheckpoints", "humanTouchpoints", "residualRisks"],
              additionalProperties: false,
            },
          },
          required: ["before", "after"],
          additionalProperties: false,
        },
        valueMetrics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string" },
              level: { type: "string", enum: ["low", "medium", "high"] },
              explanation: { type: "string" },
              assumptions: { type: "string" },
            },
            required: ["metric", "level", "explanation", "assumptions"],
            additionalProperties: false,
          },
        },
        traceabilityLinks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["process_step", "role", "tool", "business_rule"] },
              name: { type: "string" },
              detail: { type: "string" },
            },
            required: ["type", "name", "detail"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "detectionSignals", "contextReferences", "confidenceLevel", "confidenceExplanation",
        "willBeAutomated", "willRemainManual", "explicitExclusions",
        "detailedSteps", "exceptions", "comparison", "valueMetrics", "traceabilityLinks",
      ],
      additionalProperties: false,
    },
  },
};

async function generateUseCaseDetail(
  apiKey: string,
  fullContext: string,
  ucTitle: string,
  ucDescription: string,
): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en automatisation de processus métier. " +
            "Pour le cas d'usage d'automatisation donné, génère un contenu détaillé et enrichi couvrant toutes les sections suivantes : " +
            "signaux de détection (pourquoi cette automatisation a été détectée), références de contexte, niveau de confiance, " +
            "périmètre (ce qui sera automatisé, ce qui restera manuel, exclusions explicites), " +
            "étapes détaillées du processus automatisé (trigger, données d'entrée, règles de validation, action système, sortie, logging), " +
            "scénarios d'exception (ce qui peut mal tourner, comment c'est détecté, que se passe-t-il ensuite, qui est notifié, données préservées), " +
            "comparaison avant/après (nombre d'étapes, effort humain, outils, risques), " +
            "métriques de valeur (business value, complexité, risque, impact changement), " +
            "et liens de traçabilité vers les étapes, rôles, outils et règles métier du processus. " +
            "Génère du contenu réaliste, spécifique et professionnel basé sur le contexte du processus. " +
            "Retourne tes résultats UNIQUEMENT via l'appel de fonction fourni.\n\n" +
            "RÈGLES ANTI-HALLUCINATION (STRICTES) :\n" +
            "- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le contexte fourni.\n" +
            "- Les signaux de détection doivent référencer des étapes RÉELLES du processus.\n" +
            "- Les outils suggérés doivent provenir du document OU être explicitement marqués comme 'Suggestion externe'.\n" +
            "- Ne génère JAMAIS de chiffres sans les baser sur des données fournies. Si tu estimes, préfixe par 'Estimation :' et justifie.\n" +
            "- Ne crée JAMAIS de règles métier fictives. Cite uniquement celles du contexte.\n" +
            "- Chaque affirmation doit pouvoir être tracée vers un élément du contexte source.\n" +
            "- En cas de doute, signale-le explicitement plutôt que de deviner.\n" +
            "- N'extrapole pas au-delà de ce qui est raisonnablement déductible des données fournies.",
        },
        {
          role: "user",
          content:
            `Cas d'usage : "${ucTitle}"\nDescription : ${ucDescription}\n\nContexte du processus :\n${fullContext}`,
        },
      ],
      tools: [detailToolSchema],
      tool_choice: { type: "function", function: { name: "store_use_case_detail" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI detail error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in detail AI response");
  return JSON.parse(toolCall.function.arguments);
}

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

    const [processRes, stepsRes, contextRes, chunksRes] = await Promise.all([
      supabase.from("uploaded_processes").select("*").eq("id", process_id).single(),
      supabase.from("process_steps").select("*").eq("process_id", process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", process_id).single(),
      supabase.from("document_chunks").select("content, chunk_index").eq("process_id", process_id).order("chunk_index").limit(20),
    ]);

    if (processRes.error || !processRes.data) {
      return new Response(JSON.stringify({ error: "Process not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "discoverer", action: "analyze_use_cases", status: "started",
      message: `Discoverer agent started — analyzing ${stepsRes.data?.length || 0} steps...`,
    });

    const fullContext = buildContext(processRes, stepsRes, contextRes, chunksRes);

    // Call AI to generate use cases WITH variants
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
              "Tu es un expert en automatisation de processus métier (RPA, BPM, AI). " +
              "Analyse le processus fourni et identifie les opportunités d'automatisation concrètes. " +
              "Pour chaque cas d'usage, génère 2 à 3 variantes d'approche d'automatisation différentes. " +
              "Par exemple : Variante 1 = RPA simple, Variante 2 = IA + OCR, Variante 3 = Intégration complète. " +
              "Marque une seule variante comme recommandée par cas d'usage. " +
              "Retourne tes résultats UNIQUEMENT via l'appel de fonction fourni.\n\n" +
              "RÈGLES ANTI-HALLUCINATION (STRICTES) :\n" +
              "- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le contexte du processus fourni.\n" +
              "- Les cas d'usage doivent être fondés sur les étapes RÉELLES du processus. Ne crée pas de cas d'usage sans lien avec les étapes fournies.\n" +
              "- Les outils suggérés doivent provenir du document OU être explicitement marqués comme 'Suggestion externe (non mentionné dans le document)'.\n" +
              "- Ne génère JAMAIS de chiffres de ROI, coûts ou délais sans les baser sur des données du contexte. Si tu estimes, préfixe TOUJOURS par 'Estimation :' et justifie ton raisonnement.\n" +
              "- Ne fabrique JAMAIS de règles métier fictives. Cite uniquement celles mentionnées dans le processus.\n" +
              "- Chaque affirmation doit pouvoir être tracée vers une étape ou un élément du contexte source.\n" +
              "- En cas de doute ou d'ambiguïté, signale-le explicitement plutôt que de deviner.\n" +
              "- N'extrapole pas au-delà de ce qui est raisonnablement déductible des données fournies.",
          },
          {
            role: "user",
            content: `Analyse ce processus et génère des cas d'usage d'automatisation avec variantes :\n\n${fullContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "store_use_cases",
              description: "Store automation use cases with their variants",
              parameters: {
                type: "object",
                properties: {
                  use_cases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Titre court du cas d'usage" },
                        description: { type: "string", description: "Description du cas d'usage" },
                        complexity: { type: "string", enum: ["low", "medium", "high"] },
                        impact: { type: "string", enum: ["low", "medium", "high"] },
                        roi_estimate: { type: "string" },
                        tools_suggested: { type: "array", items: { type: "string" } },
                        variants: {
                          type: "array",
                          description: "2-3 variantes d'approche pour ce cas d'usage",
                          items: {
                            type: "object",
                            properties: {
                              variant_name: { type: "string" },
                              approach_description: { type: "string" },
                              complexity: { type: "string", enum: ["low", "medium", "high"] },
                              impact: { type: "string", enum: ["low", "medium", "high"] },
                              roi_estimate: { type: "string" },
                              tools_suggested: { type: "array", items: { type: "string" } },
                              pros: { type: "array", items: { type: "string" } },
                              cons: { type: "array", items: { type: "string" } },
                              estimated_cost: { type: "string" },
                              estimated_timeline: { type: "string" },
                              recommended: { type: "boolean" },
                            },
                            required: ["variant_name", "approach_description", "complexity", "impact", "roi_estimate", "tools_suggested", "pros", "cons", "estimated_cost", "estimated_timeline", "recommended"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "description", "complexity", "impact", "roi_estimate", "tools_suggested", "variants"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["use_cases"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "store_use_cases" } },
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

    const { use_cases } = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(use_cases) || use_cases.length === 0) throw new Error("No use cases generated");

    // Delete existing use cases & variants for this process (re-analysis)
    const { data: existingUCs } = await supabase.from("automation_use_cases").select("id").eq("process_id", process_id);
    if (existingUCs && existingUCs.length > 0) {
      const ucIds = existingUCs.map((uc: any) => uc.id);
      await supabase.from("use_case_details").delete().in("use_case_id", ucIds);
      await supabase.from("automation_variants").delete().in("use_case_id", ucIds);
    }
    await supabase.from("automation_use_cases").delete().eq("process_id", process_id);

    // Insert use cases and their variants
    let totalVariants = 0;
    const insertedUseCases: Array<{ id: string; title: string; description: string }> = [];

    for (const uc of use_cases) {
      const { data: inserted, error: insertError } = await supabase
        .from("automation_use_cases")
        .insert({
          process_id,
          title: uc.title,
          description: uc.description,
          complexity: uc.complexity,
          impact: uc.impact,
          roi_estimate: uc.roi_estimate,
          tools_suggested: uc.tools_suggested,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Failed to insert use case:", insertError);
        continue;
      }

      insertedUseCases.push({ id: inserted.id, title: uc.title, description: uc.description || "" });

      // Insert variants
      if (uc.variants && Array.isArray(uc.variants)) {
        const variantInserts = uc.variants.map((v: any, idx: number) => ({
          use_case_id: inserted.id,
          variant_number: idx + 1,
          variant_name: v.variant_name,
          approach_description: v.approach_description,
          complexity: v.complexity,
          impact: v.impact,
          roi_estimate: v.roi_estimate,
          tools_suggested: v.tools_suggested || [],
          pros: v.pros || [],
          cons: v.cons || [],
          estimated_cost: v.estimated_cost,
          estimated_timeline: v.estimated_timeline,
          recommended: v.recommended || false,
        }));

        const { error: variantError } = await supabase.from("automation_variants").insert(variantInserts);
        if (variantError) console.error("Failed to insert variants:", variantError);
        else totalVariants += variantInserts.length;
      }
    }

    // ===== PHASE 2: Generate detailed content for each use case =====
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "discoverer", action: "generate_details", status: "started",
      message: `Generating detailed content for ${insertedUseCases.length} use cases...`,
    });

    let detailsGenerated = 0;
    for (const uc of insertedUseCases) {
      try {
        const detailContent = await generateUseCaseDetail(
          LOVABLE_API_KEY,
          fullContext,
          uc.title,
          uc.description,
        );

        const { error: detailError } = await supabase.from("use_case_details").insert({
          use_case_id: uc.id,
          detail_content: detailContent,
        });

        if (detailError) {
          console.error(`Failed to insert detail for ${uc.title}:`, detailError);
        } else {
          detailsGenerated++;
        }
      } catch (err) {
        console.error(`Error generating detail for ${uc.title}:`, err);
      }
    }

    await supabase.from("agent_logs").insert({
      process_id, agent_name: "discoverer", action: "generate_details", status: "completed",
      message: `Generated detailed content for ${detailsGenerated}/${insertedUseCases.length} use cases.`,
    });

    // Update process status
    await supabase.from("uploaded_processes").update({ status: "approved" }).eq("id", process_id);

    // Log completion
    await supabase.from("agent_logs").insert({
      process_id, agent_name: "discoverer", action: "analyze_use_cases", status: "completed",
      message: `Generated ${use_cases.length} use cases with ${totalVariants} variants and ${detailsGenerated} detail pages.`,
      metadata: { use_cases_count: use_cases.length, variants_count: totalVariants, details_count: detailsGenerated },
    });

    return new Response(
      JSON.stringify({
        success: true,
        use_cases_count: use_cases.length,
        variants_count: totalVariants,
        details_count: detailsGenerated,
        use_cases,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-process error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
