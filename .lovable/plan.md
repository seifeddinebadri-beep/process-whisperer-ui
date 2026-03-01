

## Plan: Step Source Highlighting and Dual-Source Comparison/Merge

### Problem
Currently, when steps are generated from the event log, there's no way to know which steps came from the event log analysis vs. the Knowledge Base context. The user wants to see both sources side by side and merge them step by step.

### Architecture

```text
ProcessAnalysis page
├── Process Selector (existing)
├── Source Toggle: "Event Log" | "Knowledge Base" | "Merged" (new)
├── Comparison View (new, when not yet merged)
│   ├── Left column: Event Log steps (auto-generated)
│   ├── Right column: KB steps (auto-generated from activity context)
│   └── Per-step actions: Accept Left / Accept Right / Merge Both
├── Merged Steps List (existing, enhanced with source badges)
└── Approve Bar (existing)
```

### Implementation Steps

**1. Add `source` column to `process_steps` table**
- New column: `source TEXT DEFAULT 'manual'` with values: `event_log`, `knowledge_base`, `manual`, `merged`
- Migration only, no breaking change (existing steps default to `manual`)

**2. Update `parse-document` edge function to tag steps with source**
- When generating steps from the uploaded file, set `source = 'event_log'`
- Add a second AI call that generates steps from KB context (activity description, business objective, tools) and inserts them with `source = 'knowledge_base'`
- Both sets are stored in `process_steps` with the same `process_id`

**3. Create `StepComparisonView` component**
- Two-column layout showing event log steps on the left, KB steps on the right
- Each step card shows a colored source badge (blue for event log, green for KB)
- Per-step actions: "Accept" (keeps step as-is), "Skip" (removes it), "Merge" (opens modal to combine two steps)
- "Accept All & Merge" button at the bottom to finalize

**4. Update `StepCard` to show source badge**
- Add optional `source` prop to `ProcessStep` type
- Display a small colored badge: "Event Log" (blue), "KB" (green), "Manual" (gray), "Merged" (purple)

**5. Update `ProcessAnalysis` page**
- When a process has steps from multiple sources (event_log + knowledge_base), show the comparison view instead of the flat list
- After merging, switch to the normal step list view with source badges visible
- Add a "Regenerate from KB" button to re-trigger KB step generation

**6. Update i18n translations**
- Add labels for source badges, comparison view headers, merge actions

### Files to Create/Edit
- `supabase/migrations/` — add `source` column to `process_steps`
- `src/components/process-analysis/types.ts` — add `source` field
- `src/components/process-analysis/StepCard.tsx` — add source badge
- `src/components/process-analysis/StepComparisonView.tsx` (new) — dual-column merge UI
- `src/pages/ProcessAnalysis.tsx` — integrate comparison view, source-aware logic
- `supabase/functions/parse-document/index.ts` — tag generated steps with `source`
- `src/lib/i18n.tsx` — add translations
- `src/data/mockClarificationData.ts` or new mock file — mock dual-source steps for UX testing

### Mock-First Approach
- The comparison view will work with mock data first (hardcoded event_log and KB steps)
- The `parse-document` changes can be wired later
- Source badges on `StepCard` work immediately with the new field

