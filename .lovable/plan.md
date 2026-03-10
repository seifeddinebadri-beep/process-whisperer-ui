

## Plan: Transform Backlog Report into a Process-Grouped Pick List

### Concept
Restructure the report so use cases and their variants are grouped under their source process. Add checkboxes to let users select specific use cases and variants, then export or "push" the selection to development teams.

### Changes to `src/pages/AutomationBacklogReport.tsx`

**1. Group by Process**
- Replace the flat sorted list with a `Map<processId, { process, useCases[] }>` grouping
- Each process becomes a collapsible section header showing process name + aggregate stats

**2. Selection State**
- `selectedUseCases: Set<string>` and `selectedVariants: Set<string>` state
- Checkboxes at 3 levels: process (select all under it), use case, individual variant
- "Select All" / "Deselect All" global controls
- Selection counter in header: "X cas d'usage et Y variantes sélectionnés"

**3. Pick List UI (replacing the Priority Ranking table)**
- Per-process collapsible card:
  - Header: process file name, count of use cases, total variants, expand/collapse
  - Checkbox to select all use cases + variants under this process
  - Inside: use case rows with checkbox, impact/complexity badges, ROI
  - Under each use case: indented variant rows with checkbox, recommended star, cost, timeline
- Selected rows get a subtle highlight (`bg-primary/5`)

**4. Action Bar (sticky bottom)**
- Appears when at least 1 item is selected
- Shows: "{N} cas d'usage · {M} variantes sélectionnés"
- Buttons: "Exporter la sélection (CSV)", "Exporter la sélection (PDF)", "Valider pour développement"
- "Valider pour développement" exports a comprehensive PDF with only selected items, formatted as a handoff document with clear scope per use case + chosen variant details

**5. Exports updated**
- CSV and PDF exports respect the current selection (if any selected, export only those; otherwise export all)
- PDF "handoff" format: per use case section with title, description, selected variant details (approach, tools, cost, timeline, pros/cons)

**6. KPIs and charts remain at top** but add a secondary row showing selection stats when items are selected

### Files
- **Edit** `src/pages/AutomationBacklogReport.tsx` — full restructure

