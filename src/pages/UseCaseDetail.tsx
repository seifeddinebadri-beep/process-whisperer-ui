import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Info,
  Repeat, Binary, Zap, FileInput, ArrowRightLeft,
  User, Wrench, BookOpen, ShieldAlert, LinkIcon,
  MessageSquare,
} from "lucide-react";
import { mockUseCases } from "@/data/mockData";
import { mockUseCaseDetails, TraceabilityLink } from "@/data/useCaseDetailData";
import { useLang } from "@/lib/i18n";

const signalIcons: Record<string, React.ReactNode> = {
  repetitive_manual: <Repeat className="h-4 w-4" />,
  rule_based: <Binary className="h-4 w-4" />,
  high_frequency: <Zap className="h-4 w-4" />,
  structured_inputs: <FileInput className="h-4 w-4" />,
  tool_transfer: <ArrowRightLeft className="h-4 w-4" />,
};

const traceIcons: Record<string, React.ReactNode> = {
  process_step: <ArrowRightLeft className="h-3.5 w-3.5" />,
  role: <User className="h-3.5 w-3.5" />,
  tool: <Wrench className="h-3.5 w-3.5" />,
  business_rule: <BookOpen className="h-3.5 w-3.5" />,
};

const levelColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const severityColors: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-amber-600",
  high: "text-destructive",
};

const UseCaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const [traceSelected, setTraceSelected] = useState<TraceabilityLink | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [newComment, setNewComment] = useState("");

  const useCase = mockUseCases.find((uc) => uc.id === id);
  const detail = id ? mockUseCaseDetails[id] : undefined;

  if (!useCase || !detail) {
    return (
      <div className="max-w-5xl p-8">
        <Button variant="ghost" onClick={() => navigate("/automation-discovery")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t.ucDetail.backToDiscovery}
        </Button>
        <Card className="mt-4 p-12 text-center">
          <p className="text-muted-foreground">{t.ucDetail.notFound}</p>
        </Card>
      </div>
    );
  }

  const confidenceLabel = detail.confidenceLevel === "high"
    ? t.ucDetail.confidenceHigh
    : detail.confidenceLevel === "medium"
    ? t.ucDetail.confidenceMedium
    : t.ucDetail.confidenceLow;

  return (
    <div className="flex gap-6 max-w-[1400px]">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6 pb-24">
        <Button variant="ghost" size="sm" onClick={() => navigate("/automation-discovery")} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t.ucDetail.backToDiscovery}
        </Button>

        {/* ===== SECTION 1: Overview ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{useCase.name}</CardTitle>
                <CardDescription className="mt-1">{useCase.description}</CardDescription>
              </div>
              <Badge className={`capitalize shrink-0 ${levelColors[useCase.potential]}`}>
                {t.discovery[useCase.potential as "low" | "medium" | "high"]} {t.discovery.potential.toLowerCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">{t.ucDetail.linkedProcess}</Label>
                <p className="font-medium mt-0.5">{detail.linkedProcess}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.ucDetail.department}</Label>
                <p className="font-medium mt-0.5">{detail.department}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.ucDetail.entity}</Label>
                <p className="font-medium mt-0.5">{detail.entity}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.ucDetail.automationPattern}</Label>
                <p className="font-medium mt-0.5">{detail.automationPattern}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t.ucDetail.detectedBased}
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 2: Explainability ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.whyDetected}</CardTitle>
            <CardDescription>{t.ucDetail.whyDetectedSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t.ucDetail.detectionSignals}</Label>
              <div className="mt-2 space-y-3">
                {detail.detectionSignals.map((signal) => (
                  <div key={signal.id} className="flex gap-3 items-start border rounded-lg p-3 bg-muted/30">
                    <div className="mt-0.5 text-muted-foreground">{signalIcons[signal.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{signal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{signal.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="text-muted-foreground">{t.ucDetail.step}: <span className="text-foreground font-medium">{signal.triggeringStep}</span></span>
                        <span className="text-muted-foreground">{t.ucDetail.rule}: <span className="text-foreground">{signal.ruleOrThreshold}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t.ucDetail.contextUsed}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {detail.contextReferences.map((ref) => (
                  <button
                    key={ref.id}
                    onClick={() => setTraceSelected({ type: ref.type as TraceabilityLink["type"], name: ref.name, detail: ref.detail })}
                    className="inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 hover:bg-muted transition-colors cursor-pointer"
                  >
                    {ref.type === "role" && <User className="h-3 w-3" />}
                    {ref.type === "tool" && <Wrench className="h-3 w-3" />}
                    {ref.type === "business_rule" && <BookOpen className="h-3 w-3" />}
                    {ref.type === "constraint" && <ShieldAlert className="h-3 w-3" />}
                    {ref.name}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2.5">
              <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${detail.confidenceLevel === "high" ? "text-green-600" : detail.confidenceLevel === "medium" ? "text-amber-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">{confidenceLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{detail.confidenceExplanation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 3: Scope ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.scopeTitle}</CardTitle>
            <CardDescription>{t.ucDetail.scopeSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-green-700">{t.ucDetail.willBeAutomated}</Label>
              <div className="mt-2 space-y-2">
                {detail.willBeAutomated.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{item.step}</span>
                      {item.system && <span className="text-muted-foreground"> — {item.system}</span>}
                      {item.decision && <Badge variant="outline" className="ml-2 text-xs">{item.decision}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t.ucDetail.willRemainManual}</Label>
              <div className="mt-2 space-y-2">
                {detail.willRemainManual.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{item.item}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-destructive">{t.ucDetail.explicitExclusions}</Label>
              <div className="mt-2 space-y-2">
                {detail.explicitExclusions.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{item.scenario}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 4: Detailed Automated Process ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.detailedSteps}</CardTitle>
            <CardDescription>{t.ucDetail.detailedStepsSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {detail.detailedSteps.map((step, i) => (
                <AccordionItem key={step.id} value={step.id}>
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium">{step.stepName}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ml-9 space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t.ucDetail.trigger}</Label>
                          <p className="mt-0.5">{step.trigger}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t.ucDetail.outputProduced}</Label>
                          <p className="mt-0.5">{step.outputProduced}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t.ucDetail.inputData}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.inputData.map((inp, j) => <Badge key={j} variant="outline" className="text-xs">{inp}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t.ucDetail.validationRules}</Label>
                        <ul className="list-disc list-inside mt-1 text-xs text-muted-foreground space-y-0.5">
                          {step.validationRules.map((rule, j) => <li key={j}>{rule}</li>)}
                        </ul>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t.ucDetail.systemAction}</Label>
                        <p className="mt-0.5 text-xs">{step.systemAction}</p>
                      </div>
                      <div className="bg-muted/50 rounded px-3 py-2">
                        <Label className="text-xs text-muted-foreground">{t.ucDetail.logging}</Label>
                        <p className="mt-0.5 text-xs">{step.logging}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* ===== SECTION 5: Exceptions ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.exceptions}</CardTitle>
            <CardDescription>{t.ucDetail.exceptionsSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.exceptions.map((ex) => (
              <div key={ex.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${severityColors[ex.severity]}`} />
                  <p className="text-sm font-medium">{ex.whatCanGoWrong}</p>
                </div>
                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.ucDetail.howDetected}</Label>
                    <p className="mt-0.5">{ex.howDetected}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.ucDetail.whatHappensNext}</Label>
                    <p className="mt-0.5">{ex.whatHappensNext}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.ucDetail.whoNotified}</Label>
                    <p className="mt-0.5">{ex.whoIsNotified}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.ucDetail.dataPreserved}</Label>
                    <p className="mt-0.5">{ex.dataPreserved}</p>
                  </div>
                </div>
                {ex.severity === "high" && (
                  <div className="ml-6 mt-1">
                    <Badge variant="destructive" className="text-xs">{t.ucDetail.automationStops}</Badge>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ===== SECTION 6: Before / After ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.beforeAfter}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.ucDetail.beforeManual}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">{t.ucDetail.numberOfSteps}</span>
                    <span className="font-medium">{detail.comparison.before.steps}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">{t.ucDetail.humanEffort}</span>
                    <span className="font-medium">{detail.comparison.before.humanEffort}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t.ucDetail.toolsInvolved}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detail.comparison.before.toolsInvolved.map((tool, i) => <Badge key={i} variant="outline" className="text-xs">{tool}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t.ucDetail.errorRisks}</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.before.errorRisks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">{t.ucDetail.afterAutomated}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">{t.ucDetail.reducedSteps}</span>
                    <span className="font-medium">{detail.comparison.after.steps}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t.ucDetail.automationCheckpoints}</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.after.automationCheckpoints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t.ucDetail.humanTouchpoints}</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.after.humanTouchpoints.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t.ucDetail.residualRisks}</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.after.residualRisks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 7: Value & Feasibility ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.valueTitle}</CardTitle>
            <CardDescription>{t.ucDetail.valueSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.valueMetrics.map((vm, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{vm.metric}</span>
                  <Badge className={`capitalize text-xs ${levelColors[vm.level]}`}>{t.discovery[vm.level as "low"|"medium"|"high"]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{vm.explanation}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">{t.ucDetail.assumption}: {vm.assumptions}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ===== Comments & Decision History ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ucDetail.commentsHistory}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.decisions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t.ucDetail.decisionHistory}</Label>
                {detail.decisions.map((dec) => (
                  <div key={dec.id} className="flex items-start gap-3 border rounded-lg p-3 bg-muted/30">
                    {dec.action === "approved" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                    {dec.action === "changes_requested" && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    {dec.action === "rejected" && <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{dec.user}</span>
                        <span>•</span>
                        <span>{new Date(dec.timestamp).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <Badge variant="outline" className="capitalize text-xs">{dec.action.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm mt-1">{dec.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detail.comments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t.ucDetail.discussion}</Label>
                {detail.comments.map((com) => (
                  <div key={com.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-medium text-foreground">{com.user}</span>
                      <span>•</span>
                      <span>{new Date(com.timestamp).toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-sm mt-1">{com.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t.ucDetail.addComment}
                className="text-sm"
                rows={2}
              />
            </div>
            <Button size="sm" variant="outline" disabled={!newComment.trim()} onClick={() => setNewComment("")}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> {t.ucDetail.postComment}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECTION 8: Traceability Panel (Right Side) ===== */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4" /> {t.ucDetail.traceability}
              </CardTitle>
              <CardDescription className="text-xs">{t.ucDetail.traceabilitySub}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["process_step", "role", "tool", "business_rule"] as const).map((type) => {
                const items = detail.traceabilityLinks.filter((l) => l.type === type);
                if (items.length === 0) return null;
                const typeLabels: Record<string, string> = {
                  process_step: t.ucDetail.processSteps,
                  role: t.ucDetail.roles,
                  tool: t.ucDetail.tools,
                  business_rule: t.ucDetail.businessRules,
                };
                return (
                  <div key={type}>
                    <Label className="text-xs text-muted-foreground">{typeLabels[type]}</Label>
                    <div className="mt-1 space-y-1">
                      {items.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => setTraceSelected(item)}
                          className="w-full text-left flex items-center gap-1.5 text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors cursor-pointer"
                        >
                          {traceIcons[item.type]}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Traceability detail sheet */}
      <Sheet open={!!traceSelected} onOpenChange={() => setTraceSelected(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {traceSelected && traceIcons[traceSelected.type]}
              {traceSelected?.name}
            </SheetTitle>
            <SheetDescription className="capitalize">{traceSelected?.type.replace("_", " ")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <p className="text-sm">{traceSelected?.detail}</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== Sticky Action Bar ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{useCase.name}</span> — {t.ucDetail.validation}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(!showRejectDialog)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> {t.ucDetail.reject}
            </Button>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> {t.ucDetail.requestChanges}
            </Button>
            <Button size="sm">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t.ucDetail.approve}
            </Button>
          </div>
        </div>
        {showRejectDialog && (
          <div className="max-w-[1400px] mx-auto px-6 pb-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t.ucDetail.rejectReason}
                rows={2}
                className="text-sm"
              />
              <Button variant="destructive" size="sm" disabled={!rejectReason.trim()} onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>
                {t.ucDetail.confirmReject}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UseCaseDetail;
