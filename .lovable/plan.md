

## Plan: Adapt all AI agents to leverage screenshots and actions data

### Problem
The recent additions of `step_actions` (granular actions per step) and `screenshot_url` (on both `process_steps` and `step_actions`) are not used by any of the downstream agents. The Clarifier, Discoverer, Business Analyst, and PDD Generator all build their context without fetching actions or screenshot references, resulting in incomplete analysis.

### Changes by function

**A. `agent-clarify/index.ts` — Include actions + screenshots in context**
- Fetch `step_actions` joined per step and `process_screenshots` for the process
- Add actions under each step in the context string (e.g. "  Action 1: Description [System: X, Screenshot: Y]")
- Add screenshot list to context so the Clarifier can reference them when asking questions

**B. `analyze-process/index.ts` (Discoverer) — Enrich `buildContext()` with actions + screenshots**
- Fetch `step_actions` for all steps and `process_screenshots` for the process
- In `buildContext()`, append actions under each step with system and screenshot references
- Add screenshots section listing available visual evidence
- Update the system prompt to instruct the AI to reference specific actions and screenshots when generating use cases

**C. `agent-business-analyst/index.ts` — Include actions + screenshots in challenge context**
- Fetch `step_actions` for all steps
- Append actions under each step in contextParts
- Update system prompt to tell BA to reference granular actions and screenshot evidence when challenging

**D. `generate-pdd/index.ts` — Major enrichment**
- **Data fetching**: Fetch `step_actions` for all steps and `process_screenshots`
- **Context for AI**: Include actions per step in the context sent to the LLM, with screenshot URLs
- **Tool schema update**: Add `actions` array to `as_is_steps` schema (each with `description`, `system_used`, `screenshot_url`), add `screenshot_url` field to as-is steps, add a new `screenshots` section at document level
- **HTML generation**: 
  - Render actions as a sub-list under each as-is step card
  - Show screenshot thumbnails inline when `screenshot_url` is present (step-level and action-level)
  - Add a "Captures d'écran" appendix section showing all process screenshots with captions
- **System prompt update**: Instruct the AI to map actions to as-is steps and reference screenshots

**E. `agent-orchestrator/index.ts` — No changes needed** (delegates to other functions)

### File changes
1. `supabase/functions/agent-clarify/index.ts` — Fetch + inject actions and screenshots into context
2. `supabase/functions/analyze-process/index.ts` — Enrich `buildContext()` with actions and screenshots
3. `supabase/functions/agent-business-analyst/index.ts` — Fetch + inject actions into challenge context
4. `supabase/functions/generate-pdd/index.ts` — Fetch actions/screenshots, update schema, enrich HTML with actions sub-lists and inline screenshot images

