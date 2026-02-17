import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { ProcessStep } from "@/data/mockData";

interface StepCardProps {
  step: ProcessStep;
  index: number;
  total: number;
  onEdit: (step: ProcessStep) => void;
  onDelete: (stepId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const decisionLabels: Record<string, string> = {
  manual_judgment: "Manual Judgment",
  rule_based: "Rule-Based",
  no_decision: "No Decision",
};

export const StepCard = ({ step, index, total, onEdit, onDelete, onMoveUp, onMoveDown }: StepCardProps) => (
  <Card className="border-l-4 border-l-primary/30">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="font-mono text-xs text-muted-foreground mt-1 w-6 shrink-0">{index + 1}.</span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-medium text-sm">{step.name}</div>
            <div className="text-xs text-muted-foreground">{step.description}</div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="text-[10px]">{step.role}</Badge>
              <Badge variant="outline" className="text-[10px]">{step.toolUsed}</Badge>
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
          </div>
        </div>
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
      </div>
    </CardContent>
  </Card>
);
