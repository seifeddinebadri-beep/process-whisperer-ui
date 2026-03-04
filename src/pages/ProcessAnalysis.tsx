import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, Loader2, Bot, GitCompare, Rocket, Brain, AlertTriangle } from "lucide-react";
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
import type { ProcessStep, ProcessContext } from "@/components/process-analysis/types";
import { mockEventLogSteps, mockKBSteps } from "@/data/mockComparisonSteps";
import { BpmnFlowView } from "@/components/process-analysis/BpmnFlowView";
import { mockProcessSteps, mockProcessContext } from "@/data/mockProcessAnalysisData";
import { AgentDiscoveryModal } from "@/components/agents/AgentDiscoveryModal";
import { AgentMessage } from "@/components/agents/AgentMessage";
import type { AgentLogEntry } from "@/components/agents/AgentActivityLog";

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
      return data.map((s): ProcessStep => ({
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

  // Use mock data as fallback when DB steps are empty
  const displaySteps = steps.length > 0 ? steps : mockProcessSteps;
  const displayContext = context || mockProcessContext;

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
            <CardTitle className="text-base">{t.analysis.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSteps ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {displaySteps.map((step, i) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={i}
                    total={displaySteps.length}
                    onEdit={setEditingStep}
                    onDelete={handleDeleteStep}
                    onMoveUp={(idx) => handleMoveStep(idx, -1)}
                    onMoveDown={(idx) => handleMoveStep(idx, 1)}
                  />
                ))}
                <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4 mr-1" /> {t.analysis.addStep}
                </Button>

                {/* Roles & Tools */}
                <div className="flex flex-wrap gap-6 pt-3 border-t">
                  <EditableBadges label={t.analysis.roles} items={roles} onChange={() => {}} variant="secondary" />
                  <EditableBadges label={t.analysis.tools} items={tools} onChange={() => {}} variant="outline" />
                </div>
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t.analysis.approveBar}</p>
            <p className="text-xs text-muted-foreground">{t.analysis.approveSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
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
