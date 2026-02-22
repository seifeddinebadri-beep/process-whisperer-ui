import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessContext } from "./types";
import { useLang } from "@/lib/i18n";

interface ProcessContextCardProps {
  context: ProcessContext;
  onChange: (context: ProcessContext) => void;
}

export const ProcessContextCard = ({ context, onChange }: ProcessContextCardProps) => {
  const { t } = useLang();
  const [local, setLocal] = useState<ProcessContext>(context);

  useEffect(() => {
    setLocal(context);
  }, [context]);

  const update = (field: keyof ProcessContext, value: string) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
  };

  const save = () => {
    onChange(local);
  };

  const fields: { key: keyof ProcessContext; label: string; placeholder: string }[] = [
    { key: "processObjective", label: t.contextCard.processObjective, placeholder: t.contextCard.processObjectivePlaceholder },
    { key: "knownConstraints", label: t.contextCard.knownConstraints, placeholder: t.contextCard.knownConstraintsPlaceholder },
    { key: "assumptions", label: t.contextCard.assumptions, placeholder: t.contextCard.assumptionsPlaceholder },
    { key: "painPointsSummary", label: t.contextCard.painPointsSummary, placeholder: t.contextCard.painPointsSummaryPlaceholder },
    { key: "volumeAndFrequency", label: t.contextCard.volumeAndFrequency, placeholder: t.contextCard.volumeAndFrequencyPlaceholder },
    { key: "stakeholderNotes", label: t.contextCard.stakeholderNotes, placeholder: t.contextCard.stakeholderNotesPlaceholder },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.contextCard.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className={key === "stakeholderNotes" ? "col-span-2" : ""}>
            <Label className="text-xs">{label}</Label>
            <Textarea
              value={(local[key] as string) || ""}
              onChange={(e) => update(key, e.target.value)}
              onBlur={save}
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
