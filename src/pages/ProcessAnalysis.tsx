import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, Loader2, Bot, GitCompare, Rocket, Brain, AlertTriangle, Play, Trash2, Search, X, Filter, ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { StepCard } from "@/components/process-analysis/StepCard";
import { StepEditModal } from "@/components/process-analysis/StepEditModal";
import { ProcessContextCard } from "@/components/process-analysis/ProcessContextCard";
import { EditableBadges } from "@/components/process-analysis/EditableBadges";
import { StepComparisonView } from "@/components/process-analysis/StepComparisonView";
import { useLang } from "@/lib/i18n";
import { ClarificationPanel } from "@/components/process-analysis/ClarificationPanel";
import type { ProcessStep, ProcessContext, ProcessScreenshot, StepAction } from "@/components/process-analysis/types";
import { mockEventLogSteps, mockKBSteps } from "@/data/mockComparisonSteps";
import { BpmnFlowView } from "@/components/process-analysis/BpmnFlowView";
import { ScreenshotGallery } from "@/components/process-analysis/ScreenshotGallery";
// Mock data removed — only real DB data is used
import { AgentDiscoveryModal } from "@/components/agents/AgentDiscoveryModal";
import { AgentOrchestratorModal } from "@/components/agents/AgentOrchestratorModal";
import { AgentMessage } from "@/components/agents/AgentMessage";
import type { AgentLogEntry } from "@/components/agents/AgentActivityLog";
import { Zap } from "lucide-react";

const ProcessAnalysis = () => {
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedProcessId, setSelectedProcessId] = useState("");

  // Fetch processes with status analyzed or approved
  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ["analysis-processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploaded_processes")
        .select("id, file_name, status")
        .in("status", ["analyzed", "approved"])
        .order("upload_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-select first process
  useEffect(() => {
    if (processes.length > 0 && !selectedProcessId) {
      setSelectedProcessId(processes[0].id);
    }
  }, [processes, selectedProcessId]);

  const currentProcess = processes.find((p) => p.id === selectedProcessId);

  // Fetch steps for selected process
  const { data: steps = [], isLoading: loadingSteps } = useQuery({
    queryKey: ["process-steps", selectedProcessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_steps")
        .select("*")
        .eq("process_id", selectedProcessId)
        .order("step_order");
      if (error) throw error;

      // Fetch all step_actions for these steps
      const stepIds = data.map((s: any) => s.id);
      let actionsMap: Record<string, any[]> = {};
      if (stepIds.length > 0) {
        const { data: actions, error: actErr } = await supabase
          .from("step_actions")
          .select("*")
          .in("step_id", stepIds)
          .order("action_order");
        if (!actErr && actions) {
          for (const a of actions) {
            if (!actionsMap[a.step_id]) actionsMap[a.step_id] = [];
            actionsMap[a.step_id].push({
              id: a.id,
              description: a.description,
              systemUsed: a.system_used || undefined,
              screenshotPage: a.screenshot_page ?? undefined,
              actionOrder: a.action_order,
              screenshotUrl: (a as any).screenshot_url || undefined,
            });
          }
        }
      }

      return data.map((s: any): ProcessStep => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        role: s.role || "",
        toolUsed: s.tool_used || "",
        decisionType: s.decision_type as ProcessStep["decisionType"],
        dataInputs: s.data_inputs || [],
        dataOutputs: s.data_outputs || [],
        painPoints: s.pain_points || "",
        businessRules: s.business_rules || "",
        frequency: s.frequency || "",
        volumeEstimate: s.volume_estimate || "",
        stepOrder: s.step_order,
        source: (s as any).source || "manual",
        screenshotUrl: (s as any).screenshot_url || undefined,
        actions: actionsMap[s.id] || [],
      }));
    },
    enabled: !!selectedProcessId,
  });

  // Fetch context for selected process
  const { data: context } = useQuery({
    queryKey: ["process-context", selectedProcessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_context")
        .select("*")
        .eq("process_id", selectedProcessId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        processObjective: data.process_objective || "",
        knownConstraints: data.known_constraints || "",
        assumptions: data.assumptions || "",
        painPointsSummary: data.pain_points_summary || "",
        volumeAndFrequency: data.volume_and_frequency || "",
        stakeholderNotes: data.stakeholder_notes || "",
      } as ProcessContext;
    },
    enabled: !!selectedProcessId,
  });

  // Fetch screenshots for selected process
  const { data: screenshots = [] } = useQuery({
    queryKey: ["process-screenshots", selectedProcessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_screenshots")
        .select("*")
        .eq("process_id", selectedProcessId)
        .order("page_number");
      if (error) throw error;
      return data.map((s: any): ProcessScreenshot => ({
        id: s.id,
        processId: s.process_id,
        filePath: s.file_path,
        pageNumber: s.page_number,
        caption: s.caption,
        createdAt: s.created_at,
      }));
    },
    enabled: !!selectedProcessId,
  });

  const getPublicUrl = (path: string) => {
    // If it's already a web path (starts with / or http), use as-is
    if (path.startsWith("/") || path.startsWith("http")) return path;
    const { data } = supabase.storage.from("process-files").getPublicUrl(path);
    return data.publicUrl;
  };

  // Always use real DB data
  const displaySteps = steps;
  const displayContext = context || { processObjective: "", knownConstraints: "", assumptions: "", painPointsSummary: "", volumeAndFrequency: "", stakeholderNotes: "" };

  // Derive roles and tools from display steps
  const roles = useMemo(() => [...new Set(displaySteps.map((s) => s.role).filter(Boolean))], [displaySteps]);
  const tools = useMemo(() => [...new Set(displaySteps.map((s) => s.toolUsed).filter(Boolean))], [displaySteps]);

  // === Mutations ===

  const updateStepMutation = useMutation({
    mutationFn: async (step: ProcessStep) => {
      const { error } = await supabase
        .from("process_steps")
        .update({
          name: step.name,
          description: step.description,
          role: step.role,
          tool_used: step.toolUsed,
          decision_type: step.decisionType || null,
          data_inputs: step.dataInputs?.length ? step.dataInputs : null,
          data_outputs: step.dataOutputs?.length ? step.dataOutputs : null,
          pain_points: step.painPoints || null,
          business_rules: step.businessRules || null,
          frequency: step.frequency || null,
          volume_estimate: step.volumeEstimate || null,
        })
        .eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: t.analysis.stepUpdated });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (step: ProcessStep) => {
      const { error } = await supabase.from("process_steps").insert({
        process_id: selectedProcessId,
        step_order: steps.length,
        name: step.name,
        description: step.description,
        role: step.role,
        tool_used: step.toolUsed,
        decision_type: step.decisionType || null,
        data_inputs: step.dataInputs?.length ? step.dataInputs : null,
        data_outputs: step.dataOutputs?.length ? step.dataOutputs : null,
        pain_points: step.painPoints || null,
        business_rules: step.businessRules || null,
        frequency: step.frequency || null,
        volume_estimate: step.volumeEstimate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: t.analysis.stepAdded });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from("process_steps").delete().eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: t.analysis.stepRemoved });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const target = index + direction;
      const stepA = steps[index];
      const stepB = steps[target];
      const { error: e1 } = await supabase.from("process_steps").update({ step_order: stepB.stepOrder }).eq("id", stepA.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("process_steps").update({ step_order: stepA.stepOrder }).eq("id", stepB.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
    },
  });

  // === Action CRUD Mutations ===

  const updateActionMutation = useMutation({
    mutationFn: async (action: StepAction) => {
      const { error } = await supabase
        .from("step_actions")
        .update({ description: action.description, system_used: action.systemUsed || null, screenshot_url: action.screenshotUrl || null } as any)
        .eq("id", action.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] }),
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase.from("step_actions").delete().eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] }),
  });

  const addActionMutation = useMutation({
    mutationFn: async (stepId: string) => {
      // Get current max action_order for this step
      const { data: existing } = await supabase
        .from("step_actions")
        .select("action_order")
        .eq("step_id", stepId)
        .order("action_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.action_order ?? -1) + 1;
      const { error } = await supabase.from("step_actions").insert({
        step_id: stepId,
        description: "Nouvelle action",
        action_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] }),
  });

  const uploadScreenshot = async (bucket: string, path: string, file: File): Promise<string> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadStepScreenshot = async (stepId: string, file: File) => {
    try {
      const path = `screenshots/steps/${stepId}/${file.name}`;
      const url = await uploadScreenshot("process-files", path, file);
      await supabase.from("process_steps").update({ screenshot_url: url }).eq("id", stepId);
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: "Screenshot ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteStepScreenshot = async (stepId: string) => {
    try {
      await supabase.from("process_steps").update({ screenshot_url: null }).eq("id", stepId);
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: "Screenshot supprimé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleUploadActionScreenshot = async (actionId: string, file: File) => {
    try {
      const path = `screenshots/actions/${actionId}/${file.name}`;
      const url = await uploadScreenshot("process-files", path, file);
      await supabase.from("step_actions").update({ screenshot_url: url } as any).eq("id", actionId);
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: "Screenshot ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteActionScreenshot = async (actionId: string) => {
    try {
      await supabase.from("step_actions").update({ screenshot_url: null } as any).eq("id", actionId);
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: "Screenshot supprimé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const updateContextMutation = useMutation({
    mutationFn: async (ctx: ProcessContext) => {
      const payload = {
        process_objective: ctx.processObjective || null,
        known_constraints: ctx.knownConstraints || null,
        assumptions: ctx.assumptions || null,
        pain_points_summary: ctx.painPointsSummary || null,
        volume_and_frequency: ctx.volumeAndFrequency || null,
        stakeholder_notes: ctx.stakeholderNotes || null,
      };
      if (ctx.id) {
        const { error } = await supabase.from("process_context").update(payload).eq("id", ctx.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("process_context").insert({ ...payload, process_id: selectedProcessId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-context", selectedProcessId] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("uploaded_processes")
        .update({ status: "approved" })
        .eq("id", selectedProcessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-processes"] });
      toast({ title: t.analysis.processApproved, description: t.analysis.discoveryAvailable });
    },
  });

  // Launch Discovery with agent modal
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState(false);
  const [discoveryEntries, setDiscoveryEntries] = useState<AgentLogEntry[]>([]);

  const addDiscoveryEntry = (entry: Omit<AgentLogEntry, "id" | "timestamp">) => {
    setDiscoveryEntries((prev) => [...prev, { ...entry, id: `d-${Date.now()}-${Math.random()}`, timestamp: new Date() }]);
  };

  const updateLastDiscoveryEntry = (updates: Partial<AgentLogEntry>) => {
    setDiscoveryEntries((prev) => {
      const copy = [...prev];
      if (copy.length > 0) Object.assign(copy[copy.length - 1], updates);
      return copy;
    });
  };

  const launchDiscovery = async () => {
    setDiscoveryLoading(true);
    setDiscoveryEntries([]);
    setDiscoveryModalOpen(true);

    addDiscoveryEntry({ agent: "discoverer", status: "thinking", message: lang === "fr" ? "Analyse du contexte et des étapes du processus..." : "Analyzing process context and steps..." });

    setTimeout(() => {
      addDiscoveryEntry({ agent: "discoverer", status: "working", message: lang === "fr" ? "Croisement avec la base de connaissances..." : "Cross-referencing with knowledge base..." });
    }, 1500);

    setTimeout(() => {
      addDiscoveryEntry({ agent: "discoverer", status: "working", message: lang === "fr" ? "Génération des scénarios d'automatisation..." : "Generating automation scenarios..." });
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-process", {
        body: { process_id: selectedProcessId },
      });
      if (error) throw error;

      addDiscoveryEntry({
        agent: "discoverer", status: "done",
        message: lang === "fr"
          ? `Découverte terminée : ${data?.use_cases_count || 0} cas d'usage avec ${data?.variants_count || 0} variantes identifiés.`
          : `Discovery complete: ${data?.use_cases_count || 0} use cases with ${data?.variants_count || 0} variants identified.`,
      });

      queryClient.invalidateQueries({ queryKey: ["analysis-processes"] });
      queryClient.invalidateQueries({ queryKey: ["overview-usecases-count"] });

      setTimeout(() => {
        setDiscoveryModalOpen(false);
        navigate("/automation-discovery");
      }, 2000);
    } catch (e: any) {
      console.error("analyze-process error:", e);
      addDiscoveryEntry({ agent: "discoverer", status: "error", message: e.message || "Discovery failed" });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Fetch analyst summary from agent_logs
  const { data: analystSummary } = useQuery({
    queryKey: ["analyst-summary", selectedProcessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("message, metadata, created_at")
        .eq("process_id", selectedProcessId)
        .eq("agent_name", "analyst")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    },
    enabled: !!selectedProcessId,
  });

  // Local UI state
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [orchestratorLoading, setOrchestratorLoading] = useState(false);

  // Step filters
  const [stepSearch, setStepSearch] = useState("");
  const [stepRoleFilter, setStepRoleFilter] = useState("all");
  const [stepToolFilter, setStepToolFilter] = useState("all");
  const [stepSourceFilter, setStepSourceFilter] = useState("all");
  const [stepDecisionFilter, setStepDecisionFilter] = useState("all");

  const uniqueSources = useMemo(() => [...new Set(displaySteps.map((s) => s.source).filter(Boolean))], [displaySteps]);
  const uniqueDecisionTypes = useMemo(() => [...new Set(displaySteps.map((s) => s.decisionType).filter(Boolean))], [displaySteps]);

  const filteredSteps = useMemo(() => {
    return displaySteps.filter((s) => {
      if (stepSearch && !s.name.toLowerCase().includes(stepSearch.toLowerCase()) && !s.description.toLowerCase().includes(stepSearch.toLowerCase())) return false;
      if (stepRoleFilter !== "all" && s.role !== stepRoleFilter) return false;
      if (stepToolFilter !== "all" && s.toolUsed !== stepToolFilter) return false;
      if (stepSourceFilter !== "all" && s.source !== stepSourceFilter) return false;
      if (stepDecisionFilter !== "all" && s.decisionType !== stepDecisionFilter) return false;
      return true;
    });
  }, [displaySteps, stepSearch, stepRoleFilter, stepToolFilter, stepSourceFilter, stepDecisionFilter]);

  const stepFilterCount = [stepSearch, stepRoleFilter !== "all", stepToolFilter !== "all", stepSourceFilter !== "all", stepDecisionFilter !== "all"].filter(Boolean).length;
  const clearStepFilters = () => { setStepSearch(""); setStepRoleFilter("all"); setStepToolFilter("all"); setStepSourceFilter("all"); setStepDecisionFilter("all"); };

  const launchOrchestrator = async () => {
    setOrchestratorLoading(true);
    setOrchestratorOpen(true);
    try {
      await supabase.functions.invoke("agent-orchestrator", {
        body: { process_id: selectedProcessId },
      });
    } catch (e: any) {
      console.error("Orchestrator error:", e);
    } finally {
      setOrchestratorLoading(false);
    }
  };

  const handleClarificationApply = (updates: Partial<ProcessContext>) => {
    const merged: ProcessContext = {
      ...context,
      ...Object.fromEntries(
        Object.entries(updates).map(([k, v]) => {
          const existing = (context as any)?.[k];
          return [k, existing ? `${existing}\n\n---\n\n${v}` : v];
        })
      ),
    };
    updateContextMutation.mutate(merged);
    toast({ title: lang === "fr" ? "Contexte enrichi par l'agent IA" : "Context enriched by AI agent" });
  };

  const handleSaveStep = (step: ProcessStep) => {
    updateStepMutation.mutate(step);
    setEditingStep(null);
  };

  const handleAddStep = (step: ProcessStep) => {
    addStepMutation.mutate(step);
    setIsAdding(false);
  };

  const handleDeleteStep = (stepId: string) => {
    deleteStepMutation.mutate(stepId);
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    reorderMutation.mutate({ index, direction });
  };

  const handleContextChange = useCallback(
    (newCtx: ProcessContext) => {
      updateContextMutation.mutate(newCtx);
    },
    [updateContextMutation]
  );

  const newStepTemplate: ProcessStep = {
    id: `s-new-${Date.now()}`,
    name: "",
    description: "",
    role: "",
    toolUsed: "",
  };

  const approved = currentProcess?.status === "approved";

  // Check if steps have no actions at all
  const totalActions = useMemo(() => displaySteps.reduce((sum, s) => sum + (s.actions?.length || 0), 0), [displaySteps]);
  const hasStepsButNoActions = displaySteps.length > 0 && totalActions === 0;

  const [extractingActions, setExtractingActions] = useState(false);
  const extractActionsMutation = useMutation({
    mutationFn: async () => {
      setExtractingActions(true);
      const { data, error } = await supabase.functions.invoke("agent-analyze-as-is", {
        body: { process_id: selectedProcessId, extract_actions_only: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
      toast({ title: lang === "fr" ? `${data?.actions_count || 0} actions extraites` : `${data?.actions_count || 0} actions extracted` });
      setExtractingActions(false);
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      setExtractingActions(false);
    },
  });

  if (loadingProcesses) {
    return (
      <div className="max-w-5xl flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t.analysis.noAnalyzed}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 pb-24">
      {/* Process Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
          <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.file_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {approved && <Badge className="bg-green-100 text-green-800">{t.analysis.approved}</Badge>}
        <Button
          variant={showComparison ? "default" : "outline"}
          onClick={() => setShowComparison(!showComparison)}
          disabled={steps.length === 0}
          size="sm"
        >
          <GitCompare className="h-4 w-4 mr-1" />
          {showComparison ? (t.comparison?.showMerged || "Merged View") : (t.comparison?.showComparison || "Compare Sources")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setClarificationOpen(true)}
          disabled={displaySteps.length === 0}
          className="ml-auto"
        >
          <Bot className="h-4 w-4 mr-1" />
          {t.clarification.openPanel}
        </Button>
      </div>

      {/* Analyst Agent Summary Card */}
      {analystSummary && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Brain className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600 mb-1">Agent Analyst</p>
                <p className="text-sm text-foreground">{analystSummary.message}</p>
                {(analystSummary.metadata as any)?.gaps?.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{(analystSummary.metadata as any).gaps.join(" • ")}</span>
                  </div>
                )}
                {(analystSummary.metadata as any)?.confidence && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {lang === "fr" ? "Confiance" : "Confidence"}: {(analystSummary.metadata as any).confidence}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison View or Normal Steps */}
      {showComparison ? (
        <StepComparisonView
          eventLogSteps={mockEventLogSteps}
          kbSteps={mockKBSteps}
          onMergeComplete={(mergedSteps) => {
            console.log("Merged steps:", mergedSteps);
            setShowComparison(false);
            toast({ title: lang === "fr" ? "Étapes fusionnées avec succès" : "Steps merged successfully" });
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.analysis.title}</CardTitle>
              {stepFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearStepFilters}>
                  <X className="h-3 w-3 mr-1" /> Réinitialiser ({stepFilterCount})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Step Filters */}
            {displaySteps.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Rechercher une étape..." value={stepSearch} onChange={(e) => setStepSearch(e.target.value)} className="pl-8 h-9 text-sm" />
                </div>
                {roles.length > 0 && (
                  <Select value={stepRoleFilter} onValueChange={setStepRoleFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Rôle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {tools.length > 0 && (
                  <Select value={stepToolFilter} onValueChange={setStepToolFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Outil" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les outils</SelectItem>
                      {tools.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {uniqueSources.length > 1 && (
                  <Select value={stepSourceFilter} onValueChange={setStepSourceFilter}>
                    <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toute source</SelectItem>
                      {uniqueSources.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {uniqueDecisionTypes.length > 1 && (
                  <Select value={stepDecisionFilter} onValueChange={setStepDecisionFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Décision" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout type</SelectItem>
                      {uniqueDecisionTypes.map((d) => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {loadingSteps ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filteredSteps.length === 0 && displaySteps.length > 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune étape ne correspond aux filtres</p>
                ) : (
                  filteredSteps.map((step, i) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={i}
                      total={filteredSteps.length}
                      onEdit={setEditingStep}
                      onDelete={handleDeleteStep}
                      onMoveUp={(idx) => handleMoveStep(idx, -1)}
                      onMoveDown={(idx) => handleMoveStep(idx, 1)}
                      hideActions={stepFilterCount > 0}
                      onScreenshotPageClick={(page) => {
                        // Scroll to screenshot gallery or open modal for that page
                        const el = document.getElementById("screenshot-gallery");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                  ))
                )}
                {/* Extract actions banner */}
                {hasStepsButNoActions && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                    <Zap className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lang === "fr" ? "Actions détaillées non extraites" : "Detailed actions not extracted"}</p>
                      <p className="text-xs text-muted-foreground">{lang === "fr" ? "Enrichissez chaque étape avec les actions granulaires du document source." : "Enrich each step with granular actions from the source document."}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => extractActionsMutation.mutate()}
                      disabled={extractingActions}
                    >
                      {extractingActions ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                      {lang === "fr" ? "Extraire les actions" : "Extract actions"}
                    </Button>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4 mr-1" /> {t.analysis.addStep}
                </Button>

                {/* Roles & Tools */}
                <div className="flex flex-wrap gap-6 pt-3 border-t">
                  <EditableBadges label={t.analysis.roles} items={roles} onChange={() => {}} variant="secondary" />
                  <EditableBadges label={t.analysis.tools} items={tools} onChange={() => {}} variant="outline" />
                </div>
                {displaySteps.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{filteredSteps.length} / {displaySteps.length} étapes</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Process-Level Context */}
      <ProcessContextCard context={displayContext} onChange={handleContextChange} />

      {/* BPMN Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.analysis.flowchart}</CardTitle>
        </CardHeader>
        <CardContent>
          <BpmnFlowView steps={displaySteps} />
        </CardContent>
      </Card>

      {/* Screenshots Gallery */}
      {screenshots.length > 0 && (
        <div id="screenshot-gallery">
          <ScreenshotGallery screenshots={screenshots} getPublicUrl={getPublicUrl} />
        </div>
      )}

      {/* Edit Step Modal */}
      <StepEditModal
        step={editingStep}
        open={!!editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleSaveStep}
      />

      {/* Add Step Modal */}
      <StepEditModal
        step={isAdding ? newStepTemplate : null}
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onSave={handleAddStep}
      />

      {/* Clarification Panel */}
      <ClarificationPanel
        open={clarificationOpen}
        onOpenChange={setClarificationOpen}
        processId={selectedProcessId}
        onApplyToContext={handleClarificationApply}
      />

      {/* Discovery Agent Modal */}
      <AgentDiscoveryModal
        open={discoveryModalOpen}
        onOpenChange={setDiscoveryModalOpen}
        entries={discoveryEntries}
      />

      {/* Orchestrator Modal */}
      <AgentOrchestratorModal
        open={orchestratorOpen}
        onOpenChange={setOrchestratorOpen}
        processId={selectedProcessId}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["analysis-processes"] });
          queryClient.invalidateQueries({ queryKey: ["process-steps", selectedProcessId] });
          queryClient.invalidateQueries({ queryKey: ["process-context", selectedProcessId] });
        }}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t.analysis.approveBar}</p>
            <p className="text-xs text-muted-foreground">{t.analysis.approveSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={!selectedProcessId}
              onClick={async () => {
                if (!confirm("Supprimer ce processus et toutes ses données associées ?")) return;
                try {
                  const pid = selectedProcessId;
                  const { data: ucs } = await supabase.from("automation_use_cases").select("id").eq("process_id", pid);
                  if (ucs && ucs.length > 0) {
                    const ucIds = ucs.map((u: any) => u.id);
                    await supabase.from("use_case_details").delete().in("use_case_id", ucIds);
                    await supabase.from("automation_variants").delete().in("use_case_id", ucIds);
                    const { data: convs } = await supabase.from("ba_conversations").select("id").in("use_case_id", ucIds);
                    if (convs && convs.length > 0) {
                      const convIds = convs.map((c: any) => c.id);
                      await supabase.from("ba_messages").delete().in("conversation_id", convIds);
                      await supabase.from("pdd_documents").delete().in("conversation_id", convIds);
                      await supabase.from("ba_conversations").delete().in("id", convIds);
                    }
                    await supabase.from("automation_use_cases").delete().eq("process_id", pid);
                  }
                  await supabase.from("process_steps").delete().eq("process_id", pid);
                  await supabase.from("process_context").delete().eq("process_id", pid);
                  await supabase.from("document_chunks").delete().eq("process_id", pid);
                  await supabase.from("agent_logs").delete().eq("process_id", pid);
                  await supabase.from("uploaded_processes").delete().eq("id", pid);
                  setSelectedProcessId("");
                  queryClient.invalidateQueries({ queryKey: ["analysis-processes"] });
                  queryClient.invalidateQueries({ queryKey: ["uploaded_processes"] });
                  toast({ title: "Processus supprimé" });
                } catch (err: any) {
                  toast({ title: "Erreur", description: err.message, variant: "destructive" });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Supprimer" : "Delete"}
            </Button>
            <Button
              onClick={launchOrchestrator}
              disabled={orchestratorLoading || displaySteps.length === 0}
              variant="outline"
            >
              {orchestratorLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {lang === "fr" ? "Analyse complète" : "Full Analysis"}
            </Button>
            {approved && (
              <Button
                onClick={launchDiscovery}
                disabled={discoveryLoading}
                variant="default"
              >
                {discoveryLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-1" />
                )}
                {lang === "fr" ? "Lancer la découverte" : "Launch Discovery"}
              </Button>
            )}
            <Button
              disabled={displaySteps.length === 0 || approved || approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              {approved ? t.analysis.approved : t.analysis.approve}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessAnalysis;
