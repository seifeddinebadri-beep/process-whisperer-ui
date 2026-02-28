

## Plan: Multi-Choice Answers in Clarification Panel

Transform each clarification question from a free-text textarea into a multi-choice interface where the AI agent proposes 2-4 suggested answers, plus an "Other" option for custom free-text input.

### Changes

1. **Update mock data model** (`src/data/mockClarificationData.ts`)
   - Add `options: { label: string; description?: string }[]` field to `ClarificationQuestion`
   - Add `allowOther: boolean` field (default true)
   - Update `answer` to `selectedOptions: string[]` + `customAnswer?: string`
   - Populate each of the 8 mock questions with 2-4 relevant suggested answers

2. **Refactor ClarificationPanel answer area** (`src/components/process-analysis/ClarificationPanel.tsx`)
   - Replace the `Textarea` with a list of clickable option cards (radio-style or multi-select chips)
   - Each option: bordered card with label + optional description, highlighted when selected
   - Add an "Other" option at the bottom that expands a textarea when selected
   - Track selected options per question in state
   - Update `handleApplyToContext` to combine selected option labels + custom text into the context string

3. **Update i18n** (`src/lib/i18n.tsx`)
   - Add labels: "other", "otherPlaceholder", "selectAnswer"

### UX Details
- Single-select per question (radio behavior) — user picks one suggested answer OR writes custom
- Selected option gets a primary border + check icon
- "Other" option shows a compact textarea underneath when active
- Answer is considered "answered" when any option is selected or custom text is entered

