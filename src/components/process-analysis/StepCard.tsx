import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit2, Trash2, ChevronUp, ChevronDown, ImageIcon, ChevronRight, Monitor } from "lucide-react";
import type { ProcessStep, StepSource, StepAction } from "./types";

interface StepCardProps {
  step: ProcessStep;
  index: number;
  total: number;
  onEdit: (step: ProcessStep) => void;
  onDelete: (stepId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  hideActions?: boolean;
  screenshotUrl?: string;
  onScreenshotPageClick?: (page: number) => void;
}

const decisionLabels: Record<string, string> = {
  manual_judgment: "Manual Judgment",
  rule_based: "Rule-Based",
  no_decision: "No Decision",
};

const sourceConfig: Record<StepSource, { label: string; className: string }> = {
  event_log: { label: "Event Log", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  knowledge_base: { label: "KB", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  manual: { label: "Manual", className: "bg-muted text-muted-foreground" },
  merged: { label: "Merged", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

export const StepCard = ({ step, index, total, onEdit, onDelete, onMoveUp, onMoveDown, hideActions, screenshotUrl, onScreenshotPageClick }: StepCardProps) => {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);
  const imgUrl = screenshotUrl || step.screenshotUrl;
  const actions = step.actions || [];

  return (
    <>
      <Card className="border-l-4 border-l-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="font-mono text-xs text-muted-foreground mt-1 w-6 shrink-0">{index + 1}.</span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{step.name}</div>
                  {imgUrl && (
                    <button
                      onClick={() => setShowScreenshot(true)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <ImageIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{step.description}</div>

                {/* Screenshot thumbnail */}
                {imgUrl && (
                  <div
                    className="mt-1 cursor-pointer rounded overflow-hidden border w-24 h-16 bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all"
                    onClick={() => setShowScreenshot(true)}
                  >
                    <img src={imgUrl} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {step.source && step.source !== "manual" && sourceConfig[step.source as StepSource] && (
                    <Badge className={`text-[10px] border-0 ${sourceConfig[step.source as StepSource].className}`}>
                      {sourceConfig[step.source as StepSource].label}
                    </Badge>
                  )}
                  {step.role && <Badge variant="secondary" className="text-[10px]">{step.role}</Badge>}
                  {step.toolUsed && <Badge variant="outline" className="text-[10px]">{step.toolUsed}</Badge>}
                  {step.decisionType && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {decisionLabels[step.decisionType]}
                    </Badge>
                  )}
                  {step.frequency && <Badge variant="outline" className="text-[10px]">{step.frequency}</Badge>}
                </div>
                {step.painPoints && (
                  <p className="text-[11px] text-destructive/80 mt-1">⚠ {step.painPoints}</p>
                )}
                {step.businessRules && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">📋 {step.businessRules}</p>
                )}

                {/* Collapsible Actions */}
                {actions.length > 0 && (
                  <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-primary/5 hover:bg-primary/10 border border-primary/15 transition-colors">
                        <ChevronRight className={`h-3 w-3 text-primary transition-transform ${actionsOpen ? "rotate-90" : ""}`} />
                        <span className="text-[11px] font-semibold text-primary">{actions.length}</span>
                        <span className="text-[11px] font-medium text-foreground/80">action{actions.length > 1 ? "s" : ""}</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-1 space-y-1.5 border-l-2 border-primary/20 pl-3 py-1.5 bg-muted/30 rounded-r-md">
                        {actions.map((action, aIdx) => (
                          <ActionItem
                            key={action.id || aIdx}
                            action={action}
                            index={aIdx}
                            onScreenshotPageClick={onScreenshotPageClick}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
            {!hideActions && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMoveUp(index)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMoveDown(index)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(step)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(step.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full-size screenshot modal */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-4xl p-2">
          {imgUrl && <img src={imgUrl} alt="Screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </>
  );
};

const ActionItem = ({ action, index, onScreenshotPageClick }: { action: StepAction; index: number; onScreenshotPageClick?: (page: number) => void }) => (
  <div className="flex items-start gap-2 text-[11px]">
    <span className="font-mono text-muted-foreground mt-0.5 w-4 shrink-0">{index + 1}.</span>
    <div className="flex-1 min-w-0">
      <span className="text-foreground">{action.description}</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        {action.systemUsed && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
            <Monitor className="h-2.5 w-2.5 mr-0.5" />
            {action.systemUsed}
          </Badge>
        )}
        {action.screenshotPage != null && (
          <button
            onClick={() => onScreenshotPageClick?.(action.screenshotPage!)}
            className="flex items-center gap-0.5 text-[9px] text-primary hover:underline"
          >
            <ImageIcon className="h-2.5 w-2.5" />
            p.{action.screenshotPage}
          </button>
        )}
      </div>
    </div>
  </div>
);
