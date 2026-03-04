import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, Send, Sparkles, Loader2, ChevronLeft, ChevronRight, SkipForward, PenLine } from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  type ClarificationQuestion,
  type ClarificationCategory,
  categoryLabels,
  categoryColors,
  mockClarificationQuestions,
} from "@/data/mockClarificationData";
import type { ProcessContext } from "./types";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
    mockClarificationQuestions.map((q) => ({ ...q }))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Fetch AI-generated questions when panel opens
  useEffect(() => {
    if (open && processId) {
      setIsLoadingQuestions(true);
      supabase.functions.invoke("generate-clarifications", {
        body: { process_id: processId },
      }).then(({ data, error }) => {
        if (!error && data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions.map((q: any) => ({
            ...q,
            allowOther: true,
            selectedOption: undefined,
            customAnswer: undefined,
          })));
          setCurrentStep(0);
        } else {
          // Fallback to mock questions
          console.warn("Using fallback clarification questions:", error);
          setQuestions(mockClarificationQuestions.map((q) => ({ ...q })));
        }
      }).catch((e) => {
        console.error("generate-clarifications error:", e);
        setQuestions(mockClarificationQuestions.map((q) => ({ ...q })));
      }).finally(() => {
        setIsLoadingQuestions(false);
      });
    }
  }, [open, processId]);

  const totalSteps = questions.length;
  const currentQ = questions[currentStep];

  const isAnswered = (q: ClarificationQuestion) =>
    (q.selectedOption && q.selectedOption !== "__other__") ||
    (q.selectedOption === "__other__" && q.customAnswer?.trim());

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q)).length,
    [questions]
  );

  const currentAnswered = currentQ ? isAnswered(currentQ) : false;
  const isLastStep = currentStep === totalSteps - 1;

  const handleSelectOption = (optionLabel: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === currentStep
          ? { ...q, selectedOption: q.selectedOption === optionLabel ? undefined : optionLabel, customAnswer: optionLabel === "__other__" ? q.customAnswer : undefined }
          : q
      )
    );
  };

  const handleCustomAnswerChange = (value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === currentStep ? { ...q, customAnswer: value } : q
      )
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

  const getAnswerText = (q: ClarificationQuestion): string => {
    if (q.selectedOption === "__other__") return q.customAnswer?.trim() || "";
    return q.selectedOption || "";
  };

  const handleApplyToContext = () => {
    setIsApplying(true);
    const answered = questions.filter((q) => isAnswered(q));
    const grouped: Record<string, string[]> = {};
    for (const q of answered) {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(`Q: ${q.question}\nA: ${getAnswerText(q)}`);
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

  if (isLoadingQuestions) {
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
                <p className="text-xs text-muted-foreground mt-0.5">{t.clarification.subtitle}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {lang === "fr" ? "Génération des questions par l'IA..." : "AI generating questions..."}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!currentQ) return null;

  const isOtherSelected = currentQ.selectedOption === "__other__";

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
              const qAnswered = isAnswered(q);
              const isCurrent = i === currentStep;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "bg-primary scale-y-150"
                      : qAnswered
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
              Question {currentStep + 1}/{totalSteps}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredCount} {lang === "fr" ? "répondue(s)" : "answered"}
            </span>
          </div>
        </SheetHeader>

        {/* Current question */}
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
              {currentAnswered && (
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

            {/* Multi-choice options */}
            <div className="space-y-2 mt-1">
              <p className="text-xs font-medium text-muted-foreground">{t.clarification.selectAnswer}</p>
              {currentQ.options.map((opt) => {
                const isSelected = currentQ.selectedOption === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectOption(opt.label)}
                    className={cn(
                      "w-full text-left rounded-lg border-2 px-4 py-3 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        {opt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Other option */}
              {currentQ.allowOther !== false && (
                <div>
                  <button
                    onClick={() => handleSelectOption("__other__")}
                    className={cn(
                      "w-full text-left rounded-lg border-2 px-4 py-3 transition-all duration-200",
                      isOtherSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isOtherSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isOtherSelected && <PenLine className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <p className="text-sm font-medium">{t.clarification.other}</p>
                    </div>
                  </button>
                  {isOtherSelected && (
                    <Textarea
                      value={currentQ.customAnswer || ""}
                      onChange={(e) => handleCustomAnswerChange(e.target.value)}
                      placeholder={t.clarification.otherPlaceholder}
                      className="mt-2 min-h-[80px] text-sm resize-none"
                      rows={3}
                      autoFocus
                    />
                  )}
                </div>
              )}
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

          <p className="text-[11px] text-center text-muted-foreground">
            {t.clarification.applyHint}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
