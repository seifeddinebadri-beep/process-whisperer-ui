import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcessContext } from "@/data/mockData";
import { useLang } from "@/lib/i18n";

interface ProcessContextCardProps {
  context: ProcessContext;
  onChange: (context: ProcessContext) => void;
}

export const ProcessContextCard = ({ context, onChange }: ProcessContextCardProps) => {
  const { t } = useLang();

  const update = (field: keyof ProcessContext, value: string) => {
    onChange({ ...context, [field]: value });
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
