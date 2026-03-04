

# Plan: Make the Full Platform Work End-to-End

## Current State Assessment

The platform already has significant infrastructure in place:
- **Knowledge Base**: Fully functional with DB CRUD (companies, departments, entities, activities, tools)
- **Process Upload**: Functional — uploads files to storage, creates DB records, calls `parse-document` and `generate-embeddings` edge functions
- **Process Analysis**: Reads steps/context from DB, allows editing, has approve flow and BPMN view. Falls back to mock data when DB is empty
- **Automation Discovery**: Reads use cases from DB, displays cards/table. Falls back to mock data
- **Use Case Detail**: Reads variants from DB, shows radar chart, comparison table. Falls back to mock data
- **Edge Functions**: `parse-document`, `generate-embeddings`, `rag-query`, `analyze-process`, `generate-variant-pdf` all exist and are deployed

## What's Missing / Broken

### 1. Overview Page — Uses Only Mock Data
The Overview page (`Overview.tsx`) reads from `mockData.ts` static arrays instead of querying the database. It shows hardcoded stats and activity feed.

**Fix**: Replace mock data with live Supabase queries for companies count, departments count, processes count, use cases count, pipeline status breakdown, and recent upload activity.

### 2. Process Upload — Missing "Analyze" Trigger
After uploading and parsing, the process status is set to `analyzed` but there's no button to trigger the `analyze-process` edge function which generates automation use cases. The user must manually trigger analysis.

**Fix**: Add an "Analyze" action button in the upload history table (or on the Process Analysis page) that calls `analyze-process` edge function for a selected process.

### 3. Process Analysis — No Auto-Parse of Uploaded Steps
When a file is uploaded (CSV/text), `parse-document` creates document chunks but does NOT extract structured process steps into `process_steps` table. The analysis page shows mock data because `process_steps` is empty for real uploads.

**Fix**: Create a new edge function `extract-steps` (or enhance `parse-document`) that uses LLM to extract structured steps from the parsed document chunks and inserts them into `process_steps` and `process_context` tables. Call it after parsing.

### 4. Discovery — No "Launch Discovery" Button
The `analyze-process` edge function exists but there's no UI trigger. After approving a process, the user should be able to launch automation discovery.

**Fix**: Add a "Launch Discovery" button on the Process Analysis page (after approval) that calls `analyze-process`, which generates use cases and variants.

### 5. Clarification Panel — Uses Only Mock Questions
The `ClarificationPanel` uses hardcoded `mockClarificationQuestions`. It should generate context-aware questions using RAG + LLM based on the actual process data.

**Fix**: Create an edge function `generate-clarifications` that uses the process context + RAG to generate relevant clarification questions. Wire the panel to call this function.

### 6. Knowledge Base — Missing Tool CRUD
Tools can be viewed but there's no "Add Tool" dialog in the Knowledge Base page.

**Fix**: Add an "Add Tool" dialog with fields: name, type (manual/semi-automated/system), purpose, documentation.

## Implementation Tasks

### Task 1: Overview Page — Live Database Queries
- Replace `mockData.ts` imports with Supabase queries
- Query: companies count, departments count, uploaded_processes count, automation_use_cases count
- Query: uploaded_processes grouped by status for pipeline chart
- Query: recent uploaded_processes ordered by upload_date for activity feed

### Task 2: Extract Steps Edge Function
- Create `supabase/functions/extract-steps/index.ts`
- Takes `process_id`, reads document chunks, calls LLM with tool calling to extract structured steps
- Inserts into `process_steps` and `process_context` tables
- Update `ProcessUpload.tsx` to call `extract-steps` after `generate-embeddings`
- Update `supabase/config.toml` with the new function

### Task 3: Launch Discovery Button
- On `ProcessAnalysis.tsx`, add a "Launch Discovery" button next to the Approve button
- Calls `analyze-process` edge function
- Shows loading state, then navigates to `/automation-discovery` on success
- Only enabled when process status is `approved`

### Task 4: Generate Clarification Questions via LLM
- Create `supabase/functions/generate-clarifications/index.ts`
- Takes `process_id`, reads steps + context + RAG chunks
- Uses LLM to generate contextual clarification questions with options
- Update `ClarificationPanel.tsx` to fetch questions from this function instead of mock data

### Task 5: Add Tool CRUD in Knowledge Base
- Add "Add Tool" button and dialog in the departments view
- Fields: name, type (select), purpose, documentation (optional)
- Insert into `tools` table with `company_id`

### Task 6: Wire File Type Support
- Update `ProcessUpload.tsx` to accept `.json` files (currently only `.csv,.txt`)
- JSON files contain structured process data (like the tickets JSON) — parse them directly into steps

## Technical Architecture

```text
Upload Flow (enhanced):
  File Upload → Storage
       ↓
  parse-document (chunks text)
       ↓
  generate-embeddings (vector embeddings)
       ↓
  extract-steps (LLM extracts structured steps) ← NEW
       ↓
  Process Analysis page (edit/enrich steps)
       ↓
  Approve → analyze-process (generates use cases + variants)
       ↓
  Automation Discovery page
```

## Edge Function Details

### `extract-steps` (new)
- Input: `{ process_id }`
- Reads document_chunks for the process
- Calls Lovable AI (`google/gemini-3-flash-preview`) with tool calling
- Tool schema: `extract_process_data` returning `{ steps: [...], context: {...} }`
- Inserts into `process_steps` and `process_context`
- Updates process status to `analyzed`

### `generate-clarifications` (new)
- Input: `{ process_id }`
- Reads steps + context + top RAG chunks
- Calls LLM to generate 5-8 clarification questions with options
- Returns JSON array of questions

## Files to Create
- `supabase/functions/extract-steps/index.ts`
- `supabase/functions/generate-clarifications/index.ts`

## Files to Edit
- `src/pages/Overview.tsx` — live DB queries
- `src/pages/ProcessUpload.tsx` — call extract-steps, accept .json
- `src/pages/ProcessAnalysis.tsx` — add Launch Discovery button
- `src/components/process-analysis/ClarificationPanel.tsx` — fetch from edge function
- `src/pages/KnowledgeBase.tsx` — add tool CRUD
- `supabase/config.toml` — register new functions

