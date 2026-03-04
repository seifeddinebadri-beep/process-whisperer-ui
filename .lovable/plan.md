

# Plan: Orchestrator Agent

## Overview

Create an **Orchestrator Agent** that chains the four existing agents (Analyst, Clarifier, Discoverer, Business Analyst) into a single automated pipeline. The user triggers it from the Process Analysis page and watches all agents execute sequentially in a full-screen modal with a visual timeline.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│              Orchestrator Agent                  │
│                                                  │
│  1. Analyst    → agent-analyze-as-is             │
│  2. Clarifier  → generate-clarifications (auto)  │
│  3. Discoverer → analyze-process                 │
│  4. BA Agent   → agent-business-analyst (auto)   │
│                                                  │
│  All steps run server-side in one edge function  │
│  Progress streamed back via polling agent_logs   │
└─────────────────────────────────────────────────┘
```

## Implementation

### 1. Edge Function: `agent-orchestrator`

A new edge function that accepts `{ process_id }` and sequentially:
- Calls `agent-analyze-as-is` logic (extract steps, context, summary)
- Calls `generate-clarifications` to auto-generate questions, then auto-selects the first option for each (or skips if no good defaults) -- stores answers in `process_context.stakeholder_notes`
- Calls `analyze-process` logic (generate use cases and variants)
- For each use case, calls `agent-business-analyst` with auto-responses (picks first option each time) to generate a PDD

Each step writes to `agent_logs` with `agent_name: 'orchestrator'` so the UI can poll progress. Returns a summary with counts (steps extracted, questions answered, use cases found, PDDs generated).

### 2. UI Component: `AgentOrchestratorModal`

A Dialog-based modal showing:
- A vertical stepper with the 4 agent phases
- Each phase shows the agent icon, name, status (pending/working/done/error)
- The active phase pulses and shows the current agent's log messages (polled from `agent_logs`)
- A progress bar at the top
- When complete, a summary card with links to Process Analysis and Automation Discovery
- Close button only enabled when done or on error

### 3. Integration Points

- **Process Analysis page**: Add a "Run Full Analysis" button in the bottom action bar (next to Approve and Launch Discovery). Only enabled when process is in `analyzed` or `approved` status.
- **Sidebar**: Add orchestrator to the active agent detection.
- **Config**: Register `agent-orchestrator` in `supabase/config.toml` with `verify_jwt = false`.

### Files to Create
- `supabase/functions/agent-orchestrator/index.ts` -- the orchestration edge function
- `src/components/agents/AgentOrchestratorModal.tsx` -- the progress modal

### Files to Edit
- `src/pages/ProcessAnalysis.tsx` -- add trigger button and modal
- `src/components/AppSidebar.tsx` -- add orchestrator to active agent detection
- `supabase/config.toml` -- register the new function

### Technical Notes
- The orchestrator function calls the other functions internally using `fetch` to the Supabase functions URL (self-invocation via `SUPABASE_URL/functions/v1/...` with service role key) rather than duplicating logic
- The UI polls `agent_logs` every 2 seconds filtered by `process_id` and `agent_name = 'orchestrator'` to show real-time progress
- Auto-answering clarification questions: the orchestrator picks the first option for each question to keep the pipeline fully automated. Users can refine manually later.

