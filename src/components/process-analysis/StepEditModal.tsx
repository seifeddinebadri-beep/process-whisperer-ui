import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProcessStep } from "@/data/mockData";
import { useLang } from "@/lib/i18n";

interface StepEditModalProps {
  step: ProcessStep | null;
  open: boolean;
  onClose: () => void;
  onSave: (step: ProcessStep) => void;
  title?: string;
}

export const StepEditModal = ({ step, open, onClose, onSave, title }: StepEditModalProps) => {
  const { t } = useLang();
  const [local, setLocal] = useState<ProcessStep | null>(step);

  useEffect(() => {
    setLocal(step);
  }, [step]);

  if (!local) return null;

  const update = (field: keyof ProcessStep, value: any) => {
    setLocal({ ...local, [field]: value });
  };

  const modalTitle = title || t.stepModal.editTitle;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{t.stepModal.description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>{t.stepModal.stepName}</Label>
            <Input value={local.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>{t.stepModal.stepDesc}</Label>
            <Textarea value={local.description} onChange={(e) => update("description", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>{t.stepModal.role}</Label>
            <Input value={local.role} onChange={(e) => update("role", e.target.value)} placeholder={t.stepModal.rolePlaceholder} />
          </div>
          <div>
            <Label>{t.stepModal.tool}</Label>
            <Input value={local.toolUsed} onChange={(e) => update("toolUsed", e.target.value)} placeholder={t.stepModal.toolPlaceholder} />
          </div>
          <div>
            <Label>{t.stepModal.decisionType}</Label>
            <Select value={local.decisionType || ""} onValueChange={(v) => update("decisionType", v || undefined)}>
              <SelectTrigger><SelectValue placeholder={t.stepModal.selectDecision} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_judgment">{t.stepModal.manualJudgment}</SelectItem>
                <SelectItem value="rule_based">{t.stepModal.ruleBased}</SelectItem>
                <SelectItem value="no_decision">{t.stepModal.noDecision}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.stepModal.frequency}</Label>
            <Input value={local.frequency || ""} onChange={(e) => update("frequency", e.target.value)} placeholder={t.stepModal.frequencyPlaceholder} />
          </div>
          <div>
            <Label>{t.stepModal.volumeEstimate}</Label>
            <Input value={local.volumeEstimate || ""} onChange={(e) => update("volumeEstimate", e.target.value)} placeholder={t.stepModal.volumePlaceholder} />
          </div>
          <div>
            <Label>{t.stepModal.dataInputs}</Label>
            <Input
              value={(local.dataInputs || []).join(", ")}
              onChange={(e) => update("dataInputs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder={t.stepModal.dataInputsPlaceholder}
            />
          </div>
          <div className="col-span-2">
            <Label>{t.stepModal.dataOutputs}</Label>
            <Input
              value={(local.dataOutputs || []).join(", ")}
              onChange={(e) => update("dataOutputs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder={t.stepModal.dataOutputsPlaceholder}
            />
          </div>
          <div className="col-span-2">
            <Label>{t.stepModal.painPoints}</Label>
            <Textarea value={local.painPoints || ""} onChange={(e) => update("painPoints", e.target.value)} rows={2} placeholder={t.stepModal.painPointsPlaceholder} />
          </div>
          <div className="col-span-2">
            <Label>{t.stepModal.businessRules}</Label>
            <Textarea value={local.businessRules || ""} onChange={(e) => update("businessRules", e.target.value)} rows={2} placeholder={t.stepModal.businessRulesPlaceholder} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.stepModal.cancel}</Button>
          <Button onClick={() => onSave(local)}>{t.stepModal.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
