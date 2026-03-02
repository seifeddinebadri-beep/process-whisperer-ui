import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  GitMerge, CheckCheck, AlertTriangle, Link2, Check, X,
  ChevronRight, Eye, Layers, ArrowRight,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { ProcessStep } from "./types";

// ─── Similarity ────────────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function similarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  ta.forEach((w) => { if (tb.has(w)) common++; });
  return common / Math.max(ta.size, tb.size);
}

interface Pair { el: ProcessStep; kb: ProcessStep; score: number }

function matchSteps(elSteps: ProcessStep[], kbSteps: ProcessStep[]) {
  const usedKB = new Set<string>();
  const pairs: Pair[] = [];

  for (const el of elSteps) {
    let best: { kb: ProcessStep; score: number } | null = null;
    for (const kb of kbSteps) {
      if (usedKB.has(kb.id)) continue;
      const s = similarity(`${el.name} ${el.description}`, `${kb.name} ${kb.description}`);
      if (s > 0.2 && (!best || s > best.score)) best = { kb, score: s };
    }
    if (best) {
      pairs.push({ el, kb: best.kb, score: best.score });
      usedKB.add(best.kb.id);
    }
  }

  const pairedELIds = new Set(pairs.map((p) => p.el.id));
  const uniqueEL = elSteps.filter((s) => !pairedELIds.has(s.id));
  const uniqueKB = kbSteps.filter((s) => !usedKB.has(s.id));
  return { pairs, uniqueEL, uniqueKB };
}

// ─── Combine helper ────────────────────────────────────────
function combineSteps(el: ProcessStep, kb: ProcessStep): ProcessStep {
  return {
    id: `merged-${el.id}-${kb.id}`,
    name: el.name.length >= kb.name.length ? el.name : kb.name,
    description: el.description.length >= kb.description.length ? el.description : kb.description,
    role: el.role || kb.role,
    toolUsed: el.toolUsed || kb.toolUsed,
    decisionType: el.decisionType || kb.decisionType,
    painPoints: [el.painPoints, kb.painPoints].filter(Boolean).join(" · ") || undefined,
    businessRules: [el.businessRules, kb.businessRules].filter(Boolean).join(" | ") || undefined,
    dataInputs: [...(el.dataInputs || []), ...(kb.dataInputs || [])],
    dataOutputs: [...(el.dataOutputs || []), ...(kb.dataOutputs || [])],
    frequency: el.frequency || kb.frequency,
    volumeEstimate: el.volumeEstimate || kb.volumeEstimate,
    source: "merged" as const,
    stepOrder: 0,
  };
}

// ─── Conflict detection ────────────────────────────────────
function getConflicts(el: ProcessStep, kb: ProcessStep) {
  const conflicts: { field: string; elVal: string; kbVal: string }[] = [];
  if (el.businessRules && kb.businessRules && el.businessRules !== kb.businessRules) {
    conflicts.push({ field: "businessRules", elVal: el.businessRules, kbVal: kb.businessRules });
  }
  if (el.decisionType && kb.decisionType && el.decisionType !== kb.decisionType) {
    conflicts.push({ field: "decisionType", elVal: el.decisionType, kbVal: kb.decisionType });
  }
  return conflicts;
}

// ─── Types ─────────────────────────────────────────────────
type PairDecision = "keepEL" | "keepKB" | "combine" | null;
type UniqueDecision = "accepted" | "skipped" | null;

interface StepComparisonViewProps {
  eventLogSteps: ProcessStep[];
  kbSteps: ProcessStep[];
  onMergeComplete: (mergedSteps: ProcessStep[]) => void;
}

// ─── Mini step display ─────────────────────────────────────
const MiniStep = ({ step, highlight, side }: { step: ProcessStep; highlight?: string[]; side: "el" | "kb" }) => {
  const isIncomplete = !step.description || step.description.trim() === "";
  const { t } = useLang();
  const badgeClass = side === "el"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";

  return (
    <div className="space-y-1.5 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-medium text-sm leading-tight">{step.name}</span>
        {isIncomplete && (
          <Badge variant="destructive" className="text-[10px] h-4">
            {t.comparison?.incomplete || "Incomplete"}
          </Badge>
        )}
      </div>
      <p className={`text-xs text-muted-foreground leading-relaxed ${highlight?.includes("description") ? "bg-orange-100 dark:bg-orange-900/20 rounded px-1" : ""}`}>
        {step.description || "—"}
      </p>
      <div className="flex flex-wrap gap-1">
        <Badge className={`text-[10px] border-0 ${badgeClass}`}>
          {side === "el" ? (t.comparison?.eventLog || "EL") : (t.comparison?.knowledgeBase || "KB")}
        </Badge>
        {step.role && <Badge variant="secondary" className="text-[10px]">{step.role}</Badge>}
        {step.toolUsed && <Badge variant="outline" className="text-[10px]">{step.toolUsed}</Badge>}
        {step.decisionType && (
          <Badge variant="outline" className={`text-[10px] ${highlight?.includes("decisionType") ? "border-orange-400 text-orange-600 dark:text-orange-400" : "border-primary/30 text-primary"}`}>
            {step.decisionType}
          </Badge>
        )}
      </div>
      {step.painPoints && <p className="text-[11px] text-destructive/80">⚠ {step.painPoints}</p>}
      {step.businessRules && (
        <p className={`text-[11px] text-muted-foreground ${highlight?.includes("businessRules") ? "bg-orange-100 dark:bg-orange-900/20 rounded px-1" : ""}`}>
          📋 {step.businessRules}
        </p>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────
export const StepComparisonView = ({ eventLogSteps, kbSteps, onMergeComplete }: StepComparisonViewProps) => {
  const { t } = useLang();
  const c = t.comparison || {};

  const { pairs, uniqueEL, uniqueKB } = useMemo(
    () => matchSteps(eventLogSteps, kbSteps),
    [eventLogSteps, kbSteps]
  );

  const [pairDecisions, setPairDecisions] = useState<Record<string, PairDecision>>({});
  const [uniqueELDecisions, setUniqueELDecisions] = useState<Record<string, UniqueDecision>>({});
  const [uniqueKBDecisions, setUniqueKBDecisions] = useState<Record<string, UniqueDecision>>({});

  const setPairDec = (pairKey: string, d: PairDecision) =>
    setPairDecisions((prev) => ({ ...prev, [pairKey]: prev[pairKey] === d ? null : d }));
  const setUniqueDec = (side: "el" | "kb", id: string, d: UniqueDecision) => {
    const setter = side === "el" ? setUniqueELDecisions : setUniqueKBDecisions;
    setter((prev) => ({ ...prev, [id]: prev[id] === d ? null : d }));
  };

  // ── Merged preview ──
  const mergedPreview = useMemo(() => {
    const steps: (ProcessStep & { sourceLabel: string })[] = [];
    for (const pair of pairs) {
      const key = `${pair.el.id}-${pair.kb.id}`;
      const d = pairDecisions[key];
      if (d === "keepEL") steps.push({ ...pair.el, sourceLabel: c.eventLog || "EL" });
      else if (d === "keepKB") steps.push({ ...pair.kb, sourceLabel: c.knowledgeBase || "KB" });
      else if (d === "combine") steps.push({ ...combineSteps(pair.el, pair.kb), sourceLabel: c.combined || "Combined" });
    }
    for (const s of uniqueEL) {
      if (uniqueELDecisions[s.id] === "accepted") steps.push({ ...s, sourceLabel: c.eventLog || "EL" });
    }
    for (const s of uniqueKB) {
      if (uniqueKBDecisions[s.id] === "accepted") steps.push({ ...s, sourceLabel: c.knowledgeBase || "KB" });
    }
    return steps;
  }, [pairs, pairDecisions, uniqueEL, uniqueELDecisions, uniqueKB, uniqueKBDecisions, c]);

  // ── Progress ──
  const totalDecisions = pairs.length + uniqueEL.length + uniqueKB.length;
  const madeDecisions =
    Object.values(pairDecisions).filter(Boolean).length +
    Object.values(uniqueELDecisions).filter(Boolean).length +
    Object.values(uniqueKBDecisions).filter(Boolean).length;
  const progressPct = totalDecisions > 0 ? Math.round((madeDecisions / totalDecisions) * 100) : 0;
  const allDecided = madeDecisions === totalDecisions;

  const handleValidate = () => {
    const final = mergedPreview.map((s, i) => ({ ...s, stepOrder: i, source: "merged" as const }));
    onMergeComplete(final);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              {c.title || "Process Step Merge"}
            </CardTitle>
            <CardDescription>{c.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="font-medium text-muted-foreground">{c.legend || "Legend"}:</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                {c.eventLog}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                {c.knowledgeBase}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                {c.combined || "Combined"}
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                {c.conflictDetected || "Conflict"}
              </div>
            </div>
            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {c.progress || "Progress"}: {madeDecisions}/{totalDecisions}
              </span>
              <Progress value={progressPct} className="h-2 flex-1" />
              <span className="text-xs font-semibold">{progressPct}%</span>
            </div>
            {/* Stats */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> {pairs.length} {c.similarSteps?.toLowerCase()?.split(" ")[0] || "paired"}</span>
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {uniqueEL.length} EL</span>
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {uniqueKB.length} KB</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 1: Paired steps ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-purple-500" />
              {c.similarSteps || "Similar Steps Detected"}
            </CardTitle>
            <CardDescription className="text-xs">{c.similarStepsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pairs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{c.noSimilar}</p>
            ) : (
              pairs.map((pair) => {
                const key = `${pair.el.id}-${pair.kb.id}`;
                const decision = pairDecisions[key];
                const conflicts = getConflicts(pair.el, pair.kb);
                const highlightFields = conflicts.map((c) => c.field);

                return (
                  <div key={key} className={`rounded-lg border p-3 space-y-2 transition-colors ${decision ? "bg-muted/30" : ""}`}>
                    {/* Conflict warnings */}
                    {conflicts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {conflicts.map((cf) => (
                          <Tooltip key={cf.field}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-0.5 cursor-help">
                                <AlertTriangle className="h-3 w-3" />
                                {c.conflictDetected}
                                <span className="font-mono">({cf.field})</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                              <p><strong>EL:</strong> {cf.elVal}</p>
                              <p><strong>KB:</strong> {cf.kbVal}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                    {/* Side-by-side */}
                    <div className="flex gap-4">
                      <div className="flex-1 border-l-2 border-blue-400 pl-3">
                        <MiniStep step={pair.el} highlight={highlightFields} side="el" />
                      </div>
                      <div className="flex items-center shrink-0">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 border-l-2 border-green-400 pl-3">
                        <MiniStep step={pair.kb} highlight={highlightFields} side="kb" />
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        variant={decision === "keepEL" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setPairDec(key, "keepEL")}
                      >
                        <Check className="h-3 w-3 mr-1" />{c.keepEL || "Keep EL"}
                      </Button>
                      <Button
                        variant={decision === "keepKB" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setPairDec(key, "keepKB")}
                      >
                        <Check className="h-3 w-3 mr-1" />{c.keepKB || "Keep KB"}
                      </Button>
                      <Button
                        variant={decision === "combine" ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setPairDec(key, "combine")}
                      >
                        <GitMerge className="h-3 w-3 mr-1" />{c.combine || "Combine"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Section 2: Unique EL ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              {c.uniqueEL || "Unique — Event Log"}
            </CardTitle>
            <CardDescription className="text-xs">{c.uniqueELDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {uniqueEL.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{c.noUniqueEL}</p>
            ) : (
              uniqueEL.map((step) => {
                const d = uniqueELDecisions[step.id];
                return (
                  <div key={step.id} className={`rounded-lg border p-3 transition-opacity ${d === "skipped" ? "opacity-40" : ""}`}>
                    <div className="border-l-2 border-blue-400 pl-3">
                      <MiniStep step={step} side="el" />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button variant={d === "accepted" ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setUniqueDec("el", step.id, "accepted")}>
                        <Check className="h-3 w-3 mr-1" />{c.accept}
                      </Button>
                      <Button variant={d === "skipped" ? "destructive" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setUniqueDec("el", step.id, "skipped")}>
                        <X className="h-3 w-3 mr-1" />{c.skip}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Section 3: Unique KB ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              {c.uniqueKB || "Unique — Knowledge Base"}
            </CardTitle>
            <CardDescription className="text-xs">{c.uniqueKBDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {uniqueKB.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{c.noUniqueKB}</p>
            ) : (
              uniqueKB.map((step) => {
                const d = uniqueKBDecisions[step.id];
                return (
                  <div key={step.id} className={`rounded-lg border p-3 transition-opacity ${d === "skipped" ? "opacity-40" : ""}`}>
                    <div className="border-l-2 border-green-400 pl-3">
                      <MiniStep step={step} side="kb" />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button variant={d === "accepted" ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setUniqueDec("kb", step.id, "accepted")}>
                        <Check className="h-3 w-3 mr-1" />{c.accept}
                      </Button>
                      <Button variant={d === "skipped" ? "destructive" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setUniqueDec("kb", step.id, "skipped")}>
                        <X className="h-3 w-3 mr-1" />{c.skip}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Section 4: Live preview ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              {c.preview || "Merged Result Preview"}
            </CardTitle>
            <CardDescription className="text-xs">{c.previewDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {mergedPreview.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">{c.emptyPreview}</p>
            ) : (
              <div className="space-y-1.5">
                {mergedPreview.map((step, i) => {
                  const badgeClass = step.source === "event_log"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : step.source === "knowledge_base"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
                  return (
                    <div key={step.id + i} className="flex items-center gap-2 rounded border px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                      <span className="text-sm flex-1 truncate">{step.name}</span>
                      <Badge className={`text-[10px] border-0 shrink-0 ${badgeClass}`}>
                        {(step as any).sourceLabel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {mergedPreview.length} {c.stepsSelected} · {madeDecisions}/{totalDecisions} {c.decided}
          </p>
          <Button onClick={handleValidate} disabled={!allDecided || mergedPreview.length === 0} size="lg">
            <CheckCheck className="h-4 w-4 mr-2" />
            {c.mergeSelected || "Validate Merge"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};
