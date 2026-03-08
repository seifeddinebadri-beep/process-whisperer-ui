

## Plan: Event log actions per step with screenshot links

### Concept
Each extracted process step will have a list of granular **actions** derived from the event log (the uploaded CSV/document). The AI agent will analyze the raw data and describe detailed user actions for each step, linking each action to a specific PDF screenshot page when available. These actions are displayed as an expandable section within each StepCard.

### Database

**New table: `step_actions`**
```sql
CREATE TABLE public.step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  action_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  system_used TEXT,
  screenshot_page INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
With public RLS policies (SELECT, INSERT, DELETE, UPDATE).

### Edge Function: `agent-analyze-as-is/index.ts`

Update the tool call schema to include `actions` array inside each step:
```
steps[].actions: [{ description, system_used, screenshot_page }]
```

After inserting steps, also insert the actions into `step_actions` using the newly created step IDs. The system prompt instructs the LLM to break each step into granular UI/system actions observed in the event log and associate each with a PDF page number.

### Frontend Types: `types.ts`

Add:
```typescript
export interface StepAction {
  id: string;
  description: string;
  systemUsed?: string;
  screenshotPage?: number;
}
```

Add `actions?: StepAction[]` to `ProcessStep`.

### StepCard Component

- Add a collapsible "Actions" section (using Collapsible) below the step description
- Each action shows: order number, description, system badge, and a clickable screenshot link (page icon + page number)
- Clicking the screenshot link opens the full-size screenshot modal for that page

### ProcessAnalysis.tsx

- Fetch `step_actions` alongside steps (join or separate query)
- Map actions into each step's `actions` array
- Pass screenshot data to StepCard so it can resolve page numbers to URLs

### File Changes
1. **Migration**: Create `step_actions` table
2. **`supabase/functions/agent-analyze-as-is/index.ts`**: Add actions extraction to LLM tool schema + insert actions after steps
3. **`src/components/process-analysis/types.ts`**: Add `StepAction` interface
4. **`src/components/process-analysis/StepCard.tsx`**: Add collapsible actions list with screenshot links
5. **`src/pages/ProcessAnalysis.tsx`**: Fetch step_actions, merge into steps, pass screenshot resolver

