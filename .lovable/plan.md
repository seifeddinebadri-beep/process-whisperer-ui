

## Plan: Improve action visibility in StepCards

### Problem identified
Two issues found after investigating:

1. **Real processes have 0 actions** — Only the demo "Comptabilité Fournisseurs" process has actions (32 total). All other processes (`process_as_is 1.json`, `process_as_is_GSP.json`, etc.) were analyzed before the action extraction feature was added, so they have no `step_actions` data.

2. **Actions trigger is easy to miss** — The collapsible trigger ("5 actions détaillées") is a small 11px text link that blends in. Users may not notice it.

### Changes

**A. Auto-expand actions and improve visibility (`StepCard.tsx`)**
- Default `actionsOpen` to `true` instead of `false` so actions are visible immediately
- Make the trigger more prominent: use a small pill/badge style instead of plain text link
- Add a subtle background to the actions area for visual separation
- Add action count badge next to step name

**B. Add "Extract actions" button for processes without actions (`ProcessAnalysis.tsx`)**
- When a process has steps but no actions across any step, show a banner with a button "Extraire les actions détaillées"
- This button calls the `agent-analyze-as-is` edge function with a new flag `extract_actions_only: true` that only adds actions to existing steps (without re-creating steps)

**C. Update edge function to support action-only extraction (`agent-analyze-as-is/index.ts`)**
- Add a new mode: when `extract_actions_only` is true, fetch existing steps, send them + document chunks to the LLM, and ask it to generate granular actions for each step
- Insert actions into `step_actions` table, linked to existing step IDs

### File changes
1. `src/components/process-analysis/StepCard.tsx` — Auto-expand actions, better styling
2. `src/pages/ProcessAnalysis.tsx` — Add "extract actions" banner + mutation
3. `supabase/functions/agent-analyze-as-is/index.ts` — Add `extract_actions_only` mode

