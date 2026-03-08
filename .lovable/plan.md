

## Plan: Fix discovery phase FK constraint error caused by concurrent orchestrator runs

### Root cause
The agent logs show **multiple orchestrator runs executing simultaneously** on the same process. When run #2's discoverer phase starts, it deletes all existing `automation_use_cases` (lines 506-520 in `analyze-process`), including those just inserted by run #1 — while run #1 is still generating detail pages for them. This causes the FK violation:

```
Key (use_case_id)=(...) is not present in table "automation_use_cases"
```

Additionally, the `ba_conversations` table has **no DELETE RLS policy**, so the cleanup at line 513 silently fails, potentially leaving orphan data.

### Changes

**A. `agent-orchestrator/index.ts` — Add concurrency lock**
- Before starting the pipeline, check `agent_logs` for an existing "orchestrate" + "started" entry for this process_id that has no matching "completed" or "error" entry
- If found, return early with a message "Pipeline already running for this process"
- This prevents concurrent runs from trampling each other's data

**B. `analyze-process/index.ts` — Make detail inserts resilient**
- Before inserting into `use_case_details`, verify the `use_case_id` still exists in `automation_use_cases` with a quick select
- Skip the insert if the use case was deleted (log a warning instead of crashing)

**C. Database migration — Add DELETE policy for `ba_conversations`**
- Add a DELETE RLS policy so the cleanup code actually works

### Files
1. `supabase/functions/agent-orchestrator/index.ts` — concurrency guard
2. `supabase/functions/analyze-process/index.ts` — resilient detail inserts
3. DB migration — `ba_conversations` DELETE policy

