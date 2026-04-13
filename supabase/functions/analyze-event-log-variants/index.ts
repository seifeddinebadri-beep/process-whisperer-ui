import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectDelimiter(line: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let max = 0;
  for (const d of candidates) {
    const count = (line.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (count > max) { max = count; best = d; }
  }
  return best;
}

interface RawEvent {
  case_id: string;
  activity: string;
  resource: string;
  timestamp: string;
}

function parseCSV(text: string): RawEvent[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]);
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const caseIdx = headers.findIndex((h) => ["case_id", "caseid", "case", "trace_id", "traceid"].includes(h));
  const actIdx = headers.findIndex((h) => ["activity", "activité", "event", "step", "action", "activity_name"].includes(h));
  const resIdx = headers.findIndex((h) => ["resource", "consultant", "actor", "user", "operator", "performer"].includes(h));
  const tsIdx = headers.findIndex((h) => ["timestamp", "time", "date", "datetime", "start_time", "end_time"].includes(h));

  if (caseIdx === -1 || actIdx === -1) return [];

  const events: RawEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length <= Math.max(caseIdx, actIdx)) continue;
    events.push({
      case_id: cols[caseIdx],
      activity: cols[actIdx],
      resource: resIdx >= 0 ? cols[resIdx] : "Unknown",
      timestamp: tsIdx >= 0 ? cols[tsIdx] : "",
    });
  }
  return events;
}

function parseJSON(text: string): RawEvent[] {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.events || data.traces || data.records || [];
    return arr.map((e: any) => ({
      case_id: e.case_id || e.caseId || e.trace_id || e.case || "",
      activity: e.activity || e.event || e.step || e.action || "",
      resource: e.resource || e.consultant || e.actor || e.user || "Unknown",
      timestamp: e.timestamp || e.time || e.date || "",
    })).filter((e: RawEvent) => e.case_id && e.activity);
  } catch {
    return [];
  }
}

function parseEventLog(text: string, fileName: string): RawEvent[] {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "json") return parseJSON(text);
  return parseCSV(text); // csv, txt
}

interface Trace {
  case_id: string;
  resource: string;
  steps: string[];
  duration_minutes?: number;
}

function buildTraces(events: RawEvent[]): Trace[] {
  // Group by case_id, sort by timestamp
  const cases = new Map<string, RawEvent[]>();
  for (const e of events) {
    if (!cases.has(e.case_id)) cases.set(e.case_id, []);
    cases.get(e.case_id)!.push(e);
  }

  const traces: Trace[] = [];
  for (const [case_id, evts] of cases) {
    evts.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    const resource = evts[0].resource;
    const steps = evts.map((e) => e.activity);
    let duration_minutes: number | undefined;
    if (evts[0].timestamp && evts[evts.length - 1].timestamp) {
      const start = new Date(evts[0].timestamp).getTime();
      const end = new Date(evts[evts.length - 1].timestamp).getTime();
      if (!isNaN(start) && !isNaN(end)) duration_minutes = (end - start) / 60000;
    }
    traces.push({ case_id, resource, steps, duration_minutes });
  }
  return traces;
}

interface VariantCluster {
  variant_label: string;
  consultant_name: string;
  frequency: number;
  avg_duration_minutes: number | null;
  steps: string[];
  traces: Trace[];
}

function clusterVariants(traces: Trace[]): VariantCluster[] {
  // Group by resource + step sequence
  const groups = new Map<string, Trace[]>();
  for (const t of traces) {
    const key = `${t.resource}|||${t.steps.join("→")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const clusters: VariantCluster[] = [];
  let variantIdx = 0;
  for (const [, grpTraces] of groups) {
    variantIdx++;
    const durations = grpTraces.filter((t) => t.duration_minutes != null).map((t) => t.duration_minutes!);
    clusters.push({
      variant_label: `Variante ${String.fromCharCode(64 + variantIdx)}`,
      consultant_name: grpTraces[0].resource,
      frequency: grpTraces.length,
      avg_duration_minutes: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      steps: grpTraces[0].steps,
      traces: grpTraces,
    });
  }

  return clusters.sort((a, b) => b.frequency - a.frequency);
}

function computeReferenceSteps(clusters: VariantCluster[]): string[] {
  // The most frequent variant = reference
  if (clusters.length === 0) return [];
  return clusters[0].steps;
}

function computeStepFlags(variantSteps: string[], referenceSteps: string[]) {
  const refSet = new Set(referenceSteps);
  return variantSteps.map((step, idx) => {
    const isExtra = !refSet.has(step);
    const refIdx = referenceSteps.indexOf(step);
    const isReordered = !isExtra && refIdx !== -1 && refIdx !== idx;
    return { step_name: step, step_order: idx, is_skipped: false, is_extra: isExtra, is_reordered: isReordered };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { process_id, file_path } = body;

    if (!process_id || !file_path) {
      return new Response(JSON.stringify({ error: "process_id and file_path required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    await supabase.from("agent_logs").insert({
      process_id, agent_name: "variant-analyzer", action: "analyze_event_log",
      status: "started", message: "Downloading and parsing event log file...",
    });

    // Download file from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("process-files")
      .download(file_path);

    if (dlError || !fileData) throw new Error(`File download failed: ${dlError?.message}`);

    // Parse file(s)
    let allEvents: RawEvent[] = [];
    const fileName = file_path.split("/").pop() || "";
    const ext = fileName.toLowerCase().split(".").pop();

    if (ext === "zip") {
      const zip = await JSZip.loadAsync(await fileData.arrayBuffer());
      for (const [name, entry] of Object.entries(zip.files)) {
        if ((entry as any).dir) continue;
        const text = await (entry as any).async("text");
        allEvents.push(...parseEventLog(text, name));
      }
    } else {
      const text = await fileData.text();
      allEvents = parseEventLog(text, fileName);
    }

    if (allEvents.length === 0) {
      await supabase.from("agent_logs").insert({
        process_id, agent_name: "variant-analyzer", action: "analyze_event_log",
        status: "error", message: "No events could be parsed from the uploaded file.",
      });
      return new Response(JSON.stringify({ error: "No events parsed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("agent_logs").insert({
      process_id, agent_name: "variant-analyzer", action: "analyze_event_log",
      status: "started", message: `Parsed ${allEvents.length} events. Building traces and detecting variants...`,
    });

    const traces = buildTraces(allEvents);
    const clusters = clusterVariants(traces);
    const referenceSteps = computeReferenceSteps(clusters);

    // Generate AI insights if API key available
    let aiInsights: Record<string, string[]> = {};
    if (LOVABLE_API_KEY && clusters.length > 1) {
      try {
        const variantSummary = clusters.map((c) =>
          `${c.variant_label} (${c.consultant_name}): ${c.frequency} traces, steps: [${c.steps.join(" → ")}]`
        ).join("\n");

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un expert en process mining. Analyse les variantes de processus détectées et génère des insights actionnables en français. Retourne via l'appel de fonction." },
              { role: "user", content: `Référence (variante la plus fréquente): [${referenceSteps.join(" → ")}]\n\nVariantes détectées:\n${variantSummary}\n\nGénère 2-3 insights par variante, mettant en évidence les écarts, raccourcis, étapes supplémentaires et anomalies.` },
            ],
            tools: [{
              type: "function",
              function: {
                name: "variant_insights",
                description: "Generate insights for each process variant",
                parameters: {
                  type: "object",
                  properties: {
                    variants: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          variant_label: { type: "string" },
                          insights: { type: "array", items: { type: "string" } },
                        },
                        required: ["variant_label", "insights"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["variants"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "variant_insights" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            for (const v of (parsed.variants || [])) {
              aiInsights[v.variant_label] = v.insights || [];
            }
          }
        }
      } catch (aiErr) {
        console.error("AI insights error:", aiErr);
      }
    }

    // Delete existing variants for this process
    const { data: existing } = await supabase.from("process_variants").select("id").eq("process_id", process_id);
    if (existing?.length) {
      const ids = existing.map((v: any) => v.id);
      await supabase.from("variant_steps").delete().in("variant_id", ids);
      await supabase.from("process_variants").delete().eq("process_id", process_id);
    }

    // Insert variants + steps
    for (const cluster of clusters) {
      const insights = aiInsights[cluster.variant_label] || [];
      const stepFlags = computeStepFlags(cluster.steps, referenceSteps);

      const { data: inserted, error: insErr } = await supabase.from("process_variants").insert({
        process_id,
        variant_label: cluster.variant_label,
        consultant_name: cluster.consultant_name,
        frequency: cluster.frequency,
        avg_duration_minutes: cluster.avg_duration_minutes,
        steps_json: cluster.steps,
        insights,
      }).select("id").single();

      if (insErr || !inserted) continue;

      const variantStepInserts = stepFlags.map((sf) => ({
        variant_id: inserted.id,
        step_name: sf.step_name,
        step_order: sf.step_order,
        is_skipped: sf.is_skipped,
        is_extra: sf.is_extra,
        is_reordered: sf.is_reordered,
        avg_duration_seconds: null,
        frequency_pct: 100,
      }));

      await supabase.from("variant_steps").insert(variantStepInserts);
    }

    // Also mark skipped steps (steps in reference but not in variant)
    for (const cluster of clusters) {
      const variantStepSet = new Set(cluster.steps);
      const skippedSteps = referenceSteps.filter((s) => !variantStepSet.has(s));
      if (skippedSteps.length > 0) {
        const { data: varRec } = await supabase.from("process_variants")
          .select("id")
          .eq("process_id", process_id)
          .eq("variant_label", cluster.variant_label)
          .single();
        if (varRec) {
          const skippedInserts = skippedSteps.map((s, idx) => ({
            variant_id: varRec.id,
            step_name: s,
            step_order: 900 + idx,
            is_skipped: true,
            is_extra: false,
            is_reordered: false,
            frequency_pct: 0,
          }));
          await supabase.from("variant_steps").insert(skippedInserts);
        }
      }
    }

    await supabase.from("agent_logs").insert({
      process_id, agent_name: "variant-analyzer", action: "analyze_event_log",
      status: "completed",
      message: `Analyse terminée: ${clusters.length} variantes détectées à partir de ${traces.length} traces (${allEvents.length} événements).`,
      metadata: { variants_count: clusters.length, traces_count: traces.length, events_count: allEvents.length },
    });

    return new Response(JSON.stringify({
      success: true,
      variants_count: clusters.length,
      traces_count: traces.length,
      events_count: allEvents.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("analyze-event-log-variants error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
