

## Plan: Make the full pipeline work end-to-end

### Problems identified

1. **Concurrency guard is ineffective** — The logs show 6+ orchestrator "started" entries with no matching "completed" for the same process. The guard only checks the latest "started" but old stale entries from timed-out runs pollute the check.

2. **Embeddings cause 504 timeouts** — `generate-embeddings` calls the AI gateway per chunk with 1s delays. Edge functions timeout at ~60s. With 4 chunks this takes 30-40s of AI calls + delays, often exceeding the limit. Since the analyst now has a fallback (no chunks needed), embeddings should be made optional and non-blocking.

3. **`step_actions` global delete bug** — In `agent-analyze-as-is` line 439: `delete().neq("id", "00000000-...")` deletes ALL step_actions across ALL processes, not just the current one.

4. **`ba_messages` missing DELETE RLS** — Cleanup in `analyze-process` silently fails when deleting ba_messages.

5. **Upload flow duplicates orchestrator work** — Upload already runs parse → embeddings → analyze. The orchestrator re-runs all of these. This is wasteful and confusing.

### Changes

**A. Fix concurrency guard in `agent-orchestrator`**
- Before starting, clean up stale "started" entries older than 10 minutes that have no matching end entry — mark them as "error" (timeout)
- Then check if there's a genuinely active run

**B. Make embeddings non-blocking in orchestrator**
- Skip the embeddings phase entirely in the orchestrator since `agent-analyze-as-is` already has the fallback to work without chunks/embeddings
- The upload flow already generates embeddings; no need to redo in orchestrator
- This eliminates the most common 504 failure

**C. Fix `step_actions` scoped delete in `agent-analyze-as-is`**
- Replace the global delete with a scoped delete: get step IDs for the current process, then delete step_actions only for those steps

**D. Add DELETE RLS policy for `ba_messages`**
- Database migration to allow deleting ba_messages

**E. Orchestrator: skip phases already done during upload**
- Check if process already has steps (from upload's analyze call) and skip the parse/analyst phases if data exists
- Or: always re-run (current behavior) but with the fixes above it won't break

### Files to edit
1. `supabase/functions/agent-orchestrator/index.ts` — fix guard, skip embeddings
2. `supabase/functions/agent-analyze-as-is/index.ts` — fix step_actions scoped delete
3. Database migration — ba_messages DELETE policy

