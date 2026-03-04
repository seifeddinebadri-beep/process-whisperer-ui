import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgentMessage } from "@/components/agents/AgentMessage";
import { cn } from "@/lib/utils";
import {
  Send, Loader2, FileText, Download,
  MessageSquare, PenLine, CheckCircle2, AlertTriangle, Shield,
} from "lucide-react";
import { toast } from "sonner";

interface QuestionOption {
  label: string;
  description?: string;
}

interface StructuredQuestion {
  category: string;
  question: string;
  why: string;
  options: QuestionOption[];
}

interface ConversationEntry {
  type: "agent" | "user";
  message: string;
  timestamp: Date;
}

const categoryLabels: Record<string, string> = {
  business_rules: "Règles métier",
  integration: "Intégration",
  risk: "Risques",
  scope: "Périmètre",
  roi: "ROI & Coûts",
  change_management: "Conduite du changement",
};

const categoryColors: Record<string, string> = {
  business_rules: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  integration: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  risk: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  scope: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  roi: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  change_management: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

interface BusinessAnalystPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useCaseId: string;
  useCaseTitle: string;
}

const BusinessAnalystPanel = ({ open, onOpenChange, useCaseId, useCaseTitle }: BusinessAnalystPanelProps) => {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<StructuredQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | undefined>();
  const [customAnswer, setCustomAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pddReady, setPddReady] = useState(false);
  const [pddGenerating, setPddGenerating] = useState(false);
  const [pddContent, setPddContent] = useState<any>(null);
  const [answerCount, setAnswerCount] = useState(0);

  const handleResponse = (data: any) => {
    if (data.agent_message) {
      setConversation((prev) => [...prev, {
        type: "agent", message: data.agent_message, timestamp: new Date(),
      }]);
    }
    if (data.question) {
      setCurrentQuestion(data.question);
    } else {
      setCurrentQuestion(null);
    }
    if (data.pdd_ready) setPddReady(true);
    if (data.conversation_id) setConversationId(data.conversation_id);
  };

  const startConversation = useCallback(async () => {
    if (conversation.length > 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-business-analyst", {
        body: { use_case_id: useCaseId },
      });
      if (error) throw error;
      handleResponse(data);
    } catch (e: any) {
      toast.error("Erreur lors du démarrage de la session BA");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [useCaseId, conversation.length]);

  useEffect(() => {
    if (open && useCaseId && conversation.length === 0) {
      startConversation();
    }
  }, [open, useCaseId]);

  const submitAnswer = async () => {
    if (!conversationId) return;
    const answerText = selectedOption === "__other__" ? customAnswer.trim() : (selectedOption || "");
    if (!answerText) return;

    setConversation((prev) => [...prev, { type: "user", message: answerText, timestamp: new Date() }]);
    setSelectedOption(undefined);
    setCustomAnswer("");
    setCurrentQuestion(null);
    setAnswerCount((c) => c + 1);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-business-analyst", {
        body: {
          use_case_id: useCaseId,
          conversation_id: conversationId,
          user_message: answerText,
        },
      });
      if (error) throw error;
      handleResponse(data);
    } catch (e: any) {
      toast.error("Erreur de communication avec l'agent BA");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generatePDD = async () => {
    if (!conversationId) return;
    setPddGenerating(true);
    setConversation((prev) => [...prev, {
      type: "agent",
      message: "📝 Génération du PDD en cours... J'analyse notre conversation et les données du processus.",
      timestamp: new Date(),
    }]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdd", {
        body: { conversation_id: conversationId, use_case_id: useCaseId },
      });
      if (error) throw error;
      setPddContent(data.pdd);
      setCurrentQuestion(null);
      setConversation((prev) => [...prev, {
        type: "agent",
        message: `✅ Le PDD "${data.pdd.title}" a été généré. Consultez-le ci-dessous ou téléchargez-le en PDF.`,
        timestamp: new Date(),
      }]);
      toast.success("PDD généré avec succès");
    } catch (e: any) {
      toast.error("Erreur lors de la génération du PDD");
      console.error(e);
    } finally {
      setPddGenerating(false);
    }
  };

  const downloadPDD = async () => {
    if (!conversationId) return;
    try {
      const { data } = await supabase
        .from("pdd_documents")
        .select("html_content, title")
        .eq("conversation_id", conversationId)
        .single();
      if (!data?.html_content) { toast.error("PDD non trouvé"); return; }
      const blob = new Blob([data.html_content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.addEventListener("load", () => setTimeout(() => win.print(), 500));
    } catch { toast.error("Erreur lors du téléchargement"); }
  };

  const isOtherSelected = selectedOption === "__other__";
  const canAnswer = selectedOption && (selectedOption !== "__other__" || customAnswer.trim());
  const showGeneratePDD = (pddReady || answerCount >= 3) && !pddContent;

  return (
    <Sheet open={open} onOpenChange={(v) => {
      if (!v) {
        setConversation([]);
        setConversationId(null);
        setCurrentQuestion(null);
        setSelectedOption(undefined);
        setCustomAnswer("");
        setPddReady(false);
        setPddContent(null);
        setAnswerCount(0);
      }
      onOpenChange(v);
    }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Agent Business Analyst</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {answerCount} réponses • {useCaseTitle}
              </p>
            </div>
            {pddContent && (
              <Button size="sm" variant="outline" onClick={downloadPDD} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            )}
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
                    agent="discoverer"
                    status="done"
                    message={entry.message}
                    timestamp={entry.timestamp}
                  />
                );
              }
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{entry.message}</p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <AgentMessage agent="discoverer" status="thinking" message="Analyse en cours..." />
            )}

            {/* PDD Preview inline */}
            {pddContent && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{pddContent.title}</span>
                  <Badge variant="outline" className="text-[10px]">PDD</Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Résumé Exécutif</h4>
                    <p className="text-xs leading-relaxed">{pddContent.executive_summary}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Processus Cible</h4>
                    <p className="text-xs leading-relaxed">{pddContent.to_be_process}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                      Règles Métier <Badge variant="secondary" className="text-[10px]">{pddContent.business_rules?.length || 0}</Badge>
                    </h4>
                    <ul className="space-y-1">
                      {(pddContent.business_rules || []).map((r: any, idx: number) => (
                        <li key={idx} className="text-xs flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                          <span><strong>{r.rule}</strong> — {r.validation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                      Risques <Badge variant="secondary" className="text-[10px]">{pddContent.risks_and_mitigations?.length || 0}</Badge>
                    </h4>
                    <ul className="space-y-1.5">
                      {(pddContent.risks_and_mitigations || []).map((r: any, idx: number) => (
                        <li key={idx} className="text-xs flex items-start gap-1.5">
                          <AlertTriangle className={cn("h-3 w-3 mt-0.5 shrink-0", r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-amber-500" : "text-muted-foreground")} />
                          <span><strong>{r.risk}</strong> — {r.mitigation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Critères de Succès</h4>
                    <ul className="space-y-1">
                      {(pddContent.success_criteria || []).map((c: string, idx: number) => (
                        <li key={idx} className="text-xs">✅ {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Current question with multi-choice */}
        {currentQuestion && !loading && !pddContent && (
          <div className="border-t px-6 py-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn("text-xs", categoryColors[currentQuestion.category] || "")}>
                {categoryLabels[currentQuestion.category] || currentQuestion.category}
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
                Autre (réponse libre)
              </button>
              {isOtherSelected && (
                <Textarea
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  placeholder="Saisissez votre réponse..."
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
              )}
            </div>

            <Button size="sm" onClick={submitAnswer} disabled={!canAnswer} className="w-full">
              <MessageSquare className="h-4 w-4 mr-1" />
              Répondre
            </Button>
          </div>
        )}

        {/* Generate PDD button */}
        {showGeneratePDD && !loading && (
          <div className="border-t px-6 py-3">
            <Button onClick={generatePDD} disabled={pddGenerating} className="w-full gap-2" variant="default">
              {pddGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Générer le PDD ({answerCount} réponses collectées)
            </Button>
          </div>
        )}

        {/* Download button when PDD is done */}
        {pddContent && (
          <div className="border-t px-6 py-4">
            <Button onClick={downloadPDD} className="w-full gap-2" variant="outline">
              <Download className="h-4 w-4" />
              Télécharger le PDD en PDF
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default BusinessAnalystPanel;
