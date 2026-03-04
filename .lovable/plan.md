

# Plan: Add Anti-Hallucination Strict Rules to All AI Agent Prompts

## Problem
The 6 edge functions that call the AI gateway have no explicit anti-hallucination guardrails. The AI can fabricate tool names, invent business rules, hallucinate integration details, or generate metrics with no basis in the provided data.

## Affected Edge Functions
1. `agent-analyze-as-is` — extracts process steps from documents
2. `extract-steps` — similar extraction (legacy)
3. `agent-clarify` — generates clarification questions
4. `agent-business-analyst` — challenges automation approach
5. `analyze-process` — generates use cases, variants, and detail pages
6. `generate-pdd` — generates the full PDD document

## Approach

Add a standardized **anti-hallucination block** to the system prompt of each function. The rules will be adapted per agent role but follow a common template:

```text
RÈGLES ANTI-HALLUCINATION (STRICTES) :
- Tu ne dois JAMAIS inventer d'informations qui ne sont pas présentes dans le contexte fourni.
- Si une information est absente du document source, écris explicitement "Non mentionné dans le document" ou "Information non disponible".
- Ne fabrique JAMAIS de noms d'outils, de systèmes, d'APIs, ou de technologies qui ne sont pas cités dans le contexte.
- Ne génère JAMAIS de chiffres (volumes, coûts, durées, pourcentages) sans les baser sur des données fournies. Si tu dois estimer, préfixe TOUJOURS par "Estimation :" et justifie.
- Ne crée JAMAIS de règles métier fictives. Cite uniquement celles mentionnées dans le document ou la conversation.
- Chaque affirmation doit pouvoir être tracée vers un élément du contexte source (étape, chunk, réponse utilisateur).
- En cas de doute ou d'ambiguïté, signale-le explicitement plutôt que de deviner.
- N'extrapole pas au-delà de ce qui est raisonnablement déductible des données fournies.
```

### Per-function adaptations

1. **agent-analyze-as-is & extract-steps**: Add rule that steps must come from the document text only. If a step is inferred (not explicitly stated), mark its source as "inferred" and explain why.

2. **agent-clarify**: Add rule that questions must target gaps actually visible in the data. Do not ask about topics already well-covered in the context.

3. **agent-business-analyst**: Add rule that challenge questions must reference specific elements from the use case data. Do not invent hypothetical scenarios unrelated to the provided context.

4. **analyze-process** (use cases + variants + details): Add rule that use cases must be grounded in actual process steps. Tool suggestions must come from tools mentioned in the document or be explicitly marked as "Suggestion externe". ROI/cost estimates must be marked as estimates with reasoning.

5. **generate-pdd**: Strongest rules — the PDD is a reference document. Every section must cite its source (step number, conversation excerpt, or document chunk). Unknown fields must say "A confirmer" rather than being filled with plausible fiction.

## Files to Edit
- `supabase/functions/agent-analyze-as-is/index.ts` — line ~80, system prompt
- `supabase/functions/extract-steps/index.ts` — line ~67, system prompt
- `supabase/functions/agent-clarify/index.ts` — line ~110, system prompt
- `supabase/functions/agent-business-analyst/index.ts` — line ~133, system prompt
- `supabase/functions/analyze-process/index.ts` — lines ~347 and ~252, both system prompts
- `supabase/functions/generate-pdd/index.ts` — line ~128, system prompt

No database changes. No UI changes. All changes are prompt-level in edge functions.

