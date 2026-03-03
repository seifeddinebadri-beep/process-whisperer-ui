

## Plan: Variantes d'automatisation multiples + Export PDF

### Objectif
Chaque cas d'usage d'automatisation génère plusieurs variantes (ex: Variante 1 = RPA simple, Variante 2 = IA + OCR, Variante 3 = Full automation) avec un export PDF professionnel.

### Architecture

```text
automation_use_cases (existing)
  └── automation_variants (new table)
       ├── variant_number (1, 2, 3...)
       ├── variant_name ("RPA Simple", "IA + OCR", "Full Automation")
       ├── approach_description
       ├── complexity, impact, roi_estimate
       ├── tools_suggested[]
       ├── pros[], cons[]
       ├── estimated_cost, estimated_timeline
       └── recommended (boolean)
```

### Implementation

**1. Database: `automation_variants` table**
- New table linked to `automation_use_cases` via `use_case_id`
- Fields: variant_number, variant_name, approach_description, complexity, impact, roi_estimate, tools_suggested, pros, cons, estimated_cost, estimated_timeline, recommended (boolean)
- RLS policies matching existing `automation_use_cases` access

**2. Update `analyze-process` edge function**
- Modify the AI tool call schema to generate 2-3 variants per use case instead of flat use cases
- Each use case now produces variants with different automation approaches (e.g., lightweight RPA vs. AI-powered vs. full integration)
- Insert variants into the new table after inserting the parent use case

**3. Update `AutomationDiscovery` page**
- Each use case card shows a "X variants" badge
- Clicking navigates to the detail page which now has a variant selector

**4. Update `UseCaseDetail` page**
- Add a horizontal tab bar or segmented control for variants ("Variante 1: RPA", "Variante 2: IA+OCR", etc.)
- Recommended variant gets a star icon
- Each variant tab shows its own scope, steps, tools, ROI, pros/cons
- Comparison table at the bottom: all variants side-by-side on key metrics

**5. PDF Export (`generate-pdf` edge function)**
- New edge function that builds an HTML template → converts to PDF using Deno's built-in capabilities
- Template includes: use case title, all variants with their details, comparison table, traceability links
- Professional layout with logo placeholder, headers, tables, color-coded badges
- Called from a "Download PDF" button on the detail page

**6. PDF Template structure**
```text
Page 1: Cover — Use Case Title, Process, Date, Department
Page 2: Executive Summary — all variants compared in a table
Page 3+: Per-variant detail pages
  - Approach description
  - Tools & technologies
  - Pros / Cons
  - ROI estimate, cost, timeline
  - Steps to automate / remain manual
Last page: Recommendation with justification
```

**7. Mock data for immediate UX testing**
- Populate `useCaseDetailData.ts` with 3 example variants per mock use case
- PDF export works with both DB data and mock data

**8. i18n translations**
- Variant labels, comparison headers, PDF button, pros/cons headers

### Files to create/edit
- `supabase/migrations/` — create `automation_variants` table
- `supabase/functions/analyze-process/index.ts` — generate variants per use case
- `supabase/functions/generate-variant-pdf/index.ts` (new) — HTML-to-PDF generation
- `src/pages/AutomationDiscovery.tsx` — show variant count per card
- `src/pages/UseCaseDetail.tsx` — variant tabs + comparison table + PDF button
- `src/data/useCaseDetailData.ts` — mock variant data
- `src/lib/i18n.tsx` — new translations

