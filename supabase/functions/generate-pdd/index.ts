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

    const [stepsRes, contextRes] = await Promise.all([
      supabase.from("process_steps").select("*").eq("process_id", useCase.process_id).order("step_order"),
      supabase.from("process_context").select("*").eq("process_id", useCase.process_id).maybeSingle(),
    ]);

    // Build full context for PDD generation
    const parts: string[] = [];
    parts.push(`Cas d'usage: ${useCase.title}`);
    parts.push(`Description: ${useCase.description}`);

    const variants = variantsRes.data || [];
    if (variants.length > 0) {
      parts.push("\n--- Variantes ---");
      for (const v of variants) {
        parts.push(`${v.variant_name} (${v.recommended ? "RECOMMANDÉE" : "alternative"}): ${v.approach_description}`);
      }
    }

    const steps = stepsRes.data || [];
    if (steps.length > 0) {
      parts.push("\n--- Étapes As-Is ---");
      for (const s of steps) {
        parts.push(`${s.step_order}. ${s.name}: ${s.description || ""}`);
      }
    }

    const ctx = contextRes.data;
    if (ctx) {
      parts.push(`\nObjectif: ${ctx.process_objective || "N/A"}`);
      parts.push(`Contraintes: ${ctx.known_constraints || "N/A"}`);
    }

    const messages = messagesRes.data || [];
    if (messages.length > 0) {
      parts.push("\n--- Conversation BA Agent ---");
      for (const m of messages) {
        parts.push(`[${m.role === "agent" ? "BA Agent" : "Utilisateur"}]: ${m.content}`);
      }
    }

    await supabase.from("agent_logs").insert({
      process_id: useCase.process_id,
      agent_name: "business_analyst",
      action: "generate_pdd",
      status: "started",
      message: "Generating Process Design Document...",
    });

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
            content: `Tu es un expert en rédaction de documents de conception de processus (PDD - Process Design Document).
Génère un PDD complet et professionnel basé sur le cas d'usage, le processus analysé et la conversation avec le Business Analyst.
Le PDD doit être structuré et actionnable. Retourne le résultat via la fonction fournie.`,
          },
          {
            role: "user",
            content: `Génère le PDD pour ce cas d'usage :\n\n${parts.join("\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_pdd",
              description: "Create a structured PDD document",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Titre du PDD" },
                  executive_summary: { type: "string", description: "Résumé exécutif (2-3 paragraphes)" },
                  as_is_process: { type: "string", description: "Description détaillée du processus actuel" },
                  to_be_process: { type: "string", description: "Description du processus cible automatisé" },
                  business_rules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rule: { type: "string" },
                        validation: { type: "string" },
                        exceptions: { type: "string" },
                      },
                      required: ["rule", "validation", "exceptions"],
                      additionalProperties: false,
                    },
                  },
                  integration_points: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        system: { type: "string" },
                        type: { type: "string" },
                        description: { type: "string" },
                        data_exchanged: { type: "string" },
                      },
                      required: ["system", "type", "description", "data_exchanged"],
                      additionalProperties: false,
                    },
                  },
                  risks_and_mitigations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        risk: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        mitigation: { type: "string" },
                      },
                      required: ["risk", "severity", "mitigation"],
                      additionalProperties: false,
                    },
                  },
                  testing_strategy: { type: "string", description: "Stratégie de test et validation" },
                  rollout_plan: { type: "string", description: "Plan de déploiement par phases" },
                  success_criteria: {
                    type: "array",
                    items: { type: "string" },
                    description: "Critères de succès mesurables",
                  },
                },
                required: ["title", "executive_summary", "as_is_process", "to_be_process", "business_rules", "integration_points", "risks_and_mitigations", "testing_strategy", "rollout_plan", "success_criteria"],
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
      // Fallback
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*"title"[\s\S]*\}/);
      if (jsonMatch) {
        pddContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to generate PDD structure");
      }
    }

    // Generate HTML for PDF export
    const htmlContent = generatePddHtml(pddContent, useCase, variants);

    // Save PDD
    const { data: pdd, error: pddError } = await supabase.from("pdd_documents").insert({
      conversation_id,
      use_case_id,
      title: pddContent.title,
      content: pddContent,
      html_content: htmlContent,
      status: "final",
    }).select("id").single();

    if (pddError) throw pddError;

    // Update conversation status
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
    low: "#22c55e", medium: "#f59e0b", high: "#ef4444",
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${pdd.title}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 12px; font-size: 28px; }
  h2 { color: #0f3460; margin-top: 32px; font-size: 20px; border-left: 4px solid #0f3460; padding-left: 12px; }
  h3 { color: #16213e; font-size: 16px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
  .section { margin-bottom: 28px; }
  .summary { background: #f0f4ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0f3460; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; }
  td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f8f9fa; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; }
  .process-box { background: #fafbfc; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 12px 0; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  @media print { body { padding: 20px; } h1 { font-size: 24px; } }
</style>
</head>
<body>
<h1>📋 ${pdd.title}</h1>
<div class="meta">
  <strong>Cas d'usage :</strong> ${useCase.title}<br>
  <strong>Processus :</strong> ${(useCase.uploaded_processes as any)?.file_name || "N/A"}<br>
  <strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}<br>
  <strong>Statut :</strong> Document final
</div>

<div class="section">
<h2>1. Résumé Exécutif</h2>
<div class="summary">${pdd.executive_summary}</div>
</div>

<div class="section">
<h2>2. Processus Actuel (As-Is)</h2>
<div class="process-box">${pdd.as_is_process}</div>
</div>

<div class="section">
<h2>3. Processus Cible (To-Be)</h2>
<div class="process-box">${pdd.to_be_process}</div>
</div>

<div class="section">
<h2>4. Règles Métier</h2>
<table>
<thead><tr><th>Règle</th><th>Validation</th><th>Exceptions</th></tr></thead>
<tbody>
${(pdd.business_rules || []).map((r: any) => `<tr><td>${r.rule}</td><td>${r.validation}</td><td>${r.exceptions}</td></tr>`).join("")}
</tbody>
</table>
</div>

<div class="section">
<h2>5. Points d'Intégration</h2>
<table>
<thead><tr><th>Système</th><th>Type</th><th>Description</th><th>Données échangées</th></tr></thead>
<tbody>
${(pdd.integration_points || []).map((p: any) => `<tr><td>${p.system}</td><td>${p.type}</td><td>${p.description}</td><td>${p.data_exchanged}</td></tr>`).join("")}
</tbody>
</table>
</div>

<div class="section">
<h2>6. Risques et Mitigations</h2>
<table>
<thead><tr><th>Risque</th><th>Sévérité</th><th>Mitigation</th></tr></thead>
<tbody>
${(pdd.risks_and_mitigations || []).map((r: any) => `<tr><td>${r.risk}</td><td><span class="badge" style="background:${severityColors[r.severity] || "#666"}">${r.severity}</span></td><td>${r.mitigation}</td></tr>`).join("")}
</tbody>
</table>
</div>

<div class="section">
<h2>7. Stratégie de Test</h2>
<div class="process-box">${pdd.testing_strategy}</div>
</div>

<div class="section">
<h2>8. Plan de Déploiement</h2>
<div class="process-box">${pdd.rollout_plan}</div>
</div>

<div class="section">
<h2>9. Critères de Succès</h2>
<ul>
${(pdd.success_criteria || []).map((c: string) => `<li>✅ ${c}</li>`).join("")}
</ul>
</div>

<hr style="margin-top:40px; border:none; border-top:2px solid #e0e0e0;">
<p style="text-align:center; color:#999; font-size:12px;">
  Document généré par l'Agent Business Analyst — ${new Date().toLocaleString("fr-FR")}
</p>
</body>
</html>`;
}
