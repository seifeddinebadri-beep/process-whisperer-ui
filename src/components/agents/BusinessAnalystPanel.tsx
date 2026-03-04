import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send, Loader2, Bot, User, FileText, Download, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "agent" | "user";
  content: string;
  pddReady?: boolean;
}

interface BusinessAnalystPanelProps {
  useCaseId: string;
  useCaseTitle: string;
}

const BusinessAnalystPanel = ({ useCaseId, useCaseTitle }: BusinessAnalystPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pddReady, setPddReady] = useState(false);
  const [pddGenerating, setPddGenerating] = useState(false);
  const [pddContent, setPddContent] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startConversation = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-business-analyst", {
        body: { use_case_id: useCaseId },
      });
      if (error) throw error;
      setConversationId(data.conversation_id);
      setMessages([{ role: "agent", content: data.agent_message }]);
    } catch (e: any) {
      toast.error("Erreur lors du démarrage de la session BA");
      console.error(e);
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-business-analyst", {
        body: {
          use_case_id: useCaseId,
          conversation_id: conversationId,
          user_message: userMsg,
        },
      });
      if (error) throw error;
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: data.agent_message, pddReady: data.pdd_ready },
      ]);
      if (data.pdd_ready) setPddReady(true);
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
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdd", {
        body: { conversation_id: conversationId, use_case_id: useCaseId },
      });
      if (error) throw error;
      setPddContent(data.pdd);
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: `✅ Le PDD "${data.pdd.title}" a été généré avec succès. Vous pouvez le consulter ci-dessous.` },
      ]);
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
      if (!data?.html_content) {
        toast.error("PDD non trouvé");
        return;
      }
      const blob = new Blob([data.html_content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => setTimeout(() => win.print(), 500));
      }
    } catch (e) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (!started) {
    return (
      <Card className="border-2 border-dashed border-primary/20">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Agent Business Analyst</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Cet agent va challenger l'approche d'automatisation : règles métier, intégrations, risques, périmètre.
              À la fin, il génère un PDD (Process Design Document).
            </p>
          </div>
          <Button onClick={startConversation} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Démarrer la session de challenge
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Agent Business Analyst</CardTitle>
              <p className="text-xs text-muted-foreground">Challenge du cas : {useCaseTitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(pddReady || messages.length >= 6) && !pddContent && (
              <Button size="sm" variant="default" onClick={generatePDD} disabled={pddGenerating} className="gap-1.5">
                {pddGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Générer le PDD
              </Button>
            )}
            {pddContent && (
              <Button size="sm" variant="outline" onClick={downloadPDD} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Télécharger PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        {/* Chat messages */}
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "agent" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* PDD Preview */}
        {pddContent && (
          <>
            <Separator />
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{pddContent.title}</h3>
                <Badge variant="outline" className="text-xs">PDD</Badge>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-4 max-h-[300px] overflow-y-auto">
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Résumé Exécutif</h4>
                  <p className="text-sm">{pddContent.executive_summary}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Processus Cible (To-Be)</h4>
                  <p className="text-sm">{pddContent.to_be_process}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Règles Métier ({pddContent.business_rules?.length || 0})</h4>
                  <ul className="space-y-1">
                    {(pddContent.business_rules || []).map((r: any, i: number) => (
                      <li key={i} className="text-xs">• <strong>{r.rule}</strong> — {r.validation}</li>
                    ))}
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Risques ({pddContent.risks_and_mitigations?.length || 0})</h4>
                  <ul className="space-y-1">
                    {(pddContent.risks_and_mitigations || []).map((r: any, i: number) => (
                      <li key={i} className="text-xs">
                        <Badge variant={r.severity === "high" ? "destructive" : "outline"} className="text-[10px] mr-1">{r.severity}</Badge>
                        {r.risk}
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Critères de Succès</h4>
                  <ul className="space-y-1">
                    {(pddContent.success_criteria || []).map((c: string, i: number) => (
                      <li key={i} className="text-xs">✅ {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Input */}
        {!pddContent && (
          <>
            <Separator />
            <div className="p-3 flex gap-2">
              <Textarea
                placeholder="Répondez à l'agent..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                disabled={loading}
              />
              <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessAnalystPanel;
