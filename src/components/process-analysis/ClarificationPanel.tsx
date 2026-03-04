import { useState, useMemo, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, Send, Sparkles, Loader2, PenLine, MessageSquare } from "lucide-react";
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
import { AgentMessage } from "@/components/agents/AgentMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClarificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  onApplyToContext: (updates: Partial<ProcessContext>) => void;
}

interface ConversationEntry {
  type: "agent" | "user" | "question";
  message?: string;
  question?: ClarificationQuestion;
  answer?: string;
  timestamp: Date;
}

export function ClarificationPanel({ open, onOpenChange, processId, onApplyToContext }: ClarificationPanelProps) {
  const { lang, t } = useLang();
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<ClarificationQuestion | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<ClarificationQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<{ question: string; answer: string }[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>();
  const [customAnswer, setCustomAnswer] = useState("");
  const [allDone, setAllDone] = useState(false);

  const fetchQuestions = useCallback(async (history: { question: string; answer: string }[] = []) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-clarify", {
        body: { process_id: processId, conversation_history: history },
      });

      if (!error && data?.questions?.length > 0) {
        // Add agent intro message
        setConversation((prev) => [
          ...prev,
          { type: "agent", message: data.agent_message || data.intro_message, timestamp: new Date() },
        ]);

        const questions = data.questions.map((q: any) => ({
          ...q, allowOther: true, selectedOption: undefined, customAnswer: undefined,
        }));

        setPendingQuestions(questions.slice(1));
        setCurrentQuestion(questions[0]);
        setConversation((prev) => [
          ...prev,
          { type: "question", question: questions[0], timestamp: new Date() },
        ]);
      } else {
        setConversation((prev) => [
          ...prev,
          { type: "agent", message: lang === "fr" ? "Je n'ai plus de questions. Vous pouvez appliquer les réponses au contexte." : "No more questions. You can apply answers to the context.", timestamp: new Date() },
        ]);
        setAllDone(true);
      }
    } catch (e) {
      console.error("agent-clarify error:", e);
      // Fallback to mock
      const fallback = mockClarificationQuestions.map((q) => ({ ...q }));
      setConversation((prev) => [
        ...prev,
        { type: "agent", message: lang === "fr" ? "Je suis l'agent Clarifier. J'ai quelques questions pour enrichir votre processus." : "I'm the Clarifier agent. I have some questions to enrich your process.", timestamp: new Date() },
        { type: "question", question: fallback[0], timestamp: new Date() },
      ]);
      setPendingQuestions(fallback.slice(1));
      setCurrentQuestion(fallback[0]);
    } finally {
      setIsLoading(false);
    }
  }, [processId, lang]);

  useEffect(() => {
    if (open && processId && conversation.length === 0) {
      fetchQuestions([]);
    }
  }, [open, processId]);

  const saveAnswersToDb = useCallback(async (answers: { question: string; answer: string }[]) => {
    if (answers.length === 0) return;
    const allText = answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
    try {
      const { data: existing } = await supabase
        .from("process_context")
        .select("id, stakeholder_notes")
        .eq("process_id", processId)
        .maybeSingle();

      if (existing) {
        await supabase.from("process_context").update({ stakeholder_notes: allText }).eq("id", existing.id);
      } else {
        await supabase.from("process_context").insert({ process_id: processId, stakeholder_notes: allText });
      }
    } catch (e) {
      console.error("Failed to save clarification answers:", e);
    }
  }, [processId]);

  const handleAnswer = () => {
    if (!currentQuestion) return;

    const answerText = selectedOption === "__other__" ? customAnswer.trim() : (selectedOption || "");
    if (!answerText) return;

    // Add user answer to conversation
    setConversation((prev) => [
      ...prev,
      { type: "user", answer: answerText, timestamp: new Date() },
    ]);

    const newAnswered = [...answeredQuestions, { question: currentQuestion.question, answer: answerText }];
    setAnsweredQuestions(newAnswered);
    setSelectedOption(undefined);
    setCustomAnswer("");

    // Save progressively to database
    saveAnswersToDb(newAnswered);

    // Add agent acknowledgment
    setConversation((prev) => [
      ...prev,
      { type: "agent", message: lang === "fr" ? "Compris, merci." : "Got it, thanks.", timestamp: new Date() },
    ]);

    // Next question or fetch follow-ups
    if (pendingQuestions.length > 0) {
      const next = pendingQuestions[0];
      setPendingQuestions((prev) => prev.slice(1));
      setCurrentQuestion(next);
      setConversation((prev) => [
        ...prev,
        { type: "question", question: next, timestamp: new Date() },
      ]);
    } else {
      setCurrentQuestion(null);
      // Fetch follow-up questions
      fetchQuestions(newAnswered);
    }
  };

  const handleSkip = () => {
    if (!currentQuestion) return;

    setConversation((prev) => [
      ...prev,
      { type: "user", answer: lang === "fr" ? "(Question passée)" : "(Skipped)", timestamp: new Date() },
    ]);
    setSkippedCount((c) => c + 1);
    setSelectedOption(undefined);
    setCustomAnswer("");

    if (pendingQuestions.length > 0) {
      const next = pendingQuestions[0];
      setPendingQuestions((prev) => prev.slice(1));
      setCurrentQuestion(next);
      setConversation((prev) => [
        ...prev,
        { type: "question", question: next, timestamp: new Date() },
      ]);
    } else {
      setCurrentQuestion(null);
      fetchQuestions(answeredQuestions);
    }
  };

  const handleApply = () => {
    setIsApplying(true);
    const grouped: Record<string, string[]> = {};
    for (const a of answeredQuestions) {
      // Simple grouping
      const key = "general";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(`Q: ${a.question}\nA: ${a.answer}`);
    }

    const updates: Partial<ProcessContext> = {};
    const allText = answeredQuestions.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
    updates.stakeholderNotes = allText;

    onApplyToContext(updates);
    setTimeout(() => {
      setIsApplying(false);
      onOpenChange(false);
      setConversation([]);
      setCurrentQuestion(null);
      setPendingQuestions([]);
      setAnsweredQuestions([]);
      setAllDone(false);
    }, 600);
  };

  const isOtherSelected = selectedOption === "__other__";
  const canAnswer = selectedOption && (selectedOption !== "__other__" || customAnswer.trim());

  return (
    <Sheet open={open} onOpenChange={(v) => {
      if (!v) {
        setConversation([]);
        setCurrentQuestion(null);
        setPendingQuestions([]);
        setAnsweredQuestions([]);
        setAllDone(false);
        setSkippedCount(0);
      }
      onOpenChange(v);
    }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <SheetTitle className="text-base">Agent Clarifier</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓ {answeredQuestions.length}</span>
                {skippedCount > 0 && <span className="text-muted-foreground">⊘ {skippedCount}</span>}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Conversation timeline */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {conversation.map((entry, i) => {
              if (entry.type === "agent") {
                return (
                  <AgentMessage
                    key={i}
                    agent="clarifier"
                    status="done"
                    message={entry.message || ""}
                    timestamp={entry.timestamp}
                  />
                );
              }
              if (entry.type === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{entry.answer}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {isLoading && (
              <AgentMessage agent="clarifier" status="thinking" message={lang === "fr" ? "Réflexion en cours..." : "Thinking..."} />
            )}
          </div>
        </ScrollArea>

        {/* Current question input area */}
        {currentQuestion && !isLoading && (
          <div className="border-t px-6 py-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-xs ${categoryColors[currentQuestion.category]}`}>
                {lang === "fr" ? categoryLabels[currentQuestion.category].fr : categoryLabels[currentQuestion.category].en}
              </Badge>
            </div>
            <p className="text-sm font-medium">{currentQuestion.question}</p>
            <p className="text-xs text-muted-foreground italic">💡 {currentQuestion.why}</p>

            <div className="space-y-1.5 max-h-48 overflow-auto">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { setSelectedOption(opt.label); setCustomAnswer(""); }}
                  className={cn(
                    "w-full text-left rounded-lg border px-3 py-2 transition-all text-sm",
                    selectedOption === opt.label
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {opt.label}
                  {opt.description && <span className="block text-xs text-muted-foreground">{opt.description}</span>}
                </button>
              ))}
              <button
                onClick={() => setSelectedOption("__other__")}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2 transition-all text-sm",
                  isOtherSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <PenLine className="h-3 w-3 inline mr-1" />
                {t.clarification.other}
              </button>
              {isOtherSelected && (
                <Textarea
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  placeholder={t.clarification.otherPlaceholder}
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleSkip} className="flex-shrink-0">
                {lang === "fr" ? "Passer" : "Skip"}
              </Button>
              <Button size="sm" onClick={handleAnswer} disabled={!canAnswer} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-1" />
                {lang === "fr" ? "Répondre" : "Answer"}
              </Button>
            </div>
          </div>
        )}

        {/* Apply button when done */}
        {(allDone || (!currentQuestion && !isLoading && answeredQuestions.length > 0)) && (
          <div className="border-t px-6 py-4">
            <Button onClick={handleApply} disabled={isApplying || answeredQuestions.length === 0} className="w-full">
              {isApplying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {t.clarification.apply} ({answeredQuestions.length} {lang === "fr" ? "réponses" : "answers"})
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
