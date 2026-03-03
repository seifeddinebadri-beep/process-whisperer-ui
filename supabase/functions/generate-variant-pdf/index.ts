import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function badgeColor(level: string): string {
  switch (level) {
    case "high": return "#16a34a";
    case "medium": return "#d97706";
    case "low": return "#6b7280";
    default: return "#6b7280";
  }
}

interface Variant {
  variant_number: number;
  variant_name: string;
  approach_description: string;
  complexity: string;
  impact: string;
  roi_estimate: string;
  tools_suggested: string[];
  pros: string[];
  cons: string[];
  estimated_cost: string;
  estimated_timeline: string;
  recommended: boolean;
}

interface UseCase {
  title: string;
  description: string;
  complexity: string;
  impact: string;
  roi_estimate: string;
  tools_suggested: string[];
  process_name?: string;
}

function buildHtml(useCase: UseCase, variants: Variant[], date: string): string {
  const recommended = variants.find(v => v.recommended);
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 40px 50px; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 11px; }
  .cover { text-align: center; padding: 120px 40px 60px; page-break-after: always; }
  .cover h1 { font-size: 28px; color: #1e293b; margin-bottom: 8px; }
  .cover .subtitle { font-size: 14px; color: #64748b; margin-bottom: 40px; }
  .cover .meta { font-size: 12px; color: #94a3b8; }
  .cover .logo { font-size: 18px; font-weight: 700; color: #6366f1; letter-spacing: 2px; margin-bottom: 60px; }
  h2 { font-size: 16px; color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-top: 30px; }
  h3 { font-size: 13px; color: #334155; margin-top: 20px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; color: white; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .star { color: #eab308; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  .pros-cons { display: flex; gap: 20px; }
  .pros-cons div { flex: 1; }
  .pros-cons li { margin-bottom: 3px; }
  .pro::marker { color: #16a34a; }
  .con::marker { color: #dc2626; }
  .variant-section { page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .variant-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .page-break { page-break-before: always; }
  .recommendation { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 20px; }
  .recommendation h3 { color: #166534; margin-top: 0; }
  .footer { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 40px; }
</style>
</head>
<body>

<!-- PAGE 1: Cover -->
<div class="cover">
  <div class="logo">AUTODISCOVER</div>
  <h1>${escapeHtml(useCase.title)}</h1>
  <div class="subtitle">${escapeHtml(useCase.description || "")}</div>
  <div class="meta">
    <p>Processus : ${escapeHtml(useCase.process_name || "—")}</p>
    <p>Date : ${escapeHtml(date)}</p>
    <p>${variants.length} variante${variants.length > 1 ? "s" : ""} d'automatisation</p>
  </div>
</div>

<!-- PAGE 2: Executive Summary -->
<h2>Résumé exécutif</h2>
<p>${escapeHtml(useCase.description || "")}</p>

<table>
  <thead>
    <tr>
      <th>Variante</th>
      <th>Complexité</th>
      <th>Impact</th>
      <th>ROI</th>
      <th>Coût</th>
      <th>Délai</th>
      <th>Recommandée</th>
    </tr>
  </thead>
  <tbody>
    ${variants.map(v => `
    <tr>
      <td><strong>${escapeHtml(v.variant_name)}</strong></td>
      <td><span class="badge" style="background:${badgeColor(v.complexity)}">${escapeHtml(v.complexity)}</span></td>
      <td><span class="badge" style="background:${badgeColor(v.impact)}">${escapeHtml(v.impact)}</span></td>
      <td>${escapeHtml(v.roi_estimate)}</td>
      <td>${escapeHtml(v.estimated_cost)}</td>
      <td>${escapeHtml(v.estimated_timeline)}</td>
      <td>${v.recommended ? '<span class="star">★</span> Oui' : '—'}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="page-break"></div>

<!-- PAGE 3+: Variant Details -->
${variants.map((v, i) => `
<div class="variant-section">
  <div class="variant-header">
    <h3 style="margin:0">Variante ${v.variant_number}: ${escapeHtml(v.variant_name)}</h3>
    ${v.recommended ? '<span class="star">★ Recommandée</span>' : ''}
  </div>
  
  <p>${escapeHtml(v.approach_description)}</p>
  
  <table>
    <tr><th>Complexité</th><th>Impact</th><th>ROI estimé</th><th>Coût estimé</th><th>Délai estimé</th></tr>
    <tr>
      <td><span class="badge" style="background:${badgeColor(v.complexity)}">${escapeHtml(v.complexity)}</span></td>
      <td><span class="badge" style="background:${badgeColor(v.impact)}">${escapeHtml(v.impact)}</span></td>
      <td>${escapeHtml(v.roi_estimate)}</td>
      <td>${escapeHtml(v.estimated_cost)}</td>
      <td>${escapeHtml(v.estimated_timeline)}</td>
    </tr>
  </table>

  <h3>Outils & Technologies</h3>
  <p>${(v.tools_suggested || []).map(t => `<span class="badge" style="background:#6366f1">${escapeHtml(t)}</span>`).join(" ")}</p>

  <div class="pros-cons">
    <div>
      <h3 style="color:#16a34a">✓ Avantages</h3>
      <ul>${(v.pros || []).map(p => `<li class="pro">${escapeHtml(p)}</li>`).join("")}</ul>
    </div>
    <div>
      <h3 style="color:#dc2626">✗ Inconvénients</h3>
      <ul>${(v.cons || []).map(c => `<li class="con">${escapeHtml(c)}</li>`).join("")}</ul>
    </div>
  </div>
</div>
${i < variants.length - 1 && i % 2 === 1 ? '<div class="page-break"></div>' : ''}
`).join("")}

<!-- Last: Recommendation -->
${recommended ? `
<div class="recommendation">
  <h3>★ Recommandation</h3>
  <p>La variante <strong>${escapeHtml(recommended.variant_name)}</strong> est recommandée pour ce cas d'usage.</p>
  <p>${escapeHtml(recommended.approach_description)}</p>
  <p><strong>ROI attendu :</strong> ${escapeHtml(recommended.roi_estimate)} | <strong>Coût :</strong> ${escapeHtml(recommended.estimated_cost)} | <strong>Délai :</strong> ${escapeHtml(recommended.estimated_timeline)}</p>
</div>
` : ''}

<div class="footer">
  Généré par AutoDiscover — ${escapeHtml(date)}
</div>

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { use_case_id, use_case_data, variants_data } = await req.json();
    
    const date = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

    let useCase: UseCase;
    let variants: Variant[];

    if (use_case_data && variants_data) {
      // Client-side data (mock or pre-fetched)
      useCase = use_case_data;
      variants = variants_data;
    } else if (use_case_id) {
      // Fetch from DB
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: ucData, error: ucError } = await supabase
        .from("automation_use_cases")
        .select("*, uploaded_processes(file_name)")
        .eq("id", use_case_id)
        .single();

      if (ucError || !ucData) throw new Error("Use case not found");

      useCase = {
        title: ucData.title,
        description: ucData.description,
        complexity: ucData.complexity,
        impact: ucData.impact,
        roi_estimate: ucData.roi_estimate,
        tools_suggested: ucData.tools_suggested || [],
        process_name: ucData.uploaded_processes?.file_name,
      };

      const { data: varData } = await supabase
        .from("automation_variants")
        .select("*")
        .eq("use_case_id", use_case_id)
        .order("variant_number");

      variants = varData || [];
    } else {
      throw new Error("use_case_id or use_case_data is required");
    }

    const html = buildHtml(useCase, variants, date);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (e) {
    console.error("generate-variant-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
