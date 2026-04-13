import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users, GitBranch, Clock, Lightbulb, SkipForward, PlusCircle, ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface VariantStep {
  id: string;
  step_name: string;
  step_order: number;
  is_skipped: boolean;
  is_extra: boolean;
  is_reordered: boolean;
  frequency_pct: number | null;
}

interface ProcessVariant {
  id: string;
  variant_label: string;
  consultant_name: string;
  frequency: number;
  avg_duration_minutes: number | null;
  steps_json: string[];
  insights: string[];
  steps?: VariantStep[];
}

interface Props {
  processId: string;
}

// Mock data for demo process
const mockVariants: ProcessVariant[] = [
  {
    id: "mock-v1",
    variant_label: "Variante A",
    consultant_name: "Marie Dupont",
    frequency: 45,
    avg_duration_minutes: 32,
    steps_json: ["Réception facture", "Vérification conformité", "Saisie dans SAP", "Rapprochement BC", "Approbation manager", "Mise en paiement"],
    insights: [
      "Marie suit le processus standard dans 92% des cas — exécution la plus conforme.",
      "Temps moyen de traitement le plus bas (32 min) grâce à une maîtrise avancée de SAP.",
    ],
    steps: [
      { id: "ms1", step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ms2", step_name: "Vérification conformité", step_order: 1, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ms3", step_name: "Saisie dans SAP", step_order: 2, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ms4", step_name: "Rapprochement BC", step_order: 3, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ms5", step_name: "Approbation manager", step_order: 4, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ms6", step_name: "Mise en paiement", step_order: 5, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
    ],
  },
  {
    id: "mock-v2",
    variant_label: "Variante B",
    consultant_name: "Jean Martin",
    frequency: 28,
    avg_duration_minutes: 47,
    steps_json: ["Réception facture", "Saisie dans SAP", "Vérification conformité", "Rapprochement BC", "Relance interne", "Approbation manager", "Mise en paiement"],
    insights: [
      "Jean inverse les étapes 'Vérification conformité' et 'Saisie dans SAP' dans 70% des cas — risque d'erreurs de saisie.",
      "Ajout systématique d'une étape 'Relance interne' non documentée, ajoutant ~15 min au cycle.",
      "Le taux d'erreur de saisie de Jean est 3x supérieur à la moyenne (24% vs 8%).",
    ],
    steps: [
      { id: "js1", step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "js2", step_name: "Saisie dans SAP", step_order: 1, is_skipped: false, is_extra: false, is_reordered: true, frequency_pct: 100 },
      { id: "js3", step_name: "Vérification conformité", step_order: 2, is_skipped: false, is_extra: false, is_reordered: true, frequency_pct: 100 },
      { id: "js4", step_name: "Rapprochement BC", step_order: 3, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "js5", step_name: "Relance interne", step_order: 4, is_skipped: false, is_extra: true, is_reordered: false, frequency_pct: 85 },
      { id: "js6", step_name: "Approbation manager", step_order: 5, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "js7", step_name: "Mise en paiement", step_order: 6, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
    ],
  },
  {
    id: "mock-v3",
    variant_label: "Variante C",
    consultant_name: "Sophie Leclerc",
    frequency: 15,
    avg_duration_minutes: 25,
    steps_json: ["Réception facture", "Vérification conformité", "Saisie dans SAP", "Mise en paiement"],
    insights: [
      "Sophie saute les étapes 'Rapprochement BC' et 'Approbation manager' dans 70% des cas pour les factures < 500€.",
      "Temps de traitement le plus rapide (25 min) mais non-conformité aux règles d'approbation.",
    ],
    steps: [
      { id: "ss1", step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ss2", step_name: "Vérification conformité", step_order: 1, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ss3", step_name: "Saisie dans SAP", step_order: 2, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
      { id: "ss4", step_name: "Rapprochement BC", step_order: 900, is_skipped: true, is_extra: false, is_reordered: false, frequency_pct: 0 },
      { id: "ss5", step_name: "Approbation manager", step_order: 901, is_skipped: true, is_extra: false, is_reordered: false, frequency_pct: 0 },
      { id: "ss6", step_name: "Mise en paiement", step_order: 3, is_skipped: false, is_extra: false, is_reordered: false, frequency_pct: 100 },
    ],
  },
];

export function VariantAnalysisPanel({ processId }: Props) {
  const isMock = processId === "mock-process-1";

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ["process-variants", processId],
    queryFn: async () => {
      if (isMock) return mockVariants;
      const { data, error } = await supabase
        .from("process_variants")
        .select("*")
        .eq("process_id", processId)
        .order("frequency", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      // Fetch steps for each variant
      const variantIds = data.map((v: any) => v.id);
      const { data: allSteps } = await supabase
        .from("variant_steps")
        .select("*")
        .in("variant_id", variantIds)
        .order("step_order");

      return data.map((v: any): ProcessVariant => ({
        id: v.id,
        variant_label: v.variant_label || "",
        consultant_name: v.consultant_name || "",
        frequency: v.frequency || 0,
        avg_duration_minutes: v.avg_duration_minutes,
        steps_json: (v.steps_json as string[]) || [],
        insights: (v.insights as string[]) || [],
        steps: (allSteps || []).filter((s: any) => s.variant_id === v.id).map((s: any) => ({
          id: s.id,
          step_name: s.step_name,
          step_order: s.step_order,
          is_skipped: s.is_skipped,
          is_extra: s.is_extra,
          is_reordered: s.is_reordered,
          frequency_pct: s.frequency_pct,
        })),
      }));
    },
    enabled: !!processId,
  });

  if (isLoading) return null;
  if (variants.length === 0) return null;

  const totalTraces = variants.reduce((sum, v) => sum + v.frequency, 0);
  const uniqueConsultants = new Set(variants.map((v) => v.consultant_name)).size;

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-600" />
          Analyse des Variantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <p className="text-2xl font-bold text-purple-600">{variants.length}</p>
            <p className="text-xs text-muted-foreground">Variantes</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <p className="text-2xl font-bold text-purple-600">{uniqueConsultants}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Consultants</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <p className="text-2xl font-bold text-purple-600">{totalTraces}</p>
            <p className="text-xs text-muted-foreground">Traces</p>
          </div>
        </div>

        {/* Variant cards */}
        {variants.map((v) => (
          <VariantCard key={v.id} variant={v} totalTraces={totalTraces} />
        ))}
      </CardContent>
    </Card>
  );
}

function VariantCard({ variant, totalTraces }: { variant: ProcessVariant; totalTraces: number }) {
  const [open, setOpen] = useState(false);
  const pct = totalTraces > 0 ? Math.round((variant.frequency / totalTraces) * 100) : 0;
  const displaySteps = (variant.steps || [])
    .filter((s) => s.step_order < 900)
    .sort((a, b) => a.step_order - b.step_order);
  const skippedSteps = (variant.steps || []).filter((s) => s.is_skipped);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{variant.variant_label}</span>
              <Badge variant="secondary" className="text-xs">{variant.consultant_name}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{variant.frequency} traces ({pct}%)</span>
              {variant.avg_duration_minutes != null && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(variant.avg_duration_minutes)} min</span>
              )}
              <span>{variant.steps_json.length} étapes</span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          {/* Step list */}
          <div className="space-y-1 mt-2">
            {displaySteps.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                s.is_extra ? "bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500" :
                s.is_reordered ? "bg-orange-50 dark:bg-orange-950/20 border-l-2 border-orange-500" :
                "bg-muted/30"
              }`}>
                {s.is_extra && <PlusCircle className="h-3 w-3 text-blue-500 shrink-0" />}
                {s.is_reordered && <ArrowUpDown className="h-3 w-3 text-orange-500 shrink-0" />}
                <span className="flex-1">{s.step_name}</span>
                {s.frequency_pct != null && s.frequency_pct < 100 && (
                  <span className="text-xs text-muted-foreground">{s.frequency_pct}%</span>
                )}
              </div>
            ))}
            {skippedSteps.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500 line-through text-muted-foreground">
                <SkipForward className="h-3 w-3 text-red-500 shrink-0" />
                <span>{s.step_name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-red-300 text-red-600">Ignorée</Badge>
              </div>
            ))}
          </div>

          {/* Insights */}
          {variant.insights.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Insights</p>
              {variant.insights.map((insight, i) => (
                <p key={i} className="text-xs text-foreground pl-4 border-l-2 border-purple-300">{insight}</p>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
