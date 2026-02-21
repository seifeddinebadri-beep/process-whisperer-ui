import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 500; // tokens (approx chars / 4)
const CHUNK_OVERLAP = 50;

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  // Approximate: 1 token ≈ 4 characters
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;
  const chunks: string[] = [];

  if (text.length <= charSize) {
    chunks.push(text.trim());
    return chunks;
  }

  let start = 0;
  while (start < text.length) {
    let end = start + charSize;
    if (end >= text.length) {
      chunks.push(text.slice(start).trim());
      break;
    }

    // Try to break at a sentence or newline boundary
    const segment = text.slice(start, end);
    const lastNewline = segment.lastIndexOf("\n");
    const lastPeriod = segment.lastIndexOf(". ");
    const breakPoint = Math.max(lastNewline, lastPeriod);

    if (breakPoint > charSize * 0.5) {
      end = start + breakPoint + 1;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - charOverlap;
  }

  return chunks.filter((c) => c.length > 0);
}

function parseCSV(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return content;

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1);

  // Convert CSV rows to readable text blocks
  return rows
    .map((row) => {
      const values = row.split(",").map((v) => v.trim());
      return headers.map((h, i) => `${h}: ${values[i] || ""}`).join(" | ");
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { process_id } = await req.json();
    if (!process_id) {
      return new Response(
        JSON.stringify({ error: "process_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the process record to find the file path
    const { data: process, error: processError } = await supabase
      .from("uploaded_processes")
      .select("*")
      .eq("id", process_id)
      .single();

    if (processError || !process) {
      return new Response(
        JSON.stringify({ error: "Process not found", details: processError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let textContent: string;

    if (process.file_path) {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("process-files")
        .download(process.file_path);

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: "Failed to download file", details: downloadError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawContent = await fileData.text();
      const fileName = process.file_name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        textContent = parseCSV(rawContent);
      } else {
        textContent = rawContent;
      }
    } else {
      // No file — build text from process steps and context
      const { data: steps } = await supabase
        .from("process_steps")
        .select("*")
        .eq("process_id", process_id)
        .order("step_order");

      const { data: context } = await supabase
        .from("process_context")
        .select("*")
        .eq("process_id", process_id)
        .single();

      const parts: string[] = [];

      if (context) {
        parts.push(`Objectif: ${context.process_objective || "N/A"}`);
        parts.push(`Contraintes: ${context.known_constraints || "N/A"}`);
        parts.push(`Points de douleur: ${context.pain_points_summary || "N/A"}`);
        parts.push(`Volume et fréquence: ${context.volume_and_frequency || "N/A"}`);
        parts.push(`Hypothèses: ${context.assumptions || "N/A"}`);
        parts.push(`Notes parties prenantes: ${context.stakeholder_notes || "N/A"}`);
      }

      if (steps && steps.length > 0) {
        parts.push("\n--- Étapes du processus ---");
        for (const step of steps) {
          parts.push(
            `Étape ${step.step_order}: ${step.name}\n` +
              `Description: ${step.description || "N/A"}\n` +
              `Rôle: ${step.role || "N/A"}\n` +
              `Outil: ${step.tool_used || "N/A"}\n` +
              `Type de décision: ${step.decision_type || "N/A"}\n` +
              `Entrées: ${(step.data_inputs || []).join(", ") || "N/A"}\n` +
              `Sorties: ${(step.data_outputs || []).join(", ") || "N/A"}\n` +
              `Points de douleur: ${step.pain_points || "N/A"}\n` +
              `Règles métier: ${step.business_rules || "N/A"}`
          );
        }
      }

      textContent = parts.join("\n");
    }

    if (!textContent || textContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No content to parse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing chunks for this process (re-parse)
    await supabase
      .from("document_chunks")
      .delete()
      .eq("process_id", process_id);

    // Chunk the text
    const chunks = chunkText(textContent, CHUNK_SIZE, CHUNK_OVERLAP);

    // Insert chunks
    const chunkInserts = chunks.map((content, index) => ({
      process_id,
      chunk_index: index,
      content,
      metadata: {
        source: process.file_name,
        total_chunks: chunks.length,
        char_length: content.length,
      },
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to insert chunks", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update process status
    await supabase
      .from("uploaded_processes")
      .update({ status: "analyzed" })
      .eq("id", process_id);

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        process_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
