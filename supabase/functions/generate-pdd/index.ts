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

  try {
    const { conversation_id, use_case_id } = await req.json();

    if (!conversation_id || !use_case_id) {
      return new Response(JSON.stringify({ error: "conversation_id and use_case_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all data
    const [ucRes, variantsRes, messagesRes] = await Promise.all([
      supabase.from("automation_use_cases").select("*, uploaded_processes(file_name)").eq("id", use_case_id).single(),
      supabase.from("automation_variants").select("*").eq("use_case_id", use_case_id).order("variant_number"),
      supabase.from("ba_messages").select("role, content").eq("conversation_id", conversation_id).order("created_at"),
    ]);

    const useCase = ucRes.data;
    if (!useCase) throw new Error("Use case not found");

    const [stepsRes, contextRes, detailRes] = await Promise.all([
      supabase.from("process_steps").select("*").eq("process_id", useCase.process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", useCase.process_id).maybeSingle(),
      supabase.from("use_case_details").select("detail_content").eq("use_case_id", use_case_id).maybeSingle(),
    ]);

    // Build comprehensive context
    const parts: string[] = [];
    parts.push(`=== CAS D'USAGE ===`);
    parts.push(`Titre: ${useCase.title}`);
    parts.push(`Description: ${useCase.description}`);
    parts.push(`Impact: ${useCase.impact || "N/A"} | Complexité: ${useCase.complexity || "N/A"} | ROI estimé: ${useCase.roi_estimate || "N/A"}`);
    if (useCase.tools_suggested?.length) parts.push(`Outils suggérés: ${useCase.tools_suggested.join(", ")}`);

    const variants = variantsRes.data || [];
    if (variants.length > 0) {
      parts.push("\n=== VARIANTES D'AUTOMATISATION ===");
      for (const v of variants) {
        parts.push(`\n[${v.recommended ? "★ RECOMMANDÉE" : "Alternative"}] ${v.variant_name}`);
        parts.push(`  Description: ${v.approach_description || "N/A"}`);
        parts.push(`  Complexité: ${v.complexity} | Impact: ${v.impact} | ROI: ${v.roi_estimate}`);
        parts.push(`  Coût estimé: ${v.estimated_cost || "N/A"} | Délai: ${v.estimated_timeline || "N/A"}`);
        if (v.tools_suggested?.length) parts.push(`  Outils: ${v.tools_suggested.join(", ")}`);
        if (v.pros?.length) parts.push(`  Avantages: ${v.pros.join("; ")}`);
        if (v.cons?.length) parts.push(`  Inconvénients: ${v.cons.join("; ")}`);
      }
    }

    const steps = stepsRes.data || [];
    if (steps.length > 0) {
      parts.push("\n=== ÉTAPES DU PROCESSUS AS-IS ===");
      for (const s of steps) {
        parts.push(`\nÉtape ${s.step_order}: ${s.name}`);
        if (s.description) parts.push(`  Description: ${s.description}`);
        if (s.role) parts.push(`  Rôle: ${s.role}`);
        if (s.tool_used) parts.push(`  Outil: ${s.tool_used}`);
        if (s.decision_type) parts.push(`  Type de décision: ${s.decision_type}`);
        if (s.business_rules) parts.push(`  Règles métier: ${s.business_rules}`);
        if (s.pain_points) parts.push(`  Points de douleur: ${s.pain_points}`);
        if (s.data_inputs?.length) parts.push(`  Entrées: ${s.data_inputs.join(", ")}`);
        if (s.data_outputs?.length) parts.push(`  Sorties: ${s.data_outputs.join(", ")}`);
        if (s.frequency) parts.push(`  Fréquence: ${s.frequency}`);
        if (s.volume_estimate) parts.push(`  Volume: ${s.volume_estimate}`);
        parts.push(`  Source: ${s.source}`);
      }
    }

    const ctx = contextRes.data;
    if (ctx) {
      parts.push("\n=== CONTEXTE DU PROCESSUS ===");
      if (ctx.process_objective) parts.push(`Objectif: ${ctx.process_objective}`);
      if (ctx.known_constraints) parts.push(`Contraintes: ${ctx.known_constraints}`);
      if (ctx.assumptions) parts.push(`Hypothèses: ${ctx.assumptions}`);
      if (ctx.pain_points_summary) parts.push(`Points de douleur: ${ctx.pain_points_summary}`);
      if (ctx.volume_and_frequency) parts.push(`Volume et fréquence: ${ctx.volume_and_frequency}`);
      if (ctx.stakeholder_notes) parts.push(`Notes parties prenantes: ${ctx.stakeholder_notes}`);
    }

    const detail = detailRes.data?.detail_content as any;
    if (detail) {
      parts.push("\n=== ANALYSE DÉTAILLÉE ===");
      if (detail.willBeAutomated?.length) parts.push(`Sera automatisé: ${detail.willBeAutomated.join("; ")}`);
      if (detail.willRemainManual?.length) parts.push(`Restera manuel: ${detail.willRemainManual.join("; ")}`);
      if (detail.explicitExclusions?.length) parts.push(`Exclusions: ${detail.explicitExclusions.join("; ")}`);
    }

    const messages = messagesRes.data || [];
    if (messages.length > 0) {
      parts.push("\n=== CONVERSATION AVEC LE BA AGENT ===");
      for (const m of messages) {
        parts.push(`[${m.role === "agent" ? "BA Agent" : "Utilisateur"}]: ${m.content}`);
      }
    }

    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "generate_pdd",
      status: "started",
      message: "Generating comprehensive Process Design Document...",
    });

    const systemPrompt = `Tu es un expert senior en automatisation de processus et rédaction de PDD (Process Design Document).
Tu dois produire un document COMPLET, DÉTAILLÉ et ACTIONNABLE qui servira de référence pour l'équipe de développement.

INSTRUCTIONS CRITIQUES :
1. Pour le processus AS-IS : Décris chaque étape comme un bullet point structuré incluant le rôle responsable, l'action, l'outil utilisé, les entrées et sorties de données
2. Pour le processus TO-BE : Décris chaque étape transformée comme un bullet point précisant ce qui est automatisé vs ce qui reste manuel, avec le mécanisme technique proposé
3. Pour chaque étape TO-BE, identifie clairement les TRIGGERS (déclencheurs), INPUTS (données d'entrée), OUTPUTS (données de sortie), et EXCEPTIONS (cas d'erreur ou cas limites)
4. Les RISQUES doivent être catégorisés (technique, organisationnel, données, sécurité) avec un plan de mitigation concret
5. L'APPROCHE DE DÉVELOPPEMENT RECOMMANDÉE doit proposer un plan par phases avec des jalons clairs, les technologies recommandées, et les prérequis
6. Sois exhaustif : un développeur doit pouvoir implémenter la solution à partir de ce document seul
7. Utilise les données de la conversation BA pour enrichir l'analyse avec les insights métier collectés`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère un PDD complet et exhaustif pour ce cas d'usage :\n\n${parts.join("\n")}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_pdd",
              description: "Create a comprehensive structured PDD document",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Titre du PDD" },
                  executive_summary: { type: "string", description: "Résumé exécutif complet (3-4 paragraphes incluant contexte, objectif, approche recommandée et bénéfices attendus)" },
                  as_is_steps: {
                    type: "array",
                    description: "Étapes détaillées du processus actuel",
                    items: {
                      type: "object",
                      properties: {
                        step_number: { type: "number" },
                        name: { type: "string" },
                        responsible_role: { type: "string" },
                        action_description: { type: "string" },
                        tool_used: { type: "string" },
                        inputs: { type: "array", items: { type: "string" } },
                        outputs: { type: "array", items: { type: "string" } },
                        pain_points: { type: "array", items: { type: "string" } },
                        duration_estimate: { type: "string" },
                      },
                      required: ["step_number", "name", "responsible_role", "action_description", "tool_used", "inputs", "outputs", "pain_points", "duration_estimate"],
                      additionalProperties: false,
                    },
                  },
                  to_be_steps: {
                    type: "array",
                    description: "Étapes détaillées du processus cible automatisé",
                    items: {
                      type: "object",
                      properties: {
                        step_number: { type: "number" },
                        name: { type: "string" },
                        automation_type: { type: "string", description: "fully_automated | partially_automated | manual" },
                        mechanism: { type: "string", description: "Description technique du mécanisme d'automatisation" },
                        trigger: { type: "string", description: "Événement déclencheur de cette étape" },
                        inputs: { type: "array", items: { type: "string" } },
                        outputs: { type: "array", items: { type: "string" } },
                        exceptions: {
                          type: "array",
                          description: "Cas d'erreur, cas limites et comportement attendu",
                          items: {
                            type: "object",
                            properties: {
                              condition: { type: "string" },
                              handling: { type: "string" },
                            },
                            required: ["condition", "handling"],
                            additionalProperties: false,
                          },
                        },
                        responsible: { type: "string", description: "Rôle responsable ou 'Robot/Système'" },
                      },
                      required: ["step_number", "name", "automation_type", "mechanism", "trigger", "inputs", "outputs", "exceptions", "responsible"],
                      additionalProperties: false,
                    },
                  },
                  business_rules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Identifiant unique BR-001, BR-002..." },
                        rule: { type: "string" },
                        validation_logic: { type: "string" },
                        exceptions: { type: "string" },
                        impacted_steps: { type: "array", items: { type: "string" } },
                      },
                      required: ["id", "rule", "validation_logic", "exceptions", "impacted_steps"],
                      additionalProperties: false,
                    },
                  },
                  integration_points: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        system: { type: "string" },
                        integration_type: { type: "string", description: "API | Base de données | Fichier | Email | Webhook" },
                        direction: { type: "string", description: "Entrée | Sortie | Bidirectionnel" },
                        data_exchanged: { type: "string" },
                        frequency: { type: "string" },
                        error_handling: { type: "string" },
                      },
                      required: ["system", "integration_type", "direction", "data_exchanged", "frequency", "error_handling"],
                      additionalProperties: false,
                    },
                  },
                  risks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "R-001, R-002..." },
                        category: { type: "string", description: "technique | organisationnel | données | sécurité | performance" },
                        risk: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        probability: { type: "string", enum: ["low", "medium", "high"] },
                        impact_description: { type: "string" },
                        mitigation: { type: "string" },
                        contingency: { type: "string", description: "Plan de secours si le risque se matérialise" },
                      },
                      required: ["id", "category", "risk", "severity", "probability", "impact_description", "mitigation", "contingency"],
                      additionalProperties: false,
                    },
                  },
                  recommended_approach: {
                    type: "object",
                    description: "Approche de développement recommandée",
                    properties: {
                      methodology: { type: "string", description: "Méthodologie recommandée (Agile, Waterfall, etc.)" },
                      technology_stack: { type: "array", items: { type: "string" }, description: "Technologies et outils recommandés" },
                      prerequisites: { type: "array", items: { type: "string" }, description: "Prérequis avant de commencer" },
                      phases: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            phase_number: { type: "number" },
                            name: { type: "string" },
                            duration: { type: "string" },
                            objectives: { type: "array", items: { type: "string" } },
                            deliverables: { type: "array", items: { type: "string" } },
                            key_milestones: { type: "array", items: { type: "string" } },
                          },
                          required: ["phase_number", "name", "duration", "objectives", "deliverables", "key_milestones"],
                          additionalProperties: false,
                        },
                      },
                      team_composition: { type: "array", items: { type: "string" }, description: "Rôles nécessaires dans l'équipe" },
                      estimated_total_duration: { type: "string" },
                      estimated_total_cost: { type: "string" },
                    },
                    required: ["methodology", "technology_stack", "prerequisites", "phases", "team_composition", "estimated_total_duration", "estimated_total_cost"],
                    additionalProperties: false,
                  },
                  testing_strategy: {
                    type: "object",
                    properties: {
                      unit_tests: { type: "string" },
                      integration_tests: { type: "string" },
                      uat_scenarios: { type: "array", items: { type: "string" }, description: "Scénarios de tests d'acceptation utilisateur" },
                      performance_tests: { type: "string" },
                      regression_approach: { type: "string" },
                    },
                    required: ["unit_tests", "integration_tests", "uat_scenarios", "performance_tests", "regression_approach"],
                    additionalProperties: false,
                  },
                  rollout_plan: {
                    type: "object",
                    properties: {
                      strategy: { type: "string", description: "Big bang | Progressif | Pilote" },
                      pilot_scope: { type: "string" },
                      rollback_plan: { type: "string" },
                      communication_plan: { type: "string" },
                      training_needs: { type: "array", items: { type: "string" } },
                      go_live_checklist: { type: "array", items: { type: "string" } },
                    },
                    required: ["strategy", "pilot_scope", "rollback_plan", "communication_plan", "training_needs", "go_live_checklist"],
                    additionalProperties: false,
                  },
                  success_criteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        current_value: { type: "string" },
                        target_value: { type: "string" },
                        measurement_method: { type: "string" },
                      },
                      required: ["metric", "current_value", "target_value", "measurement_method"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "executive_summary", "as_is_steps", "to_be_steps", "business_rules", "integration_points", "risks", "recommended_approach", "testing_strategy", "rollout_plan", "success_criteria"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_pdd" } },
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
      throw new Error(`AI error [${status}]: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let pddContent: any;
    if (toolCall) {
      pddContent = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*"title"[\s\S]*\}/);
      if (jsonMatch) {
        pddContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to generate PDD structure");
      }
    }

    const htmlContent = generatePddHtml(pddContent, useCase, variants);

    const { data: pdd, error: pddError } = await supabase.from("pdd_documents").insert({
      conversation_id,
      use_case_id,
      title: pddContent.title,
      content: pddContent,
      html_content: htmlContent,
      status: "final",
    }).select("id").single();

    if (pddError) throw pddError;

    await supabase.from("ba_conversations").update({ status: "completed" }).eq("id", conversation_id);

    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "generate_pdd",
      status: "completed",
      message: `PDD "${pddContent.title}" generated successfully.`,
    });

    return new Response(
      JSON.stringify({ success: true, pdd_id: pdd.id, pdd: pddContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-pdd error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generatePddHtml(pdd: any, useCase: any, variants: any[]): string {
  const severityColors: Record<string, string> = {
    low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#991b1b",
  };
  const automationBadge: Record<string, { bg: string; label: string }> = {
    fully_automated: { bg: "#22c55e", label: "Automatisé" },
    partially_automated: { bg: "#f59e0b", label: "Semi-automatisé" },
    manual: { bg: "#94a3b8", label: "Manuel" },
  };

  const recommendedVariant = variants.find(v => v.recommended);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${pdd.title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px; color: #1a1a2e; line-height: 1.7; font-size: 14px; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 12px; font-size: 28px; margin-top: 0; }
  h2 { color: #0f3460; margin-top: 36px; font-size: 20px; border-left: 4px solid #0f3460; padding-left: 12px; }
  h3 { color: #16213e; font-size: 16px; margin-top: 20px; }
  h4 { color: #374151; font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .summary { background: #f0f4ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0f3460; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  tr:nth-child(even) { background: #f8f9fa; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; }
  .step-card { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .step-number { background: #0f3460; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .step-title { font-weight: 600; font-size: 15px; }
  .step-detail { margin-left: 36px; }
  .detail-row { display: flex; gap: 8px; margin: 4px 0; font-size: 13px; }
  .detail-label { color: #6b7280; font-weight: 600; min-width: 100px; flex-shrink: 0; }
  .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 1px 8px; border-radius: 4px; font-size: 11px; margin: 2px; }
  .pain-tag { background: #fee2e2; color: #991b1b; }
  .exception-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 12px; margin: 6px 0; font-size: 13px; }
  .exception-condition { font-weight: 600; color: #92400e; }
  .risk-card { border-left: 4px solid; border-radius: 6px; padding: 12px 16px; margin: 10px 0; background: #fafbfc; }
  .phase-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .phase-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .phase-number { background: #0f3460; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 4px; }
  .checklist li::marker { content: "☐ "; }
  .success-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .success-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .arrow { color: #22c55e; font-weight: bold; }
  hr.section-break { border: none; border-top: 2px solid #e2e8f0; margin: 32px 0; }
  @media print { body { padding: 20px; font-size: 12px; } h1 { font-size: 22px; } .step-card, .phase-card, .risk-card { break-inside: avoid; } }
</style>
</head>
<body>
<h1>📋 ${pdd.title}</h1>
<div class="meta">
  <strong>Cas d'usage :</strong> ${useCase.title}<br>
  <strong>Processus source :</strong> ${(useCase.uploaded_processes as any)?.file_name || "N/A"}<br>
  ${recommendedVariant ? `<strong>Variante recommandée :</strong> ${recommendedVariant.variant_name}<br>` : ""}
  <strong>Impact :</strong> ${useCase.impact || "N/A"} | <strong>Complexité :</strong> ${useCase.complexity || "N/A"} | <strong>ROI :</strong> ${useCase.roi_estimate || "N/A"}<br>
  <strong>Date de génération :</strong> ${new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}<br>
  <strong>Statut :</strong> Document final
</div>

<!-- 1. Executive Summary -->
<h2>1. Résumé Exécutif</h2>
<div class="summary">${pdd.executive_summary}</div>

<!-- 2. As-Is Process -->
<h2>2. Processus Actuel (As-Is)</h2>
<p style="color:#6b7280; font-size:13px;">Chaque étape du processus actuel avec les rôles, outils, entrées/sorties et points de douleur identifiés.</p>
${(pdd.as_is_steps || []).map((s: any) => `
<div class="step-card">
  <div class="step-header">
    <span class="step-number">${s.step_number}</span>
    <span class="step-title">${s.name}</span>
    <span style="margin-left:auto; color:#6b7280; font-size:12px;">⏱ ${s.duration_estimate}</span>
  </div>
  <div class="step-detail">
    <div class="detail-row"><span class="detail-label">👤 Rôle</span><span>${s.responsible_role}</span></div>
    <div class="detail-row"><span class="detail-label">📝 Action</span><span>${s.action_description}</span></div>
    <div class="detail-row"><span class="detail-label">🔧 Outil</span><span>${s.tool_used}</span></div>
    <div class="detail-row"><span class="detail-label">📥 Entrées</span><span>${(s.inputs || []).map((i: string) => `<span class="tag">${i}</span>`).join(" ")}</span></div>
    <div class="detail-row"><span class="detail-label">📤 Sorties</span><span>${(s.outputs || []).map((o: string) => `<span class="tag">${o}</span>`).join(" ")}</span></div>
    ${(s.pain_points || []).length > 0 ? `<div class="detail-row"><span class="detail-label">⚠️ Problèmes</span><span>${s.pain_points.map((p: string) => `<span class="tag pain-tag">${p}</span>`).join(" ")}</span></div>` : ""}
  </div>
</div>`).join("")}

<!-- 3. To-Be Process -->
<h2>3. Processus Cible (To-Be)</h2>
<p style="color:#6b7280; font-size:13px;">Le processus transformé avec les déclencheurs, entrées/sorties, mécanismes d'automatisation et gestion des exceptions.</p>
${(pdd.to_be_steps || []).map((s: any) => {
  const badge = automationBadge[s.automation_type] || automationBadge.manual;
  return `
<div class="step-card" style="border-left: 4px solid ${badge.bg};">
  <div class="step-header">
    <span class="step-number">${s.step_number}</span>
    <span class="step-title">${s.name}</span>
    <span class="badge" style="background:${badge.bg}; margin-left: 8px;">${badge.label}</span>
    <span style="margin-left:auto; color:#6b7280; font-size:12px;">👤 ${s.responsible}</span>
  </div>
  <div class="step-detail">
    <div class="detail-row"><span class="detail-label">⚡ Déclencheur</span><span>${s.trigger}</span></div>
    <div class="detail-row"><span class="detail-label">⚙️ Mécanisme</span><span>${s.mechanism}</span></div>
    <div class="detail-row"><span class="detail-label">📥 Entrées</span><span>${(s.inputs || []).map((i: string) => `<span class="tag">${i}</span>`).join(" ")}</span></div>
    <div class="detail-row"><span class="detail-label">📤 Sorties</span><span>${(s.outputs || []).map((o: string) => `<span class="tag">${o}</span>`).join(" ")}</span></div>
    ${(s.exceptions || []).length > 0 ? `
    <h4 style="margin-top:12px; margin-bottom:6px;">🚨 Exceptions & Cas limites</h4>
    ${s.exceptions.map((ex: any) => `
    <div class="exception-box">
      <span class="exception-condition">Si :</span> ${ex.condition}<br>
      <span style="color:#065f46; font-weight:600;">Alors :</span> ${ex.handling}
    </div>`).join("")}` : ""}
  </div>
</div>`;
}).join("")}

<!-- 4. Business Rules -->
<h2>4. Règles Métier</h2>
<table>
<thead><tr><th>ID</th><th>Règle</th><th>Logique de validation</th><th>Exceptions</th><th>Étapes impactées</th></tr></thead>
<tbody>
${(pdd.business_rules || []).map((r: any) => `<tr>
  <td><strong>${r.id}</strong></td>
  <td>${r.rule}</td>
  <td>${r.validation_logic}</td>
  <td>${r.exceptions}</td>
  <td>${(r.impacted_steps || []).join(", ")}</td>
</tr>`).join("")}
</tbody>
</table>

<!-- 5. Integration Points -->
<h2>5. Points d'Intégration</h2>
<table>
<thead><tr><th>Système</th><th>Type</th><th>Direction</th><th>Données</th><th>Fréquence</th><th>Gestion d'erreur</th></tr></thead>
<tbody>
${(pdd.integration_points || []).map((p: any) => `<tr>
  <td><strong>${p.system}</strong></td>
  <td>${p.integration_type}</td>
  <td>${p.direction}</td>
  <td>${p.data_exchanged}</td>
  <td>${p.frequency}</td>
  <td>${p.error_handling}</td>
</tr>`).join("")}
</tbody>
</table>

<!-- 6. Risks -->
<h2>6. Risques et Mitigations</h2>
${(pdd.risks || []).map((r: any) => `
<div class="risk-card" style="border-color: ${severityColors[r.severity] || '#94a3b8'};">
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
    <strong>${r.id}</strong>
    <span class="badge" style="background:${severityColors[r.severity] || '#94a3b8'}">${r.severity.toUpperCase()}</span>
    <span class="badge" style="background:#6366f1">${r.category}</span>
    <span style="color:#6b7280; font-size:12px; margin-left:auto;">Probabilité : ${r.probability}</span>
  </div>
  <p style="margin:4px 0;"><strong>Risque :</strong> ${r.risk}</p>
  <p style="margin:4px 0;"><strong>Impact :</strong> ${r.impact_description}</p>
  <p style="margin:4px 0; color:#065f46;"><strong>✅ Mitigation :</strong> ${r.mitigation}</p>
  <p style="margin:4px 0; color:#92400e;"><strong>🔄 Plan de secours :</strong> ${r.contingency}</p>
</div>`).join("")}

<!-- 7. Recommended Approach -->
<h2>7. Approche de Développement Recommandée</h2>
${pdd.recommended_approach ? `
<div class="step-card">
  <div class="detail-row"><span class="detail-label">📐 Méthodologie</span><span><strong>${pdd.recommended_approach.methodology}</strong></span></div>
  <div class="detail-row"><span class="detail-label">⏱ Durée totale</span><span><strong>${pdd.recommended_approach.estimated_total_duration}</strong></span></div>
  <div class="detail-row"><span class="detail-label">💰 Coût estimé</span><span><strong>${pdd.recommended_approach.estimated_total_cost}</strong></span></div>
</div>

<h3>🛠 Stack Technologique</h3>
<div style="margin:8px 0;">${(pdd.recommended_approach.technology_stack || []).map((t: string) => `<span class="tag">${t}</span>`).join(" ")}</div>

<h3>📋 Prérequis</h3>
<ul>${(pdd.recommended_approach.prerequisites || []).map((p: string) => `<li>${p}</li>`).join("")}</ul>

<h3>👥 Composition de l'équipe</h3>
<ul>${(pdd.recommended_approach.team_composition || []).map((r: string) => `<li>${r}</li>`).join("")}</ul>

<h3>📅 Phases de développement</h3>
${(pdd.recommended_approach.phases || []).map((p: any) => `
<div class="phase-card">
  <div class="phase-header">
    <span class="phase-number">Phase ${p.phase_number}</span>
    <strong>${p.name}</strong>
    <span style="margin-left:auto; color:#6b7280; font-size:12px;">⏱ ${p.duration}</span>
  </div>
  <h4>🎯 Objectifs</h4>
  <ul>${(p.objectives || []).map((o: string) => `<li>${o}</li>`).join("")}</ul>
  <h4>📦 Livrables</h4>
  <ul>${(p.deliverables || []).map((d: string) => `<li>${d}</li>`).join("")}</ul>
  <h4>🏁 Jalons clés</h4>
  <ul>${(p.key_milestones || []).map((m: string) => `<li>✓ ${m}</li>`).join("")}</ul>
</div>`).join("")}
` : ""}

<!-- 8. Testing Strategy -->
<h2>8. Stratégie de Test</h2>
${pdd.testing_strategy ? `
<div class="step-card">
  <h4>🔬 Tests unitaires</h4>
  <p>${pdd.testing_strategy.unit_tests}</p>
  <h4>🔗 Tests d'intégration</h4>
  <p>${pdd.testing_strategy.integration_tests}</p>
  <h4>🚀 Tests de performance</h4>
  <p>${pdd.testing_strategy.performance_tests}</p>
  <h4>🔄 Approche de régression</h4>
  <p>${pdd.testing_strategy.regression_approach}</p>
</div>
<h3>✅ Scénarios d'acceptation utilisateur (UAT)</h3>
<ul class="checklist">${(pdd.testing_strategy.uat_scenarios || []).map((s: string) => `<li>${s}</li>`).join("")}</ul>
` : ""}

<!-- 9. Rollout Plan -->
<h2>9. Plan de Déploiement</h2>
${pdd.rollout_plan ? `
<div class="step-card">
  <div class="detail-row"><span class="detail-label">🚀 Stratégie</span><span><strong>${pdd.rollout_plan.strategy}</strong></span></div>
  <div class="detail-row"><span class="detail-label">🧪 Périmètre pilote</span><span>${pdd.rollout_plan.pilot_scope}</span></div>
  <div class="detail-row"><span class="detail-label">🔄 Plan de rollback</span><span>${pdd.rollout_plan.rollback_plan}</span></div>
  <div class="detail-row"><span class="detail-label">📢 Communication</span><span>${pdd.rollout_plan.communication_plan}</span></div>
</div>
<h3>🎓 Besoins de formation</h3>
<ul>${(pdd.rollout_plan.training_needs || []).map((t: string) => `<li>${t}</li>`).join("")}</ul>
<h3>✅ Checklist Go-Live</h3>
<ul class="checklist">${(pdd.rollout_plan.go_live_checklist || []).map((c: string) => `<li>${c}</li>`).join("")}</ul>
` : ""}

<!-- 10. Success Criteria -->
<h2>10. Critères de Succès</h2>
<table>
<thead><tr><th>Métrique</th><th>Valeur actuelle</th><th>Valeur cible</th><th>Méthode de mesure</th></tr></thead>
<tbody>
${(pdd.success_criteria || []).map((c: any) => `<tr>
  <td><strong>${c.metric}</strong></td>
  <td>${c.current_value}</td>
  <td class="arrow">${c.target_value}</td>
  <td>${c.measurement_method}</td>
</tr>`).join("")}
</tbody>
</table>

<hr class="section-break">
<p style="text-align:center; color:#999; font-size:12px;">
  Document généré par l'Agent Business Analyst — ${new Date().toLocaleString("fr-FR")}<br>
  Process Design Document v2.0 — Analyse complète
</p>
</body>
</html>`;
}
