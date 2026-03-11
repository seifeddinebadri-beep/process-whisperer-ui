import { useMemo, useRef, useState, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Download, FileText, Loader2, Sparkles, Star,
  TrendingUp, Layers, Wrench, Target, Zap, Clock, CheckCircle2,
  BarChart3, PieChart, ArrowRight, Shield, DollarSign, Search, X, Filter,
  ChevronDown, ChevronRight, PackageCheck, CheckSquare
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

interface ProcessGroup {
  processId: string;
  processName: string;
  useCases: any[];
  totalVariants: number;
  highImpactCount: number;
}

const AutomationBacklogReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterComplexity, setFilterComplexity] = useState("all");
  const [filterProcess, setFilterProcess] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Selection state
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());

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

  // Group by process
  const processGroups = useMemo((): ProcessGroup[] => {
    const groupMap = new Map<string, ProcessGroup>();
    sorted.forEach((uc: any) => {
      const pid = uc.process_id;
      const pName = uc.uploaded_processes?.file_name || "Processus inconnu";
      if (!groupMap.has(pid)) {
        groupMap.set(pid, { processId: pid, processName: pName, useCases: [], totalVariants: 0, highImpactCount: 0 });
      }
      const g = groupMap.get(pid)!;
      g.useCases.push(uc);
      g.totalVariants += uc.automation_variants?.length || 0;
      if (uc.impact === "high") g.highImpactCount++;
    });
    return [...groupMap.values()].sort((a, b) => b.highImpactCount - a.highImpactCount || b.useCases.length - a.useCases.length);
  }, [sorted]);

  const activeFilterCount = [filterSearch, filterImpact !== "all", filterComplexity !== "all", filterProcess !== "all", filterStatus !== "all"].filter(Boolean).length;
  const clearFilters = () => { setFilterSearch(""); setFilterImpact("all"); setFilterComplexity("all"); setFilterProcess("all"); setFilterStatus("all"); };

  // Selection helpers
  const toggleUseCase = useCallback((ucId: string, variants: any[]) => {
    setSelectedUseCases(prev => {
      const next = new Set(prev);
      if (next.has(ucId)) {
        next.delete(ucId);
        // Also deselect all variants of this UC
        setSelectedVariants(prev2 => {
          const next2 = new Set(prev2);
          variants.forEach((v: any) => next2.delete(v.id));
          return next2;
        });
      } else {
        next.add(ucId);
        // Also select all variants of this UC
        setSelectedVariants(prev2 => {
          const next2 = new Set(prev2);
          variants.forEach((v: any) => next2.add(v.id));
          return next2;
        });
      }
      return next;
    });
  }, []);

  const toggleVariant = useCallback((variantId: string, ucId: string, allVariants: any[]) => {
    setSelectedVariants(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      // Check if all variants of this UC are selected → auto-select UC
      const allSelected = allVariants.every((v: any) => next.has(v.id));
      const anySelected = allVariants.some((v: any) => next.has(v.id));
      setSelectedUseCases(prev2 => {
        const next2 = new Set(prev2);
        if (allSelected) next2.add(ucId);
        else if (!anySelected) next2.delete(ucId);
        else next2.add(ucId); // partial = still selected at UC level
        return next2;
      });
      return next;
    });
  }, []);

  const toggleProcess = useCallback((group: ProcessGroup) => {
    const allUcIds = group.useCases.map((uc: any) => uc.id);
    const allSelected = allUcIds.every(id => selectedUseCases.has(id));

    if (allSelected) {
      // Deselect all
      setSelectedUseCases(prev => {
        const next = new Set(prev);
        allUcIds.forEach(id => next.delete(id));
        return next;
      });
      setSelectedVariants(prev => {
        const next = new Set(prev);
        group.useCases.forEach((uc: any) => (uc.automation_variants || []).forEach((v: any) => next.delete(v.id)));
        return next;
      });
    } else {
      // Select all
      setSelectedUseCases(prev => {
        const next = new Set(prev);
        allUcIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedVariants(prev => {
        const next = new Set(prev);
        group.useCases.forEach((uc: any) => (uc.automation_variants || []).forEach((v: any) => next.add(v.id)));
        return next;
      });
    }
  }, [selectedUseCases]);

  const selectAll = useCallback(() => {
    const allUcIds = sorted.map((uc: any) => uc.id);
    setSelectedUseCases(new Set(allUcIds));
    const allVarIds = sorted.flatMap((uc: any) => (uc.automation_variants || []).map((v: any) => v.id));
    setSelectedVariants(new Set(allVarIds));
  }, [sorted]);

  const deselectAll = useCallback(() => {
    setSelectedUseCases(new Set());
    setSelectedVariants(new Set());
  }, []);

  const toggleExpandProcess = useCallback((pid: string) => {
    setExpandedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }, []);

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
      (uc.tools_suggested || []).forEach((tool: string) => { toolFreq[tool] = (toolFreq[tool] || 0) + 1; });
      (uc.automation_variants || []).forEach((v: any) => {
        (v.tools_suggested || []).forEach((tool: string) => { toolFreq[tool] = (toolFreq[tool] || 0) + 1; });
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
    Object.entries(stats.byImpact).filter(([, v]) => v > 0).map(([key, value]) => ({
      name: IMPACT_CONFIG[key]?.label || key, value, color: IMPACT_CONFIG[key]?.color || "hsl(215, 20%, 65%)",
    })), [stats.byImpact]);

  const complexityChartData = useMemo(() =>
    Object.entries(stats.byComplexity).filter(([, v]) => v > 0).map(([key, value]) => ({
      name: key === "unknown" ? "N/A" : key.charAt(0).toUpperCase() + key.slice(1), value,
      fill: COMPLEXITY_COLORS[key] || "hsl(215, 20%, 65%)",
    })), [stats.byComplexity]);

  // --- Get selected data for export ---
  const getSelectedData = useCallback(() => {
    if (selectedUseCases.size === 0) return sorted;
    return sorted.filter((uc: any) => selectedUseCases.has(uc.id));
  }, [sorted, selectedUseCases]);

  const getSelectedVariantsForUc = useCallback((uc: any) => {
    const variants = uc.automation_variants || [];
    if (selectedVariants.size === 0) return variants;
    const filtered = variants.filter((v: any) => selectedVariants.has(v.id));
    return filtered.length > 0 ? filtered : variants;
  }, [selectedVariants]);

  // --- CSV Export ---
  const exportCSV = () => {
    const data = getSelectedData();
    let csv = "Processus,Cas d'usage,Description,Impact,Complexité,ROI,Variante,Approche,Coût,Délai,Recommandée,Outils\n";
    data.forEach((uc: any) => {
      const variants = getSelectedVariantsForUc(uc);
      variants.forEach((v: any) => {
        csv += [
          `"${uc.uploaded_processes?.file_name || ""}"`,
          `"${(uc.title || "").replace(/"/g, '""')}"`,
          `"${(uc.description || "").replace(/"/g, '""')}"`,
          uc.impact || "", uc.complexity || "",
          `"${uc.roi_estimate || ""}"`,
          `"${(v.variant_name || "").replace(/"/g, '""')}"`,
          `"${(v.approach_description || "").replace(/"/g, '""')}"`,
          `"${v.estimated_cost || ""}"`,
          `"${v.estimated_timeline || ""}"`,
          v.recommended ? "Oui" : "Non",
          `"${(v.tools_suggested || []).join(", ")}"`,
        ].join(",") + "\n";
      });
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedUseCases.size > 0 ? "selection-backlog.csv" : "backlog-complet.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- PDF Export (handoff) ---
  const exportPDF = () => {
    const data = getSelectedData();
    const isSelection = selectedUseCases.size > 0;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${isSelection ? "Sélection pour Développement" : "Rapport Exécutif — Backlog"}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #fff; padding: 40px 48px; line-height: 1.5; }
      @media print { body { padding: 24px 32px; } @page { size: A4; margin: 16mm; } }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
      .header h1 { font-size: 24px; font-weight: 700; color: #1e293b; }
      .header .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
      .header .date { font-size: 12px; color: #94a3b8; text-align: right; }
      .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
      .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; }
      .kpi .value { font-size: 28px; font-weight: 800; color: #1e293b; }
      .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
      .kpi.highlight { border-color: #2563eb; background: linear-gradient(135deg, #eff6ff, #dbeafe); }
      .kpi.highlight .value { color: #1d4ed8; }
      .process-group { margin-bottom: 28px; page-break-inside: avoid; }
      .process-header { background: #f1f5f9; padding: 12px 16px; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none; font-weight: 600; font-size: 14px; color: #1e293b; }
      .uc-card { border: 1px solid #e2e8f0; padding: 16px; margin: 0; page-break-inside: avoid; }
      .uc-card:last-child { border-radius: 0 0 8px 8px; }
      .uc-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
      .uc-desc { font-size: 11px; color: #64748b; margin-bottom: 10px; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-right: 4px; }
      .badge-high { background: #dcfce7; color: #166534; }
      .badge-medium { background: #fef3c7; color: #92400e; }
      .badge-low { background: #f1f5f9; color: #64748b; }
      .badge-rec { background: #dbeafe; color: #1d4ed8; }
      .variant-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 6px; margin-top: 6px; font-size: 11px; }
      .variant-row.recommended { background: #eff6ff; border-color: #bfdbfe; }
      .variant-name { font-weight: 600; min-width: 140px; }
      .variant-meta { color: #64748b; flex: 1; }
      .tools-row { margin-top: 4px; }
      .tool-tag { background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 10px; font-size: 10px; display: inline-block; margin: 2px; }
      .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    </style></head><body>
      <div class="header">
        <div>
          <h1>${isSelection ? "📋 Sélection pour Développement" : "📊 Rapport Exécutif — Backlog"}</h1>
          <div class="subtitle">${isSelection ? `${data.length} cas d'usage sélectionnés pour implémentation` : "Synthèse du backlog d'automatisation"}</div>
        </div>
        <div class="date">
          Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}<br/>
          <strong>AutoDiscover</strong>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi highlight"><div class="value">${data.length}</div><div class="label">Cas d'usage</div></div>
        <div class="kpi"><div class="value">${data.reduce((s: number, uc: any) => s + getSelectedVariantsForUc(uc).length, 0)}</div><div class="label">Variantes sélectionnées</div></div>
        <div class="kpi"><div class="value">${new Set(data.map((uc: any) => uc.process_id)).size}</div><div class="label">Processus sources</div></div>
      </div>

      ${(() => {
        const groups = new Map<string, { name: string; ucs: any[] }>();
        data.forEach((uc: any) => {
          const pid = uc.process_id;
          if (!groups.has(pid)) groups.set(pid, { name: uc.uploaded_processes?.file_name || "—", ucs: [] });
          groups.get(pid)!.ucs.push(uc);
        });
        return [...groups.entries()].map(([, g]) => `
          <div class="process-group">
            <div class="process-header">📁 ${g.name} — ${g.ucs.length} cas d'usage</div>
            ${g.ucs.map((uc: any) => {
              const vars = getSelectedVariantsForUc(uc);
              return `<div class="uc-card">
                <div class="uc-title">${uc.title}</div>
                <div class="uc-desc">${uc.description || ""}</div>
                <div>
                  <span class="badge badge-${uc.impact || "medium"}">Impact ${IMPACT_CONFIG[uc.impact || "medium"]?.label}</span>
                  <span class="badge badge-low">Complexité ${uc.complexity || "—"}</span>
                  ${uc.roi_estimate ? `<span class="badge badge-rec">ROI ${uc.roi_estimate}</span>` : ""}
                </div>
                ${vars.map((v: any) => `
                  <div class="variant-row ${v.recommended ? "recommended" : ""}">
                    <div class="variant-name">${v.recommended ? "⭐ " : ""}${v.variant_name}</div>
                    <div class="variant-meta">
                      ${v.approach_description || ""}
                      <br/>Complexité: ${v.complexity || "—"} · Coût: ${v.estimated_cost || "—"} · Délai: ${v.estimated_timeline || "—"}
                      ${(v.tools_suggested || []).length > 0 ? `<div class="tools-row">${v.tools_suggested.map((t: string) => `<span class="tool-tag">${t}</span>`).join("")}</div>` : ""}
                    </div>
                  </div>
                `).join("")}
              </div>`;
            }).join("")}
          </div>
        `).join("");
      })()}

      <div class="footer">
        Document généré par AutoDiscover · ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })} · Confidentiel
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

  const hasSelection = selectedUseCases.size > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24" ref={reportRef}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate("/automation-discovery")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Backlog d'Automatisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sélectionnez les cas d'usage et variantes à valider pour développement · {format(new Date(), "dd MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasSelection ? (
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Désélectionner tout
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Tout sélectionner
            </Button>
          )}
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

      {/* Selection Stats */}
      {hasSelection && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <PackageCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedUseCases.size} cas d'usage · {selectedVariants.size} variantes sélectionnés
            </span>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  {impactChartData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs">{value}</span>} />
                <Tooltip formatter={(value: number) => [`${value} cas`, ""]} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                  {complexityChartData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Process-Grouped Pick List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Pick List — Sélection par Processus
          </h2>
          <Badge variant="secondary" className="text-xs">{processGroups.length} processus · {sorted.length} cas d'usage</Badge>
        </div>

        {processGroups.map((group) => {
          const allUcIds = group.useCases.map((uc: any) => uc.id);
          const allSelected = allUcIds.every(id => selectedUseCases.has(id));
          const someSelected = allUcIds.some(id => selectedUseCases.has(id));
          const isExpanded = expandedProcesses.has(group.processId);

          return (
            <Card key={group.processId} className={`overflow-hidden transition-all ${someSelected ? "border-primary/30" : ""}`}>
              {/* Process Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b cursor-pointer" onClick={() => toggleExpandProcess(group.processId)}>
                <Checkbox
                  checked={allSelected}
                  // @ts-ignore
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={() => toggleProcess(group)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-sm truncate">{group.processName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{group.useCases.length} cas</Badge>
                  <Badge variant="secondary" className="text-[10px]">{group.totalVariants} var.</Badge>
                  {group.highImpactCount > 0 && (
                    <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/20">{group.highImpactCount} impact élevé</Badge>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="divide-y">
                  {group.useCases.map((uc: any) => {
                    const variants = (uc.automation_variants || []).sort((a: any, b: any) => a.variant_number - b.variant_number);
                    const ucSelected = selectedUseCases.has(uc.id);

                    return (
                      <div key={uc.id} className={`transition-colors ${ucSelected ? "bg-primary/5" : ""}`}>
                        {/* Use Case Row */}
                        <div className="flex items-start gap-3 px-4 py-3 pl-10">
                          <Checkbox
                            checked={ucSelected}
                            onCheckedChange={() => toggleUseCase(uc.id, variants)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{uc.title}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{uc.description}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <ImpactBadge impact={uc.impact} />
                                <Badge variant="outline" className="text-[10px] capitalize">{uc.complexity || "—"}</Badge>
                                {uc.roi_estimate && (
                                  <span className="text-[10px] font-medium flex items-center gap-0.5 text-muted-foreground">
                                    <DollarSign className="h-3 w-3" />{uc.roi_estimate}
                                  </span>
                                )}
                                {detailMap.has(uc.id) && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                                {pddSet.has(uc.id) && <FileText className="h-3.5 w-3.5 text-green-600" />}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/automation-discovery/${uc.id}`); }}>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Variant rows */}
                            {variants.length > 0 && (
                              <div className="mt-2 space-y-1 ml-2">
                                {variants.map((v: any) => {
                                  const vSelected = selectedVariants.has(v.id);
                                  return (
                                    <div key={v.id} className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-colors ${vSelected ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-transparent"}`}>
                                      <Checkbox
                                        checked={vSelected}
                                        onCheckedChange={() => toggleVariant(v.id, uc.id, variants)}
                                        className="shrink-0"
                                      />
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        {v.recommended && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                                        <span className="font-medium truncate">{v.variant_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                                        <span className="capitalize">{v.complexity || "—"}</span>
                                        {v.estimated_cost && <span>· {v.estimated_cost}</span>}
                                        {v.estimated_timeline && <span>· {v.estimated_timeline}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Validated for Development Section */}
      {hasSelection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Validés pour Développement
            </h2>
            <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/20">
              {selectedUseCases.size} cas d'usage · {selectedVariants.size} variantes
            </Badge>
          </div>

          {processGroups.filter(g => g.useCases.some((uc: any) => selectedUseCases.has(uc.id))).map((group) => (
            <Card key={`validated-${group.processId}`} className="border-green-500/20 overflow-hidden">
              {/* Process header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/5 border-b border-green-500/10">
                <FileText className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold text-sm">{group.processName}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {group.useCases.filter((uc: any) => selectedUseCases.has(uc.id)).length} cas
                </Badge>
              </div>

              <div className="divide-y">
                {group.useCases.filter((uc: any) => selectedUseCases.has(uc.id)).map((uc: any) => {
                  const variants = (uc.automation_variants || []).filter((v: any) => selectedVariants.has(v.id)).sort((a: any, b: any) => a.variant_number - b.variant_number);
                  const hasPdd = pddSet.has(uc.id);
                  const pddId = pdds.find((p: any) => p.use_case_id === uc.id)?.id;

                  return (
                    <div key={uc.id} className="px-4 py-3 pl-8">
                      {/* Use Case row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{uc.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{uc.description}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ImpactBadge impact={uc.impact} />
                          <Badge variant="outline" className="text-[10px] capitalize">{uc.complexity || "—"}</Badge>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Discovery
                          </Button>
                          {hasPdd && pddId && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-700" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                              <FileText className="h-3 w-3 mr-1" /> PDD
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Selected variants */}
                      {variants.length > 0 && (
                        <div className="mt-2 space-y-1 ml-4">
                          {variants.map((v: any) => (
                            <div key={v.id} className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs bg-green-500/5 border border-green-500/10">
                              {v.recommended && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                              <span className="font-medium truncate flex-1">{v.variant_name}</span>
                              <span className="text-muted-foreground capitalize">{v.complexity || "—"}</span>
                              {v.estimated_cost && <span className="text-muted-foreground">· {v.estimated_cost}</span>}
                              {v.estimated_timeline && (
                                <span className="text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" /> {v.estimated_timeline}
                                </span>
                              )}
                              {(v.tools_suggested || []).length > 0 && (
                                <div className="flex gap-1 ml-1">
                                  {v.tools_suggested.slice(0, 3).map((t: string) => (
                                    <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1.5">{t}</Badge>
                                  ))}
                                  {v.tools_suggested.length > 3 && (
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">+{v.tools_suggested.length - 3}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
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

      {/* Sticky Action Bar */}
      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">
                {selectedUseCases.size} cas d'usage · {selectedVariants.size} variantes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
              </Button>
              <Button size="sm" className="shadow-sm" onClick={exportPDF}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Valider pour développement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Non-selection export buttons (top-right area when nothing selected) */}
      {!hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t">
          <div className="max-w-7xl mx-auto flex items-center justify-end px-6 py-2.5 gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exporter CSV
            </Button>
            <Button size="sm" className="shadow-sm" onClick={exportPDF}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Exporter PDF
            </Button>
          </div>
        </div>
      )}
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${config?.bgClass} ${config?.textClass}`}>
      {config?.label || impact}
    </span>
  );
};

export default AutomationBacklogReport;
