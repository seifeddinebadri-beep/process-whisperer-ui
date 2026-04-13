

## Plan: Event Log Upload with Variant Detection in Process Analysis

### What
Add the ability to upload event log files (.csv, .json, .txt) or .zip archives directly within the Process Analysis module. The system will parse the logs, segment traces by consultant/resource, detect process variants, and render a comparative view highlighting differences across execution patterns.

### Database Changes

**New table: `process_variants`**
- `id` (uuid PK), `process_id` (FK → uploaded_processes), `variant_label` (text, e.g. "Variant A — Consultant X"), `consultant_name` (text), `frequency` (int — how many traces follow this variant), `avg_duration_minutes` (float), `steps_json` (jsonb — ordered array of step names/IDs), `insights` (jsonb — array of textual insights), `created_at` (timestamptz)

**New table: `variant_steps`**
- `id` (uuid PK), `variant_id` (FK → process_variants), `step_name` (text), `step_order` (int), `is_skipped` (bool default false), `is_extra` (bool default false), `is_reordered` (bool default false), `avg_duration_seconds` (float), `frequency_pct` (float — % of traces including this step)

RLS: open read, service-role write (no auth currently).

### Edge Function: `analyze-event-log-variants`

Receives `{ process_id, file_path }`. Steps:
1. Download file from storage bucket `process-files`
2. If `.zip`, extract individual CSVs using `JSZip`
3. Parse each CSV/JSON to extract events with columns: `case_id`, `activity`, `resource/consultant`, `timestamp`
4. Group traces by `resource` → build per-consultant ordered step sequences
5. Cluster identical sequences into variants
6. Call Lovable AI (gemini-2.5-flash) with the variant data to generate insights like "Consultant A skips Step 3 in 70% of cases"
7. Persist results into `process_variants` + `variant_steps`
8. Log in `agent_logs`

### Frontend Changes

**1. Upload section in ProcessAnalysis.tsx**
- Add an "Upload Event Log" button (with Upload icon) in the process header area
- Accept `.csv`, `.json`, `.txt`, `.zip` files
- On upload: store in `process-files` bucket, call `analyze-event-log-variants` edge function
- Show progress via toast/loader

**2. New component: `VariantAnalysisPanel.tsx`**
- Query `process_variants` + `variant_steps` for the selected process
- Display a summary card showing: number of variants detected, number of consultants, total traces
- For each variant: collapsible card with consultant name, frequency, avg duration
- Color-coded step list: green = standard, red = skipped, blue = extra, orange = reordered
- Insights section with AI-generated observations as bullet points

**3. New component: `VariantComparisonFlow.tsx`**
- Side-by-side or overlay BPMN-like flow view using ReactFlow
- Each variant rendered as a lane/column
- Shared steps aligned horizontally; deviations highlighted with colored borders
- Legend explaining color coding

**4. Integration in ProcessAnalysis page**
- New tab or section below BPMN flow: "Analyse des Variantes"
- Only visible when variant data exists for the selected process
- Includes both the panel and comparative flow view

### Files

| Action | File |
|--------|------|
| Migration | `process_variants` + `variant_steps` tables |
| Create | `supabase/functions/analyze-event-log-variants/index.ts` |
| Create | `src/components/process-analysis/VariantAnalysisPanel.tsx` |
| Create | `src/components/process-analysis/VariantComparisonFlow.tsx` |
| Edit | `src/pages/ProcessAnalysis.tsx` — upload button + variant section |

### Technical Notes
- ZIP parsing uses `JSZip` (available via esm.sh in Deno edge functions)
- CSV parsing done manually (split lines, detect delimiter) — no heavy library needed
- The AI call generates structured insights in JSON via function calling
- Mock data included for demo process to preview the UI immediately

