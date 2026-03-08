import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function log(supabase: any, processId: string, action: string, status: string, message: string, metadata?: any) {
  await supabase.from("agent_logs").insert({
    process_id: processId,
    agent_name: "orchestrator",
    action,
    status,
    message,
    metadata: metadata || {},
  });
}

async function callFunction(functionName: string, body: any): Promise<any> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${functionName} failed [${res.status}]: ${errText}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let process_id: string | undefined;

  try {
    ({ process_id } = await req.json());
    if (!process_id) {
      return new Response(JSON.stringify({ error: "process_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Concurrency guard =====
    // First, mark stale "started" entries older than 10 min as timed out
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: staleRuns } = await supabase
      .from("agent_logs")
      .select("id, created_at")
      .eq("process_id", process_id)
      .eq("agent_name", "orchestrator")
      .eq("action", "orchestrate")
      .eq("status", "started")
      .lt("created_at", tenMinAgo);

    if (staleRuns && staleRuns.length > 0) {
      for (const stale of staleRuns) {
        await supabase.from("agent_logs").insert({
          process_id,
          agent_name: "orchestrator",
          action: "orchestrate",
          status: "error",
          message: "Marked as timed out (stale started entry older than 10 min).",
        });
      }
    }

    // Now check for genuinely active runs (started in last 10 min with no end)
    const { data: activeRuns } = await supabase
      .from("agent_logs")
      .select("id, created_at")
      .eq("process_id", process_id)
      .eq("agent_name", "orchestrator")
      .eq("action", "orchestrate")
      .eq("status", "started")
      .gte("created_at", tenMinAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeRuns && activeRuns.length > 0) {
      const { data: endEntries } = await supabase
        .from("agent_logs")
        .select("id")
        .eq("process_id", process_id)
        .eq("agent_name", "orchestrator")
        .eq("action", "orchestrate")
        .in("status", ["completed", "error"])
        .gte("created_at", activeRuns[0].created_at)
        .limit(1);

      if (!endEntries || endEntries.length === 0) {
        return new Response(JSON.stringify({ error: "Pipeline already running for this process. Please wait for it to finish." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await log(supabase, process_id, "orchestrate", "started", "Orchestrator started — launching full analysis pipeline...");

    // ===== Check for PDF path =====
    const { data: processRecord } = await supabase
      .from("uploaded_processes")
      .select("file_path, file_name")
      .eq("id", process_id)
      .single();

    // Check if there's a PDF in the screenshots folder for this process
    let pdfPath: string | null = null;
    const { data: existingScreenshots } = await supabase
      .from("process_screenshots")
      .select("file_path")
      .eq("process_id", process_id)
      .limit(1);
    if (existingScreenshots?.length && existingScreenshots[0].file_path?.endsWith(".pdf")) {
      pdfPath = existingScreenshots[0].file_path;
    }

    // ===== PHASE 0a: Parse document into chunks =====
    await log(supabase, process_id, "phase_parse", "started", "Phase 0a/5 — Parsing document into chunks...");
    try {
      const parseResult = await callFunction("parse-document", { process_id });
      await log(supabase, process_id, "phase_parse", "completed",
        `Parsing done: ${parseResult.chunks_created || 0} chunks created.`,
        { chunks_created: parseResult.chunks_created }
      );
    } catch (e) {
      await log(supabase, process_id, "phase_parse", "warning", `Parsing failed: ${(e as Error).message}. Continuing...`);
    }

    // ===== PHASE 0b: Generate embeddings =====
    await log(supabase, process_id, "phase_embeddings", "started", "Phase 0b/5 — Generating vector embeddings...");
    try {
      await callFunction("generate-embeddings", { process_id });
      await log(supabase, process_id, "phase_embeddings", "completed", "Embeddings generated.");
    } catch (e) {
      await log(supabase, process_id, "phase_embeddings", "warning", `Embeddings failed: ${(e as Error).message}. Continuing...`);
    }

    // ===== PHASE 1: Analyst =====
    await log(supabase, process_id, "phase_analyst", "started", "Phase 1/5 — Analyst: extracting process steps and context...");
    
    let analystResult: any;
    try {
      analystResult = await callFunction("agent-analyze-as-is", { process_id, pdf_path: pdfPath });
      await log(supabase, process_id, "phase_analyst", "completed",
        `Analyst done: ${analystResult.steps_count || 0} steps extracted, confidence ${analystResult.confidence || "N/A"}%.`,
        { steps_count: analystResult.steps_count, confidence: analystResult.confidence }
      );
    } catch (e) {
      await log(supabase, process_id, "phase_analyst", "error", `Analyst failed: ${(e as Error).message}`);
      throw e;
    }

    // ===== PHASE 1b: Screenshot Extraction =====
    if (pdfPath) {
      await log(supabase, process_id, "phase_screenshots", "started", "Phase 1b/5 — Extracting PDF screenshots and linking to steps...");
      try {
        const ssResult = await callFunction("extract-pdf-screenshots", { process_id, pdf_path: pdfPath });
        await log(supabase, process_id, "phase_screenshots", "completed",
          `Screenshots done: ${ssResult.screenshots_created || 0} pages extracted, ${ssResult.steps_linked || 0} steps linked.`,
          ssResult
        );
      } catch (e) {
        await log(supabase, process_id, "phase_screenshots", "warning", `Screenshot extraction failed: ${(e as Error).message}`);
      }
    }

    // ===== PHASE 2: Clarifier =====
    await log(supabase, process_id, "phase_clarifier", "started", "Phase 2/5 — Clarifier: generating and auto-answering questions...");

    let questionsAnswered = 0;
    try {
      // Generate first round of questions
      const clarifyResult = await callFunction("agent-clarify", { process_id, conversation_history: [] });
      const questions = clarifyResult.questions || [];
      
      if (questions.length > 0) {
        // Auto-answer each question by picking the first option
        const answers: { question: string; answer: string }[] = [];
        for (const q of questions) {
          const firstOption = q.options?.[0];
          if (firstOption) {
            answers.push({
              question: q.question,
              answer: firstOption.label + (firstOption.description ? ` — ${firstOption.description}` : ""),
            });
          }
        }
        questionsAnswered = answers.length;

        // Save answers to process_context.stakeholder_notes
        if (answers.length > 0) {
          const allText = answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
          const { data: existing } = await supabase
            .from("process_context")
            .select("id, stakeholder_notes")
            .eq("process_id", process_id)
            .maybeSingle();

          if (existing) {
            const combined = existing.stakeholder_notes
              ? `${existing.stakeholder_notes}\n\n---\n\n${allText}`
              : allText;
            await supabase.from("process_context").update({ stakeholder_notes: combined }).eq("id", existing.id);
          } else {
            await supabase.from("process_context").insert({ process_id, stakeholder_notes: allText });
          }
        }
      }

      await log(supabase, process_id, "phase_clarifier", "completed",
        `Clarifier done: ${questionsAnswered} questions auto-answered.`,
        { questions_generated: questions.length, questions_answered: questionsAnswered }
      );
    } catch (e) {
      await log(supabase, process_id, "phase_clarifier", "error", `Clarifier failed: ${(e as Error).message}`);
      throw e;
    }

    // ===== PHASE 3: Discoverer (use cases + variants + detailed pages) =====
    await log(supabase, process_id, "phase_discoverer", "started", "Phase 3/5 — Discoverer: identifying automation use cases, variants, and generating detailed pages...");

    let discovererResult: any;
    try {
      discovererResult = await callFunction("analyze-process", { process_id });
      await log(supabase, process_id, "phase_discoverer", "completed",
        `Discoverer done: ${discovererResult.use_cases_count || 0} use cases, ${discovererResult.variants_count || 0} variants, ${discovererResult.details_count || 0} detailed pages.`,
        { use_cases_count: discovererResult.use_cases_count, variants_count: discovererResult.variants_count, details_count: discovererResult.details_count }
      );
    } catch (e) {
      await log(supabase, process_id, "phase_discoverer", "error", `Discoverer failed: ${(e as Error).message}`);
      throw e;
    }

    // ===== PHASE 4: Business Analyst =====
    await log(supabase, process_id, "phase_ba", "started", "Phase 4/5 — Business Analyst: challenging use cases and generating PDDs...");

    let pddsGenerated = 0;
    try {
      // Get all use cases for this process
      const { data: useCases } = await supabase
        .from("automation_use_cases")
        .select("id, title")
        .eq("process_id", process_id);

      for (const uc of (useCases || [])) {
        try {
          await log(supabase, process_id, "phase_ba", "started",
            `BA: Challenging use case "${uc.title}"...`
          );

          // Start conversation
          let baResult = await callFunction("agent-business-analyst", { use_case_id: uc.id });
          const convId = baResult.conversation_id;
          let rounds = 0;
          const maxRounds = 4;

          // Auto-answer BA questions
          while (!baResult.pdd_ready && rounds < maxRounds && baResult.question) {
            const firstOption = baResult.question.options?.[0];
            const answer = firstOption
              ? firstOption.label + (firstOption.description ? ` — ${firstOption.description}` : "")
              : "Oui, c'est correct.";

            baResult = await callFunction("agent-business-analyst", {
              use_case_id: uc.id,
              conversation_id: convId,
              user_message: answer,
            });
            rounds++;
          }

          // Generate PDD
          try {
            await callFunction("generate-pdd", {
              use_case_id: uc.id,
              conversation_id: convId,
            });
            pddsGenerated++;
          } catch (pddErr) {
            console.error(`PDD generation failed for ${uc.title}:`, pddErr);
            await log(supabase, process_id, "phase_ba", "warning",
              `PDD generation failed for "${uc.title}": ${(pddErr as Error).message}`
            );
          }
        } catch (ucErr) {
          console.error(`BA failed for ${uc.title}:`, ucErr);
          await log(supabase, process_id, "phase_ba", "warning",
            `BA challenge failed for "${uc.title}": ${(ucErr as Error).message}. Skipping.`
          );
        }
      }

      await log(supabase, process_id, "phase_ba", "completed",
        `BA done: ${pddsGenerated} PDDs generated for ${useCases?.length || 0} use cases.`,
        { pdds_generated: pddsGenerated, use_cases_count: useCases?.length || 0 }
      );
    } catch (e) {
      await log(supabase, process_id, "phase_ba", "error", `BA failed: ${(e as Error).message}`);
      throw e;
    }

    // ===== COMPLETE =====
    const summary = {
      steps_extracted: analystResult?.steps_count || 0,
      questions_answered: questionsAnswered,
      use_cases_found: discovererResult?.use_cases_count || 0,
      variants_found: discovererResult?.variants_count || 0,
      details_generated: discovererResult?.details_count || 0,
      pdds_generated: pddsGenerated,
    };

    await log(supabase, process_id, "orchestrate", "completed",
      `Pipeline complete: ${summary.steps_extracted} steps, ${summary.questions_answered} questions, ${summary.use_cases_found} use cases, ${summary.details_generated} detailed pages, ${summary.pdds_generated} PDDs.`,
      summary
    );

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-orchestrator error:", e);
    if (process_id) {
      await log(supabase, process_id, "orchestrate", "error", (e as Error).message || "Unknown error");
    }
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
