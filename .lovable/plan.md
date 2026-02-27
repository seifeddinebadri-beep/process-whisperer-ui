

## Plan: AI Clarification Agent Panel

### Concept
Add a collapsible side panel on the Process Analysis page that acts as an AI "challenger" agent. Before the user approves a process for automation discovery, the agent analyzes the current steps and context, then generates probing questions to surface missing information, ambiguities, and gaps. The user answers inline, and answers are saved to process context. This produces richer input for `analyze-process`, leading to better automation use cases.

### Architecture

```text
ProcessAnalysis page
├── Main content (existing, left side)
└── ClarificationPanel (new, right drawer/sheet)
    ├── "Start Clarification" button triggers edge function
    ├── Chat-style Q&A thread (mock data for now)
    │   ├── Agent question (markdown rendered)
    │   └── User answer (text input)
    ├── Status indicators (questions answered / total)
    └── "Apply to Context" button (merges answers into process_context)
```

### Implementation Steps

1. **Create edge function `clarify-process`**
   - Receives `process_id`
   - Loads steps + context from DB
   - Calls Lovable AI (`google/gemini-3-flash-preview`) with a system prompt that acts as a process analysis challenger
   - Uses tool calling to return structured output: array of `{ id, category, question, why }` objects (5-8 questions)
   - Categories: "missing_context", "ambiguity", "volume_detail", "exception_handling", "business_rule", "stakeholder"
   - Returns JSON array of questions

2. **Create `ClarificationPanel` component**
   - Sheet/drawer that slides from the right
   - Triggered by a new "AI Clarification" button on the Process Analysis page
   - Displays questions in a chat-like thread with agent avatar
   - Each question has a textarea for user response
   - "Submit All Answers" button sends answers back to an edge function or updates `process_context` directly
   - Mock data mode: starts with hardcoded questions for UX testing without calling the edge function

3. **Add mock data for UX testing**
   - Create `src/data/mockClarificationData.ts` with 6-8 sample questions covering different categories
   - Panel defaults to mock mode when no real AI response is available
   - Toggle between mock and live mode via a dev flag or when the edge function is called

4. **Integrate into ProcessAnalysis page**
   - Add "AI Clarification" button next to process selector
   - Pass `selectedProcessId`, `steps`, and `context` to the panel
   - After user submits answers, merge relevant answers into `process_context` fields via `updateContextMutation`

5. **Update i18n translations**
   - Add `clarification` section to both `fr` and `en` translations

### Technical Details

- **Edge function prompt strategy**: The system prompt instructs the AI to act as a senior process analyst who challenges assumptions, identifies gaps in data (missing volumes, frequencies, exception paths), and asks for specifics that would improve automation scoring.
- **Structured output via tool calling**: The edge function uses `tool_choice` to force structured JSON output with `question`, `category`, `reasoning` fields.
- **Mock-first approach**: The component renders fully with mock data so UX can be validated before wiring the edge function.
- **No new DB tables needed**: Answers are integrated into existing `process_context` fields or stored as `stakeholder_notes`.

### Files to Create/Edit
- `src/data/mockClarificationData.ts` (new)
- `src/components/process-analysis/ClarificationPanel.tsx` (new)
- `supabase/functions/clarify-process/index.ts` (new)
- `src/pages/ProcessAnalysis.tsx` (add button + panel integration)
- `src/lib/i18n.tsx` (add translations)
- `supabase/config.toml` (register new function)

