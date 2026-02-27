import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, Send, Sparkles, Loader2, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  const totalSteps = questions.length;
  const currentQ = questions[currentStep];

  const answeredCount = useMemo(
    () => questions.filter((q) => q.answer && q.answer.trim().length > 0).length,
    [questions]
  );

  const isCurrentAnswered = currentQ?.answer && currentQ.answer.trim().length > 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleAnswerChange = (value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === currentStep ? { ...q, answer: value } : q))
    );
  };

  const handleNext = () => {
    if (!isLastStep) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    if (!isLastStep) setCurrentStep((s) => s + 1);
  };

  const handleApplyToContext = () => {
    setIsApplying(true);
    const answered = questions.filter((q) => q.answer?.trim());
    const grouped: Record<string, string[]> = {};
    for (const q of answered) {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(`Q: ${q.question}\nA: ${q.answer}`);
    }

    const updates: Partial<ProcessContext> = {};
    if (grouped.volume_detail) updates.volumeAndFrequency = grouped.volume_detail.join("\n\n");
    if (grouped.business_rule) updates.knownConstraints = grouped.business_rule.join("\n\n");
    if (grouped.exception_handling || grouped.missing_context) {
      updates.painPointsSummary = [
        ...(grouped.exception_handling || []),
        ...(grouped.missing_context || []),
      ].join("\n\n");
    }
    if (grouped.ambiguity) updates.assumptions = grouped.ambiguity.join("\n\n");
    if (grouped.stakeholder) updates.stakeholderNotes = grouped.stakeholder.join("\n\n");

    onApplyToContext(updates);
    setTimeout(() => {
      setIsApplying(false);
      onOpenChange(false);
      setCurrentStep(0);
    }, 600);
  };

  const getCategoryLabel = (cat: ClarificationCategory) =>
    lang === "fr" ? categoryLabels[cat].fr : categoryLabels[cat].en;

  if (!currentQ) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
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

          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {questions.map((q, i) => {
              const answered = q.answer && q.answer.trim().length > 0;
              const isCurrent = i === currentStep;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "bg-primary scale-y-150"
                      : answered
                      ? "bg-primary/40"
                      : "bg-muted"
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {lang === "fr" ? "Question" : "Question"} {currentStep + 1}/{totalSteps}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredCount} {lang === "fr" ? "répondue(s)" : "answered"}
            </span>
          </div>
        </SheetHeader>

        {/* Current question - fills available space */}
        <div className="flex-1 flex flex-col px-6 py-6 overflow-auto">
          <div className="flex-1 flex flex-col gap-5">
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`text-xs px-2 py-0.5 ${categoryColors[currentQ.category]}`}
              >
                {getCategoryLabel(currentQ.category)}
              </Badge>
              {isCurrentAnswered && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>

            {/* Agent question */}
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium leading-relaxed">{currentQ.question}</p>
                <p className="text-xs text-muted-foreground italic">💡 {currentQ.why}</p>
              </div>
            </div>

            {/* Answer area */}
            <div className="mt-auto">
              <Textarea
                value={currentQ.answer || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={t.clarification.answerPlaceholder}
                className="min-h-[120px] text-sm resize-none"
                rows={4}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Navigation footer */}
        <div className="border-t px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Précédent" : "Previous"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isLastStep}
              className="text-muted-foreground"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              {lang === "fr" ? "Passer" : "Skip"}
            </Button>

            {isLastStep ? (
              <Button
                size="sm"
                onClick={handleApplyToContext}
                disabled={answeredCount === 0 || isApplying}
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {t.clarification.apply}
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext}>
                {lang === "fr" ? "Suivant" : "Next"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Quick summary of answered */}
          <p className="text-[11px] text-center text-muted-foreground">
            {t.clarification.applyHint}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
