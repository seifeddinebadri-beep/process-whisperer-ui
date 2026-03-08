import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Download, FileText, Loader2, Sparkles, Star,
  TrendingUp, Layers, Wrench, Target, Zap, Clock, CheckCircle2,
  BarChart3, PieChart, ArrowRight, Shield, DollarSign, Search, X, Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const IMPACT_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  high: { label: "Élevé", color: "hsl(142, 71%, 45%)", bgClass: "bg-green-500/10", textClass: "text-green-700" },
  medium: { label: "Moyen", color: "hsl(38, 92%, 50%)", bgClass: "bg-amber-500/10", textClass: "text-amber-700" },
  low: { label: "Faible", color: "hsl(215, 20%, 65%)", bgClass: "bg-muted", textClass: "text-muted-foreground" },
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: "hsl(142, 71%, 45%)",
  medium: "hsl(38, 92%, 50%)",
  high: "hsl(0, 84%, 60%)",
};

const impactOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

const AutomationBacklogReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterComplexity, setFilterComplexity] = useState("all");
  const [filterProcess, setFilterProcess] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

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

  // Unique processes for filter dropdown
  const uniqueProcesses = useMemo(() => {
    const map = new Map<string, string>();
    useCases.forEach((uc: any) => {
      if (uc.uploaded_processes?.file_name) map.set(uc.process_id, uc.uploaded_processes.file_name);
    });
    return [...map.entries()];
  }, [useCases]);

  // Filter logic
  const filtered = useMemo(() => {
    return useCases.filter((uc: any) => {
      if (filterSearch && !uc.title.toLowerCase().includes(filterSearch.toLowerCase()) && !(uc.description || "").toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterImpact !== "all" && uc.impact !== filterImpact) return false;
      if (filterComplexity !== "all" && uc.complexity !== filterComplexity) return false;
      if (filterProcess !== "all" && uc.process_id !== filterProcess) return false;
      if (filterStatus === "detailed" && !detailMap.has(uc.id)) return false;
      if (filterStatus === "pdd" && !pddSet.has(uc.id)) return false;
      if (filterStatus === "basic" && (detailMap.has(uc.id) || pddSet.has(uc.id))) return false;
      return true;
    });
  }, [useCases, filterSearch, filterImpact, filterComplexity, filterProcess, filterStatus, detailMap, pddSet]);

  const sorted = useMemo(
    () => [...filtered].sort((a: any, b: any) => (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0)),
    [filtered]
  );

  const activeFilterCount = [filterSearch, filterImpact !== "all", filterComplexity !== "all", filterProcess !== "all", filterStatus !== "all"].filter(Boolean).length;
  const clearFilters = () => { setFilterSearch(""); setFilterImpact("all"); setFilterComplexity("all"); setFilterProcess("all"); setFilterStatus("all"); };

  const stats = useMemo(() => {
    const byImpact: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const byComplexity: Record<string, number> = {};
    let totalVariants = 0;
    const processSet = new Set<string>();
    const toolFreq: Record<string, number> = {};

    filtered.forEach((uc: any) => {
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

    const filteredDetailCount = filtered.filter((uc: any) => detailMap.has(uc.id)).length;
    const filteredPddCount = filtered.filter((uc: any) => pddSet.has(uc.id)).length;

    return {
      total: filtered.length,
      byImpact,
      byComplexity,
      totalVariants,
      processCount: processSet.size,
      detailedCount: filteredDetailCount,
      pddCount: filteredPddCount,
      toolFreq: Object.entries(toolFreq).sort(([, a], [, b]) => b - a),
      readinessPercent: filtered.length > 0 ? Math.round((filteredDetailCount / filtered.length) * 100) : 0,
      pddPercent: filtered.length > 0 ? Math.round((filteredPddCount / filtered.length) * 100) : 0,
    };
  }, [filtered, detailMap, pddSet]);

  const impactChartData = useMemo(() =>
    Object.entries(stats.byImpact)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: IMPACT_CONFIG[key]?.label || key,
        value,
        color: IMPACT_CONFIG[key]?.color || "hsl(215, 20%, 65%)",
      })),
    [stats.byImpact]
  );

  const complexityChartData = useMemo(() =>
    Object.entries(stats.byComplexity)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: key === "unknown" ? "N/A" : key.charAt(0).toUpperCase() + key.slice(1),
        value,
        fill: COMPLEXITY_COLORS[key] || "hsl(215, 20%, 65%)",
      })),
    [stats.byComplexity]
  );

  // --- CSV Export ---
  const exportCSV = (type: "use_cases" | "variants") => {
    let csv = "";
    if (type === "use_cases") {
      csv = "Titre,Description,Processus,Impact,Complexité,ROI,Outils,Nb Variantes,Détaillé,PDD,Créé le\n";
      sorted.forEach((uc: any) => {
        csv += [
          `"${(uc.title || "").replace(/"/g, '""')}"`,
          `"${(uc.description || "").replace(/"/g, '""')}"`,
          `"${uc.uploaded_processes?.file_name || ""}"`,
          uc.impact || "", uc.complexity || "",
          `"${uc.roi_estimate || ""}"`,
          `"${(uc.tools_suggested || []).join(", ")}"`,
          uc.automation_variants?.length || 0,
          detailMap.has(uc.id) ? "Oui" : "Non",
          pddSet.has(uc.id) ? "Oui" : "Non",
          format(new Date(uc.created_at), "yyyy-MM-dd HH:mm"),
        ].join(",") + "\n";
      });
    } else {
      csv = "Cas d'usage,Variante,N°,Approche,Complexité,Impact,ROI,Coût,Délai,Recommandée,Outils\n";
      sorted.forEach((uc: any) => {
        (uc.automation_variants || []).forEach((v: any) => {
          csv += [
            `"${(uc.title || "").replace(/"/g, '""')}"`,
            `"${(v.variant_name || "").replace(/"/g, '""')}"`,
            v.variant_number,
            `"${(v.approach_description || "").replace(/"/g, '""')}"`,
            v.complexity || "", v.impact || "",
            `"${v.roi_estimate || ""}"`,
            `"${v.estimated_cost || ""}"`,
            `"${v.estimated_timeline || ""}"`,
            v.recommended ? "Oui" : "Non",
            `"${(v.tools_suggested || []).join(", ")}"`,
          ].join(",") + "\n";
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
    const topOpportunities = sorted.slice(0, 5);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport Exécutif — Backlog Automatisation</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #fff; padding: 40px 48px; line-height: 1.5; }
      @media print { body { padding: 24px 32px; } @page { size: A4 landscape; margin: 16mm; } }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
      .header h1 { font-size: 26px; font-weight: 700; color: #1e293b; }
      .header .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
      .header .date { font-size: 12px; color: #94a3b8; text-align: right; }
      .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
      .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; }
      .kpi .value { font-size: 32px; font-weight: 800; color: #1e293b; }
      .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
      .kpi.highlight { border-color: #2563eb; background: linear-gradient(135deg, #eff6ff, #dbeafe); }
      .kpi.highlight .value { color: #1d4ed8; }
      .kpi.green { border-color: #22c55e; background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
      .kpi.green .value { color: #16a34a; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
      .section-title .emoji { font-size: 18px; }
      .progress-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
      .progress-label { font-size: 12px; color: #475569; min-width: 100px; }
      .progress-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
      .progress-fill { height: 100%; border-radius: 4px; }
      .progress-value { font-size: 12px; font-weight: 600; min-width: 40px; text-align: right; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
      td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
      tr:hover td { background: #f8fafc; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
      .badge-high { background: #dcfce7; color: #166534; }
      .badge-medium { background: #fef3c7; color: #92400e; }
      .badge-low { background: #f1f5f9; color: #64748b; }
      .badge-rec { background: #dbeafe; color: #1d4ed8; }
      .tools-grid { display: flex; flex-wrap: wrap; gap: 6px; }
      .tool-tag { background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: 500; }
      .opportunity-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; }
      .opportunity-card h4 { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
      .opportunity-card p { font-size: 11px; color: #64748b; margin-bottom: 8px; }
      .meta-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    </style></head><body>
      <div class="header">
        <div>
          <h1>📊 Rapport Exécutif — Backlog Automatisation</h1>
          <div class="subtitle">Synthèse des opportunités d'automatisation identifiées par l'IA</div>
        </div>
        <div class="date">
          Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}<br/>
          <strong>AutoDiscover</strong>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi highlight"><div class="value">${stats.total}</div><div class="label">Opportunités identifiées</div></div>
        <div class="kpi green"><div class="value">${stats.byImpact.high || 0}</div><div class="label">Impact élevé</div></div>
        <div class="kpi"><div class="value">${stats.totalVariants}</div><div class="label">Scénarios d'implémentation</div></div>
        <div class="kpi"><div class="value">${stats.processCount}</div><div class="label">Processus couverts</div></div>
      </div>

      <div class="section">
        <div class="section-title"><span class="emoji">📈</span> Maturité du Backlog</div>
        <div class="progress-row">
          <span class="progress-label">Analyse détaillée</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${stats.readinessPercent}%;background:#2563eb;"></div></div>
          <span class="progress-value">${stats.readinessPercent}%</span>
        </div>
        <div class="progress-row">
          <span class="progress-label">PDD générés</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${stats.pddPercent}%;background:#22c55e;"></div></div>
          <span class="progress-value">${stats.pddPercent}%</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="emoji">🎯</span> Top 5 — Opportunités Prioritaires</div>
        ${topOpportunities.map((uc: any, i: number) => {
          const variants = uc.automation_variants || [];
          const recommended = variants.find((v: any) => v.recommended);
          return `<div class="opportunity-card">
            <h4>${i + 1}. ${uc.title}</h4>
            <p>${uc.description || ""}</p>
            <div class="meta-row">
              <span class="badge badge-${uc.impact || "medium"}">Impact ${IMPACT_CONFIG[uc.impact || "medium"]?.label}</span>
              <span class="badge badge-${uc.complexity === "high" ? "medium" : uc.complexity || "low"}">Complexité ${uc.complexity || "—"}</span>
              ${uc.roi_estimate ? `<span class="badge badge-rec">ROI ${uc.roi_estimate}</span>` : ""}
              ${recommended ? `<span class="badge badge-rec">⭐ ${recommended.variant_name}</span>` : ""}
            </div>
            <div style="font-size:11px;color:#64748b;">
              Processus : ${uc.uploaded_processes?.file_name || "—"} · ${variants.length} variante(s)
              ${(uc.tools_suggested || []).length > 0 ? ` · Outils : ${uc.tools_suggested.join(", ")}` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>

      <div class="section" style="page-break-before:always;">
        <div class="section-title"><span class="emoji">📋</span> Vue Complète du Backlog</div>
        <table>
          <thead><tr>
            <th>#</th><th>Opportunité</th><th>Processus</th><th>Impact</th><th>Complexité</th><th>ROI</th><th>Variantes</th><th>Statut</th>
          </tr></thead>
          <tbody>
            ${sorted.map((uc: any, i: number) => `<tr>
              <td>${i + 1}</td>
              <td style="font-weight:500;">${uc.title}</td>
              <td style="color:#64748b;">${uc.uploaded_processes?.file_name || "—"}</td>
              <td><span class="badge badge-${uc.impact || "medium"}">${IMPACT_CONFIG[uc.impact || "medium"]?.label}</span></td>
              <td>${uc.complexity || "—"}</td>
              <td>${uc.roi_estimate || "—"}</td>
              <td>${uc.automation_variants?.length || 0}</td>
              <td>${detailMap.has(uc.id) ? "✨ Détaillé" : ""}${pddSet.has(uc.id) ? " 📄 PDD" : ""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title"><span class="emoji">🛠️</span> Écosystème Technologique</div>
        <div class="tools-grid">
          ${stats.toolFreq.map(([tool, count]) => `<span class="tool-tag">${tool} (×${count})</span>`).join("")}
          ${stats.toolFreq.length === 0 ? '<span style="color:#94a3b8;font-size:12px;">Aucun outil identifié</span>' : ""}
        </div>
      </div>

      <div class="footer">
        Document généré automatiquement par AutoDiscover · ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })} · Confidentiel
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement du rapport…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12" ref={reportRef}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate("/automation-discovery")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rapport Exécutif</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Synthèse du backlog d'automatisation · Généré le {format(new Date(), "dd MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV("use_cases")}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("variants")}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Variantes CSV
          </Button>
          <Button size="sm" className="shadow-sm" onClick={exportPDF}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Exporter PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={filterImpact} onValueChange={setFilterImpact}>
              <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Impact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout impact</SelectItem>
                <SelectItem value="high">Élevé</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterComplexity} onValueChange={setFilterComplexity}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Complexité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute complexité</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Processus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les processus</SelectItem>
                {uniqueProcesses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="detailed">✨ Détaillé</SelectItem>
                <SelectItem value="pdd">📄 Avec PDD</SelectItem>
                <SelectItem value="basic">Non détaillé</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Réinitialiser ({activeFilterCount})
              </Button>
            )}
          </div>
          {activeFilterCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              <Filter className="h-3 w-3 inline mr-1" />{sorted.length} / {useCases.length} opportunités affichées
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="Opportunités identifiées" value={stats.total} accent />
        <KpiCard icon={TrendingUp} label="Impact élevé" value={stats.byImpact.high || 0} variant="green" />
        <KpiCard icon={Layers} label="Scénarios d'implémentation" value={stats.totalVariants} />
        <KpiCard icon={Zap} label="Processus analysés" value={stats.processCount} />
      </div>

      {/* Maturity + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Maturity Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Maturité du Backlog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressMetric label="Analyse détaillée" value={stats.detailedCount} total={stats.total} percent={stats.readinessPercent} color="bg-primary" />
            <ProgressMetric label="PDD générés" value={stats.pddCount} total={stats.total} percent={stats.pddPercent} color="bg-green-500" />
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Cas détaillés" value={stats.detailedCount} icon={Sparkles} />
              <MiniStat label="Documents PDD" value={stats.pddCount} icon={FileText} />
            </div>
          </CardContent>
        </Card>

        {/* Impact Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Répartition par Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RePieChart>
                <Pie data={impactChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                  {impactChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs">{value}</span>} />
                <Tooltip formatter={(value: number) => [`${value} cas`, ""]} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Complexity Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Répartition par Complexité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complexityChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value} cas`, ""]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {complexityChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Priority Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Classement Prioritaire
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{sorted.length} opportunités</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 w-8">#</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Opportunité</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Processus</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Impact</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Complexité</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">ROI</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Variantes</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((uc: any, i: number) => (
                  <tr key={uc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{uc.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-[300px]">{uc.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{uc.uploaded_processes?.file_name || "—"}</td>
                    <td className="px-4 py-3">
                      <ImpactBadge impact={uc.impact} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize font-medium">{uc.complexity || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {uc.roi_estimate ? (
                        <span className="text-xs font-medium flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />{uc.roi_estimate}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold">{uc.automation_variants?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {detailMap.has(uc.id) && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                        {pddSet.has(uc.id) && <FileText className="h-3.5 w-3.5 text-green-600" />}
                        {!detailMap.has(uc.id) && !pddSet.has(uc.id) && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Opportunities Detail */}
      {sorted.filter((uc: any) => uc.impact === "high").length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Opportunités à Fort Impact — Vue Détaillée
          </h2>
          {sorted.filter((uc: any) => uc.impact === "high").map((uc: any, i: number) => (
            <OpportunityCard key={uc.id} uc={uc} index={i} detailMap={detailMap} pddSet={pddSet} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Technology Landscape */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> Écosystème Technologique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.toolFreq.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun outil identifié dans les analyses</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.toolFreq.map(([tool, count]) => (
                <div key={tool} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{tool}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">×{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          Rapport généré automatiquement par AutoDiscover · {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
};

// --- Sub-components ---

const KpiCard = ({ icon: Icon, label, value, accent, variant }: {
  icon: any; label: string; value: number; accent?: boolean; variant?: "green";
}) => (
  <Card className={`${accent ? "border-primary/30 bg-primary/5" : variant === "green" ? "border-green-500/20 bg-green-500/5" : ""}`}>
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
        accent ? "bg-primary/10" : variant === "green" ? "bg-green-500/10" : "bg-muted"
      }`}>
        <Icon className={`h-5 w-5 ${accent ? "text-primary" : variant === "green" ? "text-green-600" : "text-muted-foreground"}`} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${accent ? "text-primary" : variant === "green" ? "text-green-700" : ""}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      </div>
    </CardContent>
  </Card>
);

const ProgressMetric = ({ label, value, total, percent, color }: {
  label: string; value: number; total: number; percent: number; color: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold">{value}/{total}</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
    </div>
  </div>
);

const MiniStat = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <div>
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  </div>
);

const ImpactBadge = ({ impact }: { impact: string }) => {
  const config = IMPACT_CONFIG[impact || "medium"];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${config?.bgClass} ${config?.textClass}`}>
      {config?.label || impact}
    </span>
  );
};

const OpportunityCard = ({ uc, index, detailMap, pddSet, navigate }: {
  uc: any; index: number; detailMap: Map<string, any>; pddSet: Set<string>; navigate: any;
}) => {
  const variants = (uc.automation_variants || []).sort((a: any, b: any) => a.variant_number - b.variant_number);
  const recommended = variants.find((v: any) => v.recommended);
  const detail = detailMap.get(uc.id);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
      <div className="flex">
        <div className="w-1.5 bg-green-500 shrink-0" />
        <div className="flex-1 p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">{uc.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">{uc.description}</p>
            </div>
            <div className="flex gap-1.5 shrink-0 ml-4">
              <ImpactBadge impact={uc.impact} />
              {uc.roi_estimate && (
                <Badge variant="outline" className="text-xs font-medium">
                  <DollarSign className="h-3 w-3 mr-0.5" />{uc.roi_estimate}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {uc.uploaded_processes?.file_name || "—"}</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {variants.length} variante(s)</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(uc.created_at), "dd MMM yyyy", { locale: fr })}</span>
            {detailMap.has(uc.id) && <span className="flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3" /> Détaillé</span>}
            {pddSet.has(uc.id) && <span className="flex items-center gap-1 text-green-600"><FileText className="h-3 w-3" /> PDD</span>}
          </div>

          {variants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {variants.map((v: any) => (
                <div key={v.id} className={`rounded-lg border px-3 py-2 text-xs ${v.recommended ? "border-primary/30 bg-primary/5" : "bg-muted/30"}`}>
                  <div className="font-medium flex items-center gap-1">
                    {v.recommended && <Star className="h-3 w-3 text-amber-500" />}
                    {v.variant_name}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {v.complexity && <span className="capitalize">{v.complexity}</span>}
                    {v.estimated_cost && <span> · {v.estimated_cost}</span>}
                    {v.estimated_timeline && <span> · {v.estimated_timeline}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AutomationBacklogReport;
