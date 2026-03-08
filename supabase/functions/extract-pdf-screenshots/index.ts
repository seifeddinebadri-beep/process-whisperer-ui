import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const body = await req.json();
    process_id = body.process_id;
    const pdf_path: string | null = body.pdf_path || null;

    if (!process_id) {
      return new Response(JSON.stringify({ error: "process_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdf_path) {
      return new Response(
        JSON.stringify({ success: true, screenshots_created: 0, message: "No PDF path provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("agent_logs").insert({
      process_id,
      agent_name: "screenshot_extractor",
      action: "extract_screenshots",
      status: "started",
      message: "Downloading PDF and analyzing pages...",
    });

    // Download the PDF
    const { data: pdfData, error: pdfError } = await supabase.storage
      .from("process-files")
      .download(pdf_path);

    if (pdfError || !pdfData) {
      throw new Error(`Failed to download PDF: ${pdfError?.message || "No data"}`);
    }

    const pdfBytes = await pdfData.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Fetch existing steps to help AI map pages to steps
    const { data: existingSteps } = await supabase
      .from("process_steps")
      .select("id, name, description, step_order, screenshot_url")
      .eq("process_id", process_id)
      .order("step_order");

    const stepsContext = (existingSteps || [])
      .map((s: any) => `Step ${s.step_order} (id: ${s.id}): ${s.name} — ${s.description || "N/A"}`)
      .join("\n");

    // Also fetch existing step_actions
    const stepIds = (existingSteps || []).map((s: any) => s.id);
    let actionsContext = "";
    if (stepIds.length > 0) {
      const { data: actions } = await supabase
        .from("step_actions")
        .select("id, step_id, description, action_order, system_used, screenshot_page")
        .in("step_id", stepIds)
        .order("action_order");

      if (actions?.length) {
        actionsContext = "\n\nActions existantes:\n" + actions.map((a: any) =>
          `  Action (id: ${a.id}, step_id: ${a.step_id}): ${a.description} [System: ${a.system_used || "N/A"}]`
        ).join("\n");
      }
    }

    // Send PDF to vision AI to analyze each page
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en analyse de documents de processus métier. " +
              "On te donne un PDF contenant des captures d'écran d'un processus. " +
              "Analyse CHAQUE page du PDF et pour chacune :\n" +
              "1. Décris ce que montre la page (interface système, formulaire, tableau de bord, etc.)\n" +
              "2. Associe la page à l'étape de processus correspondante (step_id) si applicable\n" +
              "3. Associe la page à des actions spécifiques (action_ids) si applicable\n" +
              "RÈGLES: Ne force pas d'association si la page ne correspond à aucune étape. " +
              "Retourne UNIQUEMENT via l'appel de fonction.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
              },
              {
                type: "text",
                text:
                  `Analyse chaque page de ce PDF et décris son contenu.\n\n` +
                  `Étapes du processus existantes:\n${stepsContext || "Aucune étape extraite"}` +
                  actionsContext,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_page_screenshots",
              description: "Extract page-level screenshot descriptions from PDF",
              parameters: {
                type: "object",
                properties: {
                  pages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        page_number: { type: "number", description: "Numéro de la page (1-indexed)" },
                        caption: { type: "string", description: "Description de ce que montre la page" },
                        matched_step_id: { type: "string", description: "UUID de l'étape correspondante, ou null" },
                        matched_action_ids: {
                          type: "array",
                          items: { type: "string" },
                          description: "UUIDs des actions correspondantes",
                        },
                      },
                      required: ["page_number", "caption"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["pages"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_page_screenshots" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { pages } = JSON.parse(toolCall.function.arguments);

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      await supabase.from("agent_logs").insert({
        process_id,
        agent_name: "screenshot_extractor",
        action: "extract_screenshots",
        status: "completed",
        message: "AI could not identify any pages in the PDF.",
      });
      return new Response(
        JSON.stringify({ success: true, screenshots_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing screenshots for this process (re-extract)
    await supabase.from("process_screenshots").delete().eq("process_id", process_id);

    // Build a signed URL base for the PDF
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Insert each page as a process_screenshot
    const validStepIds = new Set((existingSteps || []).map((s: any) => s.id));
    let screenshotsCreated = 0;
    const stepToPages: Record<string, number[]> = {};
    const actionToPage: Record<string, number> = {};

    for (const page of pages) {
      const { error: insertErr } = await supabase.from("process_screenshots").insert({
        process_id,
        file_path: pdf_path,
        page_number: page.page_number,
        caption: page.caption || null,
      });

      if (!insertErr) screenshotsCreated++;

      // Track step-to-page mapping
      if (page.matched_step_id && validStepIds.has(page.matched_step_id)) {
        if (!stepToPages[page.matched_step_id]) stepToPages[page.matched_step_id] = [];
        stepToPages[page.matched_step_id].push(page.page_number);
      }

      // Track action-to-page mapping
      if (page.matched_action_ids?.length) {
        for (const actionId of page.matched_action_ids) {
          actionToPage[actionId] = page.page_number;
        }
      }
    }

    // Update process_steps.screenshot_url with page references
    for (const [stepId, pageNumbers] of Object.entries(stepToPages)) {
      const pageRef = pageNumbers.length === 1 ? `page:${pageNumbers[0]}` : `pages:${pageNumbers.join(",")}`;
      await supabase
        .from("process_steps")
        .update({ screenshot_url: pageRef })
        .eq("id", stepId);
    }

    // Update step_actions.screenshot_url and screenshot_page with page references
    for (const [actionId, pageNum] of Object.entries(actionToPage)) {
      await supabase
        .from("step_actions")
        .update({
          screenshot_page: pageNum,
          screenshot_url: `page:${pageNum}`,
        })
        .eq("id", actionId);
    }

    await supabase.from("agent_logs").insert({
      process_id,
      agent_name: "screenshot_extractor",
      action: "extract_screenshots",
      status: "completed",
      message: `Extracted ${screenshotsCreated} page screenshots. Linked ${Object.keys(stepToPages).length} steps and ${Object.keys(actionToPage).length} actions.`,
      metadata: {
        screenshots_created: screenshotsCreated,
        steps_linked: Object.keys(stepToPages).length,
        actions_linked: Object.keys(actionToPage).length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        screenshots_created: screenshotsCreated,
        steps_linked: Object.keys(stepToPages).length,
        actions_linked: Object.keys(actionToPage).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-pdf-screenshots error:", e);
    if (process_id) {
      await supabase.from("agent_logs").insert({
        process_id,
        agent_name: "screenshot_extractor",
        action: "extract_screenshots",
        status: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
