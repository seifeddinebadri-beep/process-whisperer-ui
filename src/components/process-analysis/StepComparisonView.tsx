import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, GitMerge, CheckCheck } from "lucide-react";
import { StepCard } from "./StepCard";
import { useLang } from "@/lib/i18n";
import type { ProcessStep } from "./types";

interface StepComparisonViewProps {
  eventLogSteps: ProcessStep[];
  kbSteps: ProcessStep[];
  onMergeComplete: (mergedSteps: ProcessStep[]) => void;
}

type StepDecision = "accepted" | "skipped" | null;

export const StepComparisonView = ({ eventLogSteps, kbSteps, onMergeComplete }: StepComparisonViewProps) => {
  const { t } = useLang();
  const [elDecisions, setElDecisions] = useState<Record<string, StepDecision>>({});
  const [kbDecisions, setKbDecisions] = useState<Record<string, StepDecision>>({});

  const setDecision = (side: "el" | "kb", stepId: string, decision: StepDecision) => {
    if (side === "el") {
      setElDecisions((prev) => ({ ...prev, [stepId]: decision }));
    } else {
      setKbDecisions((prev) => ({ ...prev, [stepId]: decision }));
    }
  };

  const acceptedEL = eventLogSteps.filter((s) => elDecisions[s.id] === "accepted");
  const acceptedKB = kbSteps.filter((s) => kbDecisions[s.id] === "accepted");
  const totalDecisions = Object.values(elDecisions).filter(Boolean).length + Object.values(kbDecisions).filter(Boolean).length;
  const totalSteps = eventLogSteps.length + kbSteps.length;
  const allDecided = totalDecisions === totalSteps;

  const handleAcceptAll = () => {
    const merged: ProcessStep[] = [
      ...acceptedEL.map((s, i) => ({ ...s, source: "merged" as const, stepOrder: i })),
      ...acceptedKB.map((s, i) => ({ ...s, source: "merged" as const, stepOrder: acceptedEL.length + i })),
    ];
    onMergeComplete(merged);
  };

  const noop = () => {};

  const renderColumn = (
    title: string,
    badgeClass: string,
    steps: ProcessStep[],
    decisions: Record<string, StepDecision>,
    side: "el" | "kb"
  ) => (
    <div className="flex-1 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Badge className={`border-0 ${badgeClass}`}>{title}</Badge>
        <span className="text-xs text-muted-foreground">
          {steps.filter((s) => decisions[s.id] === "accepted").length}/{steps.length} {t.comparison?.accepted || "accepted"}
        </span>
      </div>
      {steps.map((step, i) => {
        const decision = decisions[step.id];
        return (
          <div
            key={step.id}
            className={`relative transition-opacity ${decision === "skipped" ? "opacity-40" : ""}`}
          >
            <StepCard
              step={step}
              index={i}
              total={steps.length}
              onEdit={noop}
              onDelete={noop}
              onMoveUp={noop}
              onMoveDown={noop}
              hideActions
            />
            <div className="flex gap-1 mt-1.5">
              <Button
                variant={decision === "accepted" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setDecision(side, step.id, decision === "accepted" ? null : "accepted")}
              >
                <Check className="h-3 w-3 mr-1" />
                {t.comparison?.accept || "Accept"}
              </Button>
              <Button
                variant={decision === "skipped" ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setDecision(side, step.id, decision === "skipped" ? null : "skipped")}
              >
                <X className="h-3 w-3 mr-1" />
                {t.comparison?.skip || "Skip"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitMerge className="h-4 w-4" />
          {t.comparison?.title || "Step Source Comparison"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t.comparison?.subtitle || "Review steps from both sources, accept or skip each one, then merge."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {renderColumn(
            t.comparison?.eventLog || "Event Log",
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
            eventLogSteps,
            elDecisions,
            "el"
          )}
          {renderColumn(
            t.comparison?.knowledgeBase || "Knowledge Base",
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            kbSteps,
            kbDecisions,
            "kb"
          )}
        </div>

        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {acceptedEL.length + acceptedKB.length} {t.comparison?.stepsSelected || "steps selected"} · {totalDecisions}/{totalSteps} {t.comparison?.decided || "decided"}
          </p>
          <Button
            onClick={handleAcceptAll}
            disabled={!allDecided || (acceptedEL.length + acceptedKB.length) === 0}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            {t.comparison?.mergeSelected || "Merge Selected Steps"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
