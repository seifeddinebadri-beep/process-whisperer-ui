

## Plan: Automation Discovery Backlog Report Page with CSV & PDF Export

### Overview
Create a new dedicated report page (`/automation-discovery/report`) that presents a full backlog report of all automation opportunities with rich detail sections and export capabilities (CSV + PDF).

### New Page: `src/pages/AutomationBacklogReport.tsx`

**Data fetched** (all in parallel via react-query):
- `automation_use_cases` with joined `uploaded_processes`, `automation_variants`
- `use_case_details` for all use cases
- `ba_conversations` count per use case (PDD status)

**Report sections:**
1. **Executive Summary** — total use cases, breakdown by impact (high/medium/low), breakdown by complexity, total variants count, processes covered
2. **Priority Matrix** — table sorted by impact desc, showing all use cases with: title, process, impact, complexity, ROI, variants count, tools, has detail, has PDD
3. **Per Use Case Detail Cards** — for each use case (sorted by impact):
   - Title, description, impact/complexity/ROI badges
   - Linked process name
   - Tools suggested
   - Variants summary table (name, complexity, impact, cost, timeline, recommended)
   - Detail content sections if available (detection signals, scope, comparison)
4. **Tools & Technology Summary** — aggregated list of all tools across all use cases with frequency count

**Export: CSV**
- Client-side generation using `Blob` + `URL.createObjectURL`
- Columns: Title, Description, Process, Impact, Complexity, ROI, Tools, Variants Count, Has Detail, Has PDD, Created At
- One row per use case; second CSV option with one row per variant

**Export: PDF**
- Reuse the HTML-to-print approach already used in `UseCaseDetail`
- Build a full HTML document client-side with all report data (similar to `generate-variant-pdf` style but covering all use cases)
- Open in new window and trigger `window.print()`

### Route Addition: `src/App.tsx`
- Add route `/automation-discovery/report` pointing to new page

### Navigation
- Add "Générer le rapport" button on `AutomationDiscovery.tsx` page header linking to the report page

### Files to create/edit
1. **Create** `src/pages/AutomationBacklogReport.tsx` — full report page
2. **Edit** `src/App.tsx` — add route
3. **Edit** `src/pages/AutomationDiscovery.tsx` — add report button in header

