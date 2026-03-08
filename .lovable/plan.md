

## Plan: PDF with screenshots alongside CSV + Screenshot visualization in Process Analysis

### Current Architecture
- **Upload flow** (`ProcessUpload.tsx`): Accepts single CSV/TXT/JSON file, uploads to `process-files` bucket, then triggers parsing + analysis
- **Analysis agent** (`agent-analyze-as-is`): Reads document chunks (text) and extracts steps using Gemini
- **Process steps table**: Has text fields but no image/screenshot reference
- **StepCard component**: Displays text-only step data

### Proposed Changes

**A. Database: Add screenshot support to `process_steps`**
- Add `screenshot_url TEXT` column to store reference to screenshot image for each step

**B. Create `process_screenshots` table**
New table to store extracted PDF screenshots:
```sql
CREATE TABLE public.process_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES uploaded_processes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  page_number INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**C. Update Upload Flow (`ProcessUpload.tsx`)**
1. Add secondary file input for PDF attachment ("Documentation visuelle")
2. Accept multiple files: primary CSV + optional PDF(s)
3. Upload PDF to `process-files` bucket under `{process_id}/screenshots/`
4. Store references in `process_screenshots` table

**D. Parse PDF for screenshots (`parse-document` edge function)**
1. Detect if process has PDF attachments
2. Use `document--parse_document` style extraction: send PDF pages to Gemini vision model
3. Each page screenshot is saved to storage and linked to process

**E. Update Analysis Agent (`agent-analyze-as-is`)**
1. Fetch associated screenshots from `process_screenshots`
2. Include images in multimodal LLM call (Gemini supports image input)
3. When extracting steps, LLM can reference screenshots and assign `screenshot_url` to relevant steps

**F. Update `StepCard` component**
- Add thumbnail preview when `screenshot_url` exists
- Click to open full-size modal with screenshot

**G. Add Screenshot Gallery View (`ProcessAnalysis.tsx`)**
- New tab/section "Captures d'écran" alongside Steps and BPMN views
- Grid view of all process screenshots
- Click to view full size, shows page number and any caption

### File Changes
1. **Migration**: Add `process_screenshots` table + `screenshot_url` column to `process_steps`
2. **`src/pages/ProcessUpload.tsx`**: Secondary PDF file input, upload logic
3. **`supabase/functions/agent-analyze-as-is/index.ts`**: Multimodal image analysis
4. **`src/components/process-analysis/StepCard.tsx`**: Screenshot thumbnail + modal
5. **`src/pages/ProcessAnalysis.tsx`**: Add screenshot gallery tab
6. **`src/lib/i18n.tsx`**: New translations
7. New component: **`src/components/process-analysis/ScreenshotGallery.tsx`**

