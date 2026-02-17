import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcessContext } from "@/data/mockData";

interface ProcessContextCardProps {
  context: ProcessContext;
  onChange: (context: ProcessContext) => void;
}

export const ProcessContextCard = ({ context, onChange }: ProcessContextCardProps) => {
  const update = (field: keyof ProcessContext, value: string) => {
    onChange({ ...context, [field]: value });
  };

  const fields: { key: keyof ProcessContext; label: string; placeholder: string }[] = [
    { key: "processObjective", label: "Process Objective", placeholder: "What is this process supposed to achieve?" },
    { key: "knownConstraints", label: "Known Constraints", placeholder: "Compliance rules, SLAs, regulatory requirements..." },
    { key: "assumptions", label: "Assumptions", placeholder: "Any assumptions about how the process works..." },
    { key: "painPointsSummary", label: "Pain Points Summary", placeholder: "Overall process-level issues and bottlenecks..." },
    { key: "volumeAndFrequency", label: "Volume & Frequency", placeholder: "How often does this process run? How many executions?" },
    { key: "stakeholderNotes", label: "Stakeholder Notes", placeholder: "Additional analyst observations and notes..." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Process-Level Context</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className={key === "stakeholderNotes" ? "col-span-2" : ""}>
            <Label className="text-xs">{label}</Label>
            <Textarea
              value={context[key] || ""}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
