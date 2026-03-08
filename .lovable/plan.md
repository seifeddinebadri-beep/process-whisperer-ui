

## Plan: Integrate Knowledge Base Context into As-Is Process Analysis

### Problem
When an event log is uploaded with a KB context (company/department/entity/activity), the as-is analysis agent ignores all KB data — company strategy, department descriptions, activity business objectives, tools, and uploaded KB documents. The analysis is based solely on the event log content.

### Changes

**1. Database Migration — add `service_id` to `uploaded_processes`**
The `uploaded_processes` table has `company_id`, `department_id`, `entity_id`, `activity_id` but no `service_id`. Add it to complete the hierarchy.

```sql
ALTER TABLE public.uploaded_processes ADD COLUMN service_id uuid REFERENCES public.services(id);
```

**2. Update `src/pages/ProcessUpload.tsx`**
- Add a 5th dropdown for "Service" (fetched from `services` where `activity_id` matches)
- Save `service_id` in the insert to `uploaded_processes`

**3. Update `supabase/functions/agent-analyze-as-is/index.ts` — fetch and inject KB context**

Before calling the AI, fetch the full KB hierarchy for the process:
- From `uploaded_processes`, get `company_id`, `department_id`, `entity_id`, `activity_id`, `service_id`
- Fetch company (name, industry, size, strategy_notes), department (name), entity (name), activity (name, description, business_objective), service (name, description, business_objective)
- Fetch `tools` linked via `activity_tools` for the relevant activity
- Fetch `kb_documents` at all levels (company, department, entity, activity, service)
- For each KB document, download from storage and extract text content (for .txt/.csv/.json files)
- Build a "Knowledge Base Context" section prepended to the AI prompt

The system prompt will be enriched with:
```
--- CONTEXTE BASE DE CONNAISSANCES ---
Entreprise: {name} | Secteur: {industry} | Taille: {size}
Stratégie: {strategy_notes}
Département: {dept_name}
Entité: {entity_name}
Activité: {activity_name} — {activity_description}
Objectif métier: {business_objective}
Service: {service_name} — {service_description}
Outils référencés: {tool1, tool2, ...}

Documents KB associés:
[Content of each KB document]
---
```

This gives the analyst agent full organizational context to produce a more accurate as-is analysis grounded in real business knowledge.

**4. Update `supabase/functions/agent-orchestrator/index.ts`**
- Log a new phase "phase_kb_context" to show KB retrieval in the pipeline activity log

### File changes summary
- **Migration**: Add `service_id` column to `uploaded_processes`
- `src/pages/ProcessUpload.tsx`: Add Service dropdown + save service_id
- `supabase/functions/agent-analyze-as-is/index.ts`: Fetch KB hierarchy + documents, inject into AI prompt
- `supabase/functions/agent-orchestrator/index.ts`: Add KB context retrieval logging phase

