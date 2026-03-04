

## Plan: Clarifier agent — batch of 5 questions with continue/proceed checkpoint

### Concept
After every 5 questions answered/skipped, the Clarifier pauses and presents a choice: "Continue clarification" or "Proceed to discovery". This happens entirely on the frontend — no backend changes needed since the edge function already supports batched question fetching with `total_questions_asked`.

### Changes

**1. Edge function `agent-clarify/index.ts`**
- Change the prompt to always generate exactly 5 questions per round (instead of 3-4)
- Update: `Génère exactement 5 questions` instead of variable counts

**2. Frontend `ClarificationPanel.tsx`**
- Add a new state `showCheckpoint` (boolean) to track when all 5 questions in a batch are done
- After the last question in a batch (when `pendingQuestions` empties), instead of auto-fetching the next round, set `showCheckpoint = true`
- Render a checkpoint UI at the bottom: an agent message asking "Do you want to continue or proceed to discovery?" with two buttons:
  - **"Continuer la clarification"** — calls `fetchQuestions()` for the next batch of 5
  - **"Passer à la découverte"** — triggers `handleApply()` to save answers and close the panel
- Reset `showCheckpoint = false` when fetching new questions

### UI checkpoint (rendered in the input area when `showCheckpoint` is true)
- Agent message: "J'ai posé 5 questions. Souhaitez-vous continuer la clarification ou passer à la découverte d'automatisation ?"
- Two buttons side by side: "Continuer" (outline) and "Passer à la découverte" (primary)

