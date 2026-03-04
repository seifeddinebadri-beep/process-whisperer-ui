import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, Bot, Search, Briefcase, CheckCircle2, Loader2, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/lib/i18n";

type PhaseStatus = "pending" | "working" | "done" | "error";

interface Phase {
  key: string;
  action: string;
  label: string;
  labelEn: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  status: PhaseStatus;
  message?: string;
}

interface AgentOrchestratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  onComplete?: () => void;
}

export function AgentOrchestratorModal({ open, onOpenChange, processId, onComplete }: AgentOrchestratorModalProps) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [phases, setPhases] = useState<Phase[]>(getInitialPhases());
  const [logs, setLogs] = useState<{ message: string; timestamp: string; status: string }[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function getInitialPhases(): Phase[] {
    return [
      { key: "analyst", action: "phase_analyst", label: "Analyste", labelEn: "Analyst", icon: Brain, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", status: "pending" },
      { key: "clarifier", action: "phase_clarifier", label: "Clarificateur", labelEn: "Clarifier", icon: Bot, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30", status: "pending" },
      { key: "discoverer", action: "phase_discoverer", label: "Découvreur", labelEn: "Discoverer", icon: Search, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", status: "pending" },
      { key: "ba", action: "phase_ba", label: "Business Analyst", labelEn: "Business Analyst", icon: Briefcase, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", status: "pending" },
    ];
  }

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhases(getInitialPhases());
      setLogs([]);
      setIsDone(false);
      setHasError(false);
      setSummary(null);
    }
  }, [open]);

  // Poll agent_logs
  useEffect(() => {
    if (!open || !processId) return;

    const poll = async () => {
      const { data } = await supabase
        .from("agent_logs")
        .select("action, status, message, created_at, metadata")
        .eq("process_id", processId)
        .eq("agent_name", "orchestrator")
        .order("created_at", { ascending: true });

      if (!data) return;

      const newLogs = data.map((d: any) => ({
        message: d.message || "",
        timestamp: d.created_at,
        status: d.status,
      }));
      setLogs(newLogs);

      // Update phase statuses
      setPhases((prev) =>
        prev.map((phase) => {
          const phaseLogs = data.filter((d: any) => d.action === phase.action);
          if (phaseLogs.length === 0) return { ...phase, status: "pending" as PhaseStatus };
          const last = phaseLogs[phaseLogs.length - 1];
          const status: PhaseStatus = last.status === "completed" ? "done" : last.status === "error" ? "error" : "working";
          return { ...phase, status, message: last.message };
        })
      );

      // Check orchestrate completion
      const orchestrateLogs = data.filter((d: any) => d.action === "orchestrate");
      const completedLog = orchestrateLogs.find((d: any) => d.status === "completed");
      const errorLog = orchestrateLogs.find((d: any) => d.status === "error");

      if (completedLog) {
        setIsDone(true);
        setSummary((completedLog as any).metadata);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
      if (errorLog) {
        setHasError(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, processId]);

  // Auto-scroll logs
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const progress = (() => {
    const doneCount = phases.filter((p) => p.status === "done").length;
    const workingCount = phases.filter((p) => p.status === "working").length;
    return ((doneCount + workingCount * 0.5) / phases.length) * 100;
  })();

  const statusIcon = (status: PhaseStatus) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "working": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (isDone || hasError) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {lang === "fr" ? "Pipeline d'Analyse Complète" : "Full Analysis Pipeline"}
          </DialogTitle>
          <DialogDescription>
            {lang === "fr"
              ? "Exécution séquentielle des 4 agents d'analyse."
              : "Sequential execution of all 4 analysis agents."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Stepper */}
        <div className="grid grid-cols-4 gap-2 py-2">
          {phases.map((phase, i) => (
            <div
              key={phase.key}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors",
                phase.status === "working" && "bg-primary/5 ring-1 ring-primary/20",
                phase.status === "done" && "bg-green-50 dark:bg-green-950/20",
                phase.status === "error" && "bg-destructive/5",
              )}
            >
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", phase.bgColor)}>
                <phase.icon className={cn("h-4.5 w-4.5", phase.color)} />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">
                {lang === "fr" ? phase.label : phase.labelEn}
              </span>
              {statusIcon(phase.status)}
            </div>
          ))}
        </div>

        {/* Log feed */}
        <ScrollArea className="flex-1 min-h-[180px] max-h-[300px] border rounded-md p-3">
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={cn(
                  log.status === "error" ? "text-destructive" : log.status === "completed" ? "text-green-700 dark:text-green-400" : "text-foreground"
                )}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Summary */}
        {isDone && summary && (
          <div className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/10 space-y-3">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {lang === "fr" ? "Pipeline terminé avec succès" : "Pipeline completed successfully"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{summary.steps_extracted || 0} {lang === "fr" ? "étapes" : "steps"}</Badge>
              <Badge variant="secondary">{summary.questions_answered || 0} {lang === "fr" ? "questions" : "questions"}</Badge>
              <Badge variant="secondary">{summary.use_cases_found || 0} {lang === "fr" ? "cas d'usage" : "use cases"}</Badge>
              <Badge variant="secondary">{summary.pdds_generated || 0} PDDs</Badge>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onComplete?.(); }}>
                {lang === "fr" ? "Voir l'analyse" : "View Analysis"}
              </Button>
              <Button size="sm" onClick={() => { onOpenChange(false); navigate("/automation-discovery"); }}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                {lang === "fr" ? "Découverte" : "Discovery"}
              </Button>
            </div>
          </div>
        )}

        {hasError && !isDone && (
          <div className="border rounded-lg p-4 bg-destructive/5 space-y-2">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {lang === "fr" ? "Le pipeline a rencontré une erreur" : "Pipeline encountered an error"}
            </p>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              {lang === "fr" ? "Fermer" : "Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
