import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle2, Send, Sparkles, Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  type ClarificationQuestion,
  type ClarificationCategory,
  categoryLabels,
  categoryColors,
  mockClarificationQuestions,
} from "@/data/mockClarificationData";
import type { ProcessContext } from "./types";

interface ClarificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  onApplyToContext: (updates: Partial<ProcessContext>) => void;
}

export function ClarificationPanel({
  open,
  onOpenChange,
  processId,
  onApplyToContext,
}: ClarificationPanelProps) {
  const { lang, t } = useLang();
  const [questions, setQuestions] = useState<ClarificationQuestion[]>(
    mockClarificationQuestions.map((q) => ({ ...q, answer: "" }))
  );
  const [isApplying, setIsApplying] = useState(false);

  const answeredCount = useMemo(
    () => questions.filter((q) => q.answer && q.answer.trim().length > 0).length,
    [questions]
  );

  const handleAnswerChange = (id: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer: value } : q))
    );
  };

  const handleApplyToContext = () => {
    setIsApplying(true);

    // Group answers by category and merge into context fields
    const answered = questions.filter((q) => q.answer?.trim());
    const grouped: Record<string, string[]> = {};
    for (const q of answered) {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(`Q: ${q.question}\nA: ${q.answer}`);
    }

    const updates: Partial<ProcessContext> = {};

    // Map categories to context fields
    if (grouped.volume_detail) {
      updates.volumeAndFrequency = grouped.volume_detail.join("\n\n");
    }
    if (grouped.business_rule) {
      updates.knownConstraints = grouped.business_rule.join("\n\n");
    }
    if (grouped.exception_handling || grouped.missing_context) {
      const parts = [
        ...(grouped.exception_handling || []),
        ...(grouped.missing_context || []),
      ];
      updates.painPointsSummary = parts.join("\n\n");
    }
    if (grouped.ambiguity) {
      updates.assumptions = grouped.ambiguity.join("\n\n");
    }
    if (grouped.stakeholder) {
      updates.stakeholderNotes = grouped.stakeholder.join("\n\n");
    }

    onApplyToContext(updates);

    setTimeout(() => {
      setIsApplying(false);
      onOpenChange(false);
    }, 600);
  };

  const getCategoryLabel = (cat: ClarificationCategory) =>
    lang === "fr" ? categoryLabels[cat].fr : categoryLabels[cat].en;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">{t.clarification.title}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.clarification.subtitle}
              </p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {questions.map((q, i) => {
              const isAnswered = q.answer && q.answer.trim().length > 0;
              return (
                <div key={q.id} className="space-y-2">
                  {/* Agent question bubble */}
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          Agent #{i + 1}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${categoryColors[q.category]}`}
                        >
                          {getCategoryLabel(q.category)}
                        </Badge>
                        {isAnswered && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{q.question}</p>
                      <p className="text-xs text-muted-foreground italic">
                        💡 {q.why}
                      </p>
                    </div>
                  </div>

                  {/* User answer */}
                  <div className="ml-9">
                    <Textarea
                      value={q.answer || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={t.clarification.answerPlaceholder}
                      className="min-h-[60px] text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Bottom action bar */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t.clarification.applyHint}
          </p>
          <Button
            onClick={handleApplyToContext}
            disabled={answeredCount === 0 || isApplying}
            size="sm"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {t.clarification.apply}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
