import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProcessStep } from "@/data/mockData";

interface StepEditModalProps {
  step: ProcessStep | null;
  open: boolean;
  onClose: () => void;
  onSave: (step: ProcessStep) => void;
  title?: string;
}

export const StepEditModal = ({ step, open, onClose, onSave, title = "Edit Step" }: StepEditModalProps) => {
  const [local, setLocal] = useState<ProcessStep | null>(step);

  useEffect(() => {
    setLocal(step);
  }, [step]);

  if (!local) return null;

  const update = (field: keyof ProcessStep, value: any) => {
    setLocal({ ...local, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enrich this step with details that drive accurate automation discovery.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Step Name</Label>
            <Input value={local.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={local.description} onChange={(e) => update("description", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={local.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. AP Clerk" />
          </div>
          <div>
            <Label>Tool Used</Label>
            <Input value={local.toolUsed} onChange={(e) => update("toolUsed", e.target.value)} placeholder="e.g. SAP ERP" />
          </div>
          <div>
            <Label>Decision Type</Label>
            <Select value={local.decisionType || ""} onValueChange={(v) => update("decisionType", v || undefined)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_judgment">Manual Judgment</SelectItem>
                <SelectItem value="rule_based">Rule-Based</SelectItem>
                <SelectItem value="no_decision">No Decision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequency</Label>
            <Input value={local.frequency || ""} onChange={(e) => update("frequency", e.target.value)} placeholder="e.g. Per invoice, Daily" />
          </div>
          <div>
            <Label>Volume Estimate</Label>
            <Input value={local.volumeEstimate || ""} onChange={(e) => update("volumeEstimate", e.target.value)} placeholder="e.g. ~200/month" />
          </div>
          <div>
            <Label>Data Inputs (comma-separated)</Label>
            <Input
              value={(local.dataInputs || []).join(", ")}
              onChange={(e) => update("dataInputs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. Invoice PDF, PO number"
            />
          </div>
          <div className="col-span-2">
            <Label>Data Outputs (comma-separated)</Label>
            <Input
              value={(local.dataOutputs || []).join(", ")}
              onChange={(e) => update("dataOutputs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. SAP record, Validation flag"
            />
          </div>
          <div className="col-span-2">
            <Label>Pain Points / Bottlenecks</Label>
            <Textarea value={local.painPoints || ""} onChange={(e) => update("painPoints", e.target.value)} rows={2} placeholder="e.g. Takes 2 hours on average, Frequent data entry errors" />
          </div>
          <div className="col-span-2">
            <Label>Business Rules</Label>
            <Textarea value={local.businessRules || ""} onChange={(e) => update("businessRules", e.target.value)} rows={2} placeholder="e.g. If amount > $5,000, escalate to manager" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(local)}>Save Step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
