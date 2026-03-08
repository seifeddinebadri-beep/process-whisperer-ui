

## Plan: Editable actions and screenshot management at step & action level

### Overview
Make action descriptions editable inline, and allow uploading/deleting screenshots at both the step level and individual action level.

### Changes

**A. StepCard — Inline action editing + screenshot management**

Update `StepCard.tsx` to:
- Make each action description an editable text input (click to edit, blur/enter to save)
- Add edit/delete buttons per action (small icon buttons)
- Add "Add action" button at end of actions list
- Add screenshot upload button on step level (upload replaces/sets `screenshot_url`)
- Add delete screenshot button on step level (clears `screenshot_url`)
- Add screenshot upload per action (sets `screenshot_page` or a new `screenshot_url` field)
- New callbacks: `onUpdateAction`, `onDeleteAction`, `onAddAction`, `onUploadStepScreenshot`, `onDeleteStepScreenshot`

**B. Types update (`types.ts`)**
- Add `screenshotUrl?: string` to `StepAction` interface (action-level screenshot)

**C. Database migration**
- Add `screenshot_url TEXT` column to `step_actions` table for action-level screenshots

**D. ProcessAnalysis.tsx — Wire up mutations**

Add mutations for:
- `updateActionMutation` — updates `step_actions` row (description, system_used, screenshot_url)
- `deleteActionMutation` — deletes `step_actions` row
- `addActionMutation` — inserts new `step_actions` row
- `uploadStepScreenshot` — uploads file to `process-files` bucket, updates `process_steps.screenshot_url`
- `deleteStepScreenshot` — removes file from storage, clears `process_steps.screenshot_url`
- `uploadActionScreenshot` — uploads file, updates `step_actions.screenshot_url`

Pass these handlers down to `StepCard`.

**E. StepEditModal — Add screenshot upload field**

Add a file input in the edit modal for step-level screenshot with preview/delete.

### File changes
1. **Migration**: Add `screenshot_url` column to `step_actions`
2. **`src/components/process-analysis/types.ts`**: Add `screenshotUrl` to `StepAction`
3. **`src/components/process-analysis/StepCard.tsx`**: Inline editing, add/delete actions, screenshot upload/delete buttons at step and action level
4. **`src/pages/ProcessAnalysis.tsx`**: Add action CRUD mutations, screenshot upload/delete logic, pass handlers to StepCard

