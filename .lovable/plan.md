

## Plan: Add KB Business Context Recap Card in Process Analysis

### What
When a process has been analyzed with a Knowledge Base context, display a green "Contexte Métier" card below the analyst summary card. This card shows a structured recap of the KB information the analyst used: company, department, entity, activity, service, business objectives, strategy, and linked tools/documents.

### How

**1. Edge function `agent-analyze-as-is` — return KB context summary in response**
- After the AI analysis completes, also return a `kb_context_summary` object in the response JSON containing the fetched KB hierarchy data (company name/industry/strategy, department, entity, activity + objective, service + objective, tool names, KB document names)
- Also store this summary in `agent_logs` metadata under a `kb_context` key so it persists and can be fetched later

**2. `src/pages/ProcessAnalysis.tsx` — display KB Context Card**
- Add a new query to fetch the KB context from `agent_logs` metadata (the completed analyst log already stores metadata — we'll add `kb_context` to it)
- Render a green-themed card (`border-green-200 bg-green-50/50`) between the analyst summary card and the steps card
- Card content:
  - Header: icon (Building2) + "Contexte Métier — Base de Connaissances"
  - Grid layout showing: Entreprise (name, industry, size), Stratégie, Département, Entité, Activité + objectif métier, Service + objectif, Outils référencés (as badges), Documents KB utilisés (as list)
  - Only show fields that have values

### Files
- **Edit** `supabase/functions/agent-analyze-as-is/index.ts` — build a `kb_context_summary` object from the already-fetched KB data, include it in the agent_logs metadata and response
- **Edit** `src/pages/ProcessAnalysis.tsx` — add green KB context card using data from `analystSummary.metadata.kb_context`

