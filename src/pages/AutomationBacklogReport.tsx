import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Download, FileText, Loader2, Sparkles, Star,
  BarChart3, Layers, Wrench, CheckCircle2, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const impactOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
const impactColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const AutomationBacklogReport = () => {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: useCases = [], isLoading: loadingUC } = useQuery({
    queryKey: ["report-use-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_use_cases")
        .select("*, uploaded_processes(file_name), automation_variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: details = [], isLoading: loadingDetails } = useQuery({
    queryKey: ["report-details"],
    queryFn: async () => {
      const { data, error } = await supabase.from("use_case_details").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pdds = [], isLoading: loadingPdds } = useQuery({
    queryKey: ["report-pdds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdd_documents").select("use_case_id, id");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingUC || loadingDetails || loadingPdds;

  const detailMap = useMemo(() => {
    const m = new Map<string, any>();
    details.forEach((d: any) => m.set(d.use_case_id, d));
    return m;
  }, [details]);

  const pddSet = useMemo(() => new Set(pdds.map((p: any) => p.use_case_id)), [pdds]);

  const sorted = useMemo(
    () => [...useCases].sort((a: any, b: any) => (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0)),
    [useCases]
  );

  // Executive summary stats
  const stats = useMemo(() => {
    const byImpact: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const byComplexity: Record<string, number> = {};
    let totalVariants = 0;
    const processSet = new Set<string>();
    const toolFreq: Record<string, number> = {};

    useCases.forEach((uc: any) => {
      byImpact[uc.impact || "medium"] = (byImpact[uc.impact || "medium"] || 0) + 1;
      byComplexity[uc.complexity || "unknown"] = (byComplexity[uc.complexity || "unknown"] || 0) + 1;
      totalVariants += uc.automation_variants?.length || 0;
      if (uc.process_id) processSet.add(uc.process_id);
      (uc.tools_suggested || []).forEach((tool: string) => {
        toolFreq[tool] = (toolFreq[tool] || 0) + 1;
      });
      (uc.automation_variants || []).forEach((v: any) => {
        (v.tools_suggested || []).forEach((tool: string) => {
          toolFreq[tool] = (toolFreq[tool] || 0) + 1;
        });
      });
    });

    return {
      total: useCases.length,
      byImpact,
      byComplexity,
      totalVariants,
      processCount: processSet.size,
      detailedCount: details.length,
      pddCount: pdds.length,
      toolFreq: Object.entries(toolFreq).sort(([, a], [, b]) => b - a),
    };
  }, [useCases, details, pdds]);

  // --- CSV Export ---
  const exportCSV = (type: "use_cases" | "variants") => {
    let csv = "";
    if (type === "use_cases") {
      csv = "Titre,Description,Processus,Impact,Complexité,ROI,Outils,Nb Variantes,Détaillé,PDD,Créé le\n";
      sorted.forEach((uc: any) => {
        const row = [
          `"${(uc.title || "").replace(/"/g, '""')}"`,
          `"${(uc.description || "").replace(/"/g, '""')}"`,
          `"${uc.uploaded_processes?.file_name || ""}"`,
          uc.impact || "",
          uc.complexity || "",
          `"${uc.roi_estimate || ""}"`,
          `"${(uc.tools_suggested || []).join(", ")}"`,
          uc.automation_variants?.length || 0,
          detailMap.has(uc.id) ? "Oui" : "Non",
          pddSet.has(uc.id) ? "Oui" : "Non",
          format(new Date(uc.created_at), "yyyy-MM-dd HH:mm"),
        ];
        csv += row.join(",") + "\n";
      });
    } else {
      csv = "Cas d'usage,Variante,N°,Approche,Complexité,Impact,ROI,Coût,Délai,Recommandée,Outils\n";
      sorted.forEach((uc: any) => {
        (uc.automation_variants || []).forEach((v: any) => {
          const row = [
            `"${(uc.title || "").replace(/"/g, '""')}"`,
            `"${(v.variant_name || "").replace(/"/g, '""')}"`,
            v.variant_number,
            `"${(v.approach_description || "").replace(/"/g, '""')}"`,
            v.complexity || "",
            v.impact || "",
            `"${v.roi_estimate || ""}"`,
            `"${v.estimated_cost || ""}"`,
            `"${v.estimated_timeline || ""}"`,
            v.recommended ? "Oui" : "Non",
            `"${(v.tools_suggested || []).join(", ")}"`,
          ];
          csv += row.join(",") + "\n";
        });
      });
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "use_cases" ? "backlog-cas-usage.csv" : "backlog-variantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- PDF Export ---
  const exportPDF = () => {
    const variantRows = (variants: any[]) =>
      variants.map((v: any) => `
        <tr>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.variant_name}${v.recommended ? ' ⭐' : ''}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.complexity || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.impact || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.roi_estimate || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.estimated_cost || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.estimated_timeline || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;">${(v.tools_suggested || []).join(', ')}</td>
        </tr>
      `).join('');

    const ucSections = sorted.map((uc: any, i: number) => {
      const detail = detailMap.get(uc.id);
      const hasPdd = pddSet.has(uc.id);
      const detailContent = detail?.detail_content;
      return `
        <div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
          <h3 style="margin:0 0 8px;font-size:15px;">${i + 1}. ${uc.title}</h3>
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;">${uc.description || ''}</p>
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;">Impact: ${uc.impact || '—'}</span>
            <span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:12px;font-size:11px;">Complexité: ${uc.complexity || '—'}</span>
            ${uc.roi_estimate ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:11px;">ROI: ${uc.roi_estimate}</span>` : ''}
            ${hasPdd ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;">📄 PDD</span>' : ''}
            ${detail ? '<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:12px;font-size:11px;">✨ Détaillé</span>' : ''}
          </div>
          <p style="font-size:11px;color:#9ca3af;">Processus: ${uc.uploaded_processes?.file_name || '—'} · Outils: ${(uc.tools_suggested || []).join(', ') || '—'}</p>
          ${(uc.automation_variants?.length > 0) ? `
            <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;">Variante</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">Complexité</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">Impact</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">ROI</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">Coût</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">Délai</th>
                <th style="padding:4px 8px;border:1px solid #e5e7eb;">Outils</th>
              </tr></thead>
              <tbody>${variantRows(uc.automation_variants)}</tbody>
            </table>
          ` : ''}
          ${detailContent ? `<div style="margin-top:8px;font-size:11px;color:#374151;"><strong>Détails :</strong> ${typeof detailContent === 'object' ? JSON.stringify(detailContent).slice(0, 500) : String(detailContent).slice(0, 500)}…</div>` : ''}
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport Backlog Automatisation</title>
      <style>body{font-family:system-ui,sans-serif;margin:32px;color:#111827;} @media print{body{margin:16px;}}</style>
    </head><body>
      <h1 style="font-size:22px;margin-bottom:4px;">📊 Rapport Backlog — Découverte d'Automatisation</h1>
      <p style="color:#6b7280;font-size:13px;margin-bottom:24px;">Généré le ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
      
      <h2 style="font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;">Résumé Exécutif</h2>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin:12px 0 24px;">
        <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;">${stats.total}</div><div style="font-size:11px;color:#6b7280;">Cas d'usage</div></div>
        <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;">${stats.totalVariants}</div><div style="font-size:11px;color:#6b7280;">Variantes</div></div>
        <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;">${stats.processCount}</div><div style="font-size:11px;color:#6b7280;">Processus</div></div>
        <div style="background:#dcfce7;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#166534;">${stats.byImpact.high || 0}</div><div style="font-size:11px;color:#166534;">Impact élevé</div></div>
        <div style="background:#fef3c7;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#92400e;">${stats.byImpact.medium || 0}</div><div style="font-size:11px;color:#92400e;">Impact moyen</div></div>
        <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;">${stats.detailedCount}</div><div style="font-size:11px;color:#6b7280;">Détaillés</div></div>
        <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;min-width:120px;text-align:center;"><div style="font-size:24px;font-weight:700;">${stats.pddCount}</div><div style="font-size:11px;color:#6b7280;">PDD générés</div></div>
      </div>

      <h2 style="font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;">Détail par Cas d'Usage</h2>
      ${ucSections}

      <h2 style="font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:32px;">Technologies & Outils</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${stats.toolFreq.map(([tool, count]) => `<span style="background:#e0e7ff;color:#3730a3;padding:4px 12px;border-radius:12px;font-size:12px;">${tool} (${count})</span>`).join('')}
        ${stats.toolFreq.length === 0 ? '<span style="color:#9ca3af;font-size:12px;">Aucun outil suggéré</span>' : ''}
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/automation-discovery")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">📊 Rapport Backlog — Découverte d'Automatisation</h2>
            <p className="text-sm text-muted-foreground">
              Généré le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV("use_cases")}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV Cas d'usage
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("variants")}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV Variantes
          </Button>
          <Button size="sm" onClick={exportPDF}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Résumé Exécutif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Cas d'usage" value={stats.total} />
            <StatCard label="Variantes" value={stats.totalVariants} />
            <StatCard label="Processus" value={stats.processCount} />
            <StatCard label="Impact élevé" value={stats.byImpact.high || 0} className="text-green-700" />
            <StatCard label="Impact moyen" value={stats.byImpact.medium || 0} className="text-amber-700" />
            <StatCard label="Détaillés" value={stats.detailedCount} />
            <StatCard label="PDD" value={stats.pddCount} />
          </div>
        </CardContent>
      </Card>

      {/* Priority Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Matrice de Priorité
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cas d'usage</TableHead>
                <TableHead>Processus</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Complexité</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Variantes</TableHead>
                <TableHead>Outils</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((uc: any, i: number) => (
                <TableRow key={uc.id} className="cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{uc.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{uc.uploaded_processes?.file_name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs capitalize ${impactColors[uc.impact || "medium"]}`}>{uc.impact || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{uc.complexity || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{uc.roi_estimate || "—"}</TableCell>
                  <TableCell className="text-xs">{uc.automation_variants?.length || 0}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{(uc.tools_suggested || []).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {detailMap.has(uc.id) && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                      {pddSet.has(uc.id) && <FileText className="h-3.5 w-3.5 text-green-600" />}
                      {!detailMap.has(uc.id) && !pddSet.has(uc.id) && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per Use Case Detail Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Détail par Cas d'Usage
        </h3>
        {sorted.map((uc: any, i: number) => {
          const detail = detailMap.get(uc.id);
          const variants = uc.automation_variants || [];
          return (
            <Card key={uc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium">
                    {i + 1}. {uc.title}
                  </CardTitle>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge className={`text-xs capitalize ${impactColors[uc.impact || "medium"]}`}>{uc.impact}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{uc.complexity}</Badge>
                    {uc.roi_estimate && <Badge variant="outline" className="text-xs">ROI: {uc.roi_estimate}</Badge>}
                    {pddSet.has(uc.id) && <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-700"><FileText className="h-3 w-3" /> PDD</Badge>}
                    {detail && <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary"><Sparkles className="h-3 w-3" /> Détaillé</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{uc.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  Processus : {uc.uploaded_processes?.file_name || "—"} · Outils : {(uc.tools_suggested || []).join(", ") || "—"}
                </p>
              </CardHeader>
              {variants.length > 0 && (
                <CardContent className="pt-0">
                  <p className="text-xs font-medium mb-2">Variantes ({variants.length})</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Variante</TableHead>
                        <TableHead className="text-xs">Complexité</TableHead>
                        <TableHead className="text-xs">Impact</TableHead>
                        <TableHead className="text-xs">ROI</TableHead>
                        <TableHead className="text-xs">Coût</TableHead>
                        <TableHead className="text-xs">Délai</TableHead>
                        <TableHead className="text-xs">Outils</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.sort((a: any, b: any) => a.variant_number - b.variant_number).map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-medium">
                            {v.variant_name} {v.recommended && <Star className="inline h-3 w-3 text-amber-500 ml-1" />}
                          </TableCell>
                          <TableCell className="text-xs">{v.complexity || "—"}</TableCell>
                          <TableCell className="text-xs">{v.impact || "—"}</TableCell>
                          <TableCell className="text-xs">{v.roi_estimate || "—"}</TableCell>
                          <TableCell className="text-xs">{v.estimated_cost || "—"}</TableCell>
                          <TableCell className="text-xs">{v.estimated_timeline || "—"}</TableCell>
                          <TableCell className="text-xs">{(v.tools_suggested || []).join(", ") || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {detail?.detail_content && (
                    <>
                      <Separator className="my-3" />
                      <DetailContentRenderer content={detail.detail_content} />
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tools & Technology Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Technologies & Outils
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.toolFreq.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun outil suggéré</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.toolFreq.map(([tool, count]) => (
                <Badge key={tool} variant="secondary" className="text-xs">
                  {tool} <span className="ml-1 opacity-60">×{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Small stat card component
const StatCard = ({ label, value, className = "" }: { label: string; value: number; className?: string }) => (
  <div className="bg-muted/50 rounded-lg p-3 text-center">
    <div className={`text-xl font-bold ${className}`}>{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

// Render detail_content JSON nicely
const DetailContentRenderer = ({ content }: { content: any }) => {
  if (!content || typeof content !== "object") return null;
  const sections = Object.entries(content).filter(([, v]) => v);
  if (sections.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Détails enrichis</p>
      {sections.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
          <p className="text-xs">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</p>
        </div>
      ))}
    </div>
  );
};

export default AutomationBacklogReport;
