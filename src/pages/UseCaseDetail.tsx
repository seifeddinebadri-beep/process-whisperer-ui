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
  MessageSquare, Clock, ChevronRight,
} from "lucide-react";
import { mockUseCases } from "@/data/mockData";
import { mockUseCaseDetails, TraceabilityLink, DetectionSignal } from "@/data/useCaseDetailData";

const signalIcons: Record<string, React.ReactNode> = {
  repetitive_manual: <Repeat className="h-4 w-4" />,
  rule_based: <Binary className="h-4 w-4" />,
  high_frequency: <Zap className="h-4 w-4" />,
  structured_inputs: <FileInput className="h-4 w-4" />,
  tool_transfer: <ArrowRightLeft className="h-4 w-4" />,
};

const traceIcons: Record<string, React.ReactNode> = {
  process_step: <ChevronRight className="h-3.5 w-3.5" />,
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
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="mt-4 p-12 text-center">
          <p className="text-muted-foreground">Use case not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-[1400px]">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6 pb-24">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/automation-discovery")} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Discovery
        </Button>

        {/* ===== SECTION 1: Overview ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{useCase.name}</CardTitle>
                <CardDescription className="mt-1">{useCase.description}</CardDescription>
              </div>
              <Badge className={`capitalize shrink-0 ${levelColors[useCase.potential]}`}>{useCase.potential} potential</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Linked Process</Label>
                <p className="font-medium mt-0.5">{detail.linkedProcess}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <p className="font-medium mt-0.5">{detail.department}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Entity</Label>
                <p className="font-medium mt-0.5">{detail.entity}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Automation Pattern</Label>
                <p className="font-medium mt-0.5">{detail.automationPattern}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              This automation was detected based on approved process and company context.
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 2: Explainability ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why This Automation Was Detected</CardTitle>
            <CardDescription>Structured explanation of detection signals and context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Detection Signals</Label>
              <div className="mt-2 space-y-3">
                {detail.detectionSignals.map((signal) => (
                  <div key={signal.id} className="flex gap-3 items-start border rounded-lg p-3 bg-muted/30">
                    <div className="mt-0.5 text-muted-foreground">{signalIcons[signal.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{signal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{signal.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="text-muted-foreground">Step: <span className="text-foreground font-medium">{signal.triggeringStep}</span></span>
                        <span className="text-muted-foreground">Rule: <span className="text-foreground">{signal.ruleOrThreshold}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Context Used</Label>
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
                <p className="text-sm font-medium capitalize">{detail.confidenceLevel} Confidence</p>
                <p className="text-xs text-muted-foreground mt-0.5">{detail.confidenceExplanation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 3: Scope ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automation Scope Definition</CardTitle>
            <CardDescription>Clear boundaries of what will and will not be automated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-green-700">What Will Be Automated</Label>
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-amber-700">What Will Remain Manual</Label>
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-destructive">Explicit Exclusions</Label>
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
            <CardTitle className="text-base">Detailed Automated Process Description</CardTitle>
            <CardDescription>Step-by-step narrative of the automated workflow</CardDescription>
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
                          <Label className="text-xs text-muted-foreground">Trigger</Label>
                          <p className="mt-0.5">{step.trigger}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Output Produced</Label>
                          <p className="mt-0.5">{step.outputProduced}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Input Data</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.inputData.map((inp, j) => <Badge key={j} variant="outline" className="text-xs">{inp}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Validation Rules</Label>
                        <ul className="list-disc list-inside mt-1 text-xs text-muted-foreground space-y-0.5">
                          {step.validationRules.map((rule, j) => <li key={j}>{rule}</li>)}
                        </ul>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">System Action</Label>
                        <p className="mt-0.5 text-xs">{step.systemAction}</p>
                      </div>
                      <div className="bg-muted/50 rounded px-3 py-2">
                        <Label className="text-xs text-muted-foreground">Logging / Audit</Label>
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
            <CardTitle className="text-base">Exception & Fallback Handling</CardTitle>
            <CardDescription>What can go wrong and how it's handled — no hidden behavior</CardDescription>
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
                    <Label className="text-xs text-muted-foreground">How Detected</Label>
                    <p className="mt-0.5">{ex.howDetected}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">What Happens Next</Label>
                    <p className="mt-0.5">{ex.whatHappensNext}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Who Is Notified</Label>
                    <p className="mt-0.5">{ex.whoIsNotified}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Preserved</Label>
                    <p className="mt-0.5">{ex.dataPreserved}</p>
                  </div>
                </div>
                {ex.severity === "high" && (
                  <div className="ml-6 mt-1">
                    <Badge variant="destructive" className="text-xs">Automation stops here — Human intervention required</Badge>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ===== SECTION 6: Before / After ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Before / After Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Before (Manual)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Number of steps</span>
                    <span className="font-medium">{detail.comparison.before.steps}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Human effort</span>
                    <span className="font-medium">{detail.comparison.before.humanEffort}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Tools involved</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detail.comparison.before.toolsInvolved.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Error risks</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.before.errorRisks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* After */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">After (Automated)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Reduced steps</span>
                    <span className="font-medium">{detail.comparison.after.steps}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Automation checkpoints</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.after.automationCheckpoints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Human touchpoints</span>
                    <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                      {detail.comparison.after.humanTouchpoints.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Residual risks</span>
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
            <CardTitle className="text-base">Value & Feasibility Assessment</CardTitle>
            <CardDescription>Qualitative metrics — no ROI promises, only transparency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.valueMetrics.map((vm, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{vm.metric}</span>
                  <Badge className={`capitalize text-xs ${levelColors[vm.level]}`}>{vm.level}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{vm.explanation}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">Assumption: {vm.assumptions}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ===== SECTION 9: Validation & Decision (bottom area) ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments & Decision History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Decision history */}
            {detail.decisions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Decision History</Label>
                {detail.decisions.map((dec) => (
                  <div key={dec.id} className="flex items-start gap-3 border rounded-lg p-3 bg-muted/30">
                    {dec.action === "approved" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                    {dec.action === "changes_requested" && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    {dec.action === "rejected" && <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{dec.user}</span>
                        <span>•</span>
                        <span>{new Date(dec.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <Badge variant="outline" className="capitalize text-xs">{dec.action.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm mt-1">{dec.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            {detail.comments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Discussion</Label>
                {detail.comments.map((com) => (
                  <div key={com.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-medium text-foreground">{com.user}</span>
                      <span>•</span>
                      <span>{new Date(com.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-sm mt-1">{com.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment about this use case…"
                className="text-sm"
                rows={2}
              />
            </div>
            <Button size="sm" variant="outline" disabled={!newComment.trim()} onClick={() => setNewComment("")}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Post Comment
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
                <LinkIcon className="h-4 w-4" /> Traceability
              </CardTitle>
              <CardDescription className="text-xs">Linked elements for auditability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["process_step", "role", "tool", "business_rule"] as const).map((type) => {
                const items = detail.traceabilityLinks.filter((l) => l.type === type);
                if (items.length === 0) return null;
                return (
                  <div key={type}>
                    <Label className="text-xs text-muted-foreground capitalize">{type.replace("_", " ")}s</Label>
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

      {/* ===== SECTION 9: Sticky Action Bar ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{useCase.name}</span> — Validation & Decision
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(!showRejectDialog)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Request Changes
            </Button>
            <Button size="sm">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Use Case
            </Button>
          </div>
        </div>
        {showRejectDialog && (
          <div className="max-w-[1400px] mx-auto px-6 pb-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection…"
                rows={2}
                className="text-sm"
              />
              <Button variant="destructive" size="sm" disabled={!rejectReason.trim()} onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UseCaseDetail;
