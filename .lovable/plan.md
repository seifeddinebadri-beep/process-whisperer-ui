

# Plan: Transform Platform into an Agentic Architecture

## Vision

Transform the platform from a linear tool-calling pipeline into a visible **multi-agent system** where each agent has a clear identity, status, and conversational presence in the UI. The user sees agents working, thinking, and collaborating — not just buttons triggering edge functions.

## Current State

- Edge functions exist (`extract-steps`, `generate-clarifications`, `analyze-process`) but are invoked as invisible background calls
- No agent identity, no visible reasoning, no agent activity log
- The clarification panel is a wizard — not an agent conversation
- No orchestration layer — each function is triggered independently

## Agent Definitions

Three named agents, each with a distinct role:

```text
┌──────────────────────────────────────────────────────────┐
│  Agent 1: "Analyst"                                      │
│  Role: Process As-Is extraction & structuring            │
│  Trigger: After upload (auto) or manual re-analyze       │
│  Backend: extract-steps + enhanced reasoning             │
│  Output: Structured steps, context, BPMN, pain points    │
├──────────────────────────────────────────────────────────┤
│  Agent 2: "Clarifier"                                    │
│  Role: Ask contextual questions, enrich process context  │
│  Trigger: User opens clarification panel                 │
│  Backend: generate-clarifications (conversational)       │
│  Output: Enriched process_context from Q&A               │
├──────────────────────────────────────────────────────────┤
│  Agent 3: "Discoverer"                                   │
│  Role: Generate automation use cases & variants          │
│  Trigger: User clicks "Launch Discovery"                 │
│  Backend: analyze-process                                │
│  Output: Use cases + variants with full detail            │
└──────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: Agent Activity Log Component
Create a reusable `AgentActivityLog` component that displays agent actions in a timeline format. Each entry shows:
- Agent avatar + name (Analyst / Clarifier / Discoverer)
- Status: thinking → working → done / error
- Short message describing what the agent is doing
- Timestamp
- Expandable detail (optional)

This replaces the simple progress bar during upload and the loading spinners elsewhere.

### Task 2: Analyst Agent — Enhanced Process Analysis
- **New edge function `agent-analyze-as-is`**: Wraps `extract-steps` logic but adds a reasoning step. The agent first summarizes what it found, identifies gaps, and provides a confidence assessment alongside the extracted steps.
- Returns: `{ steps, context, agent_summary, confidence, gaps_identified }`
- **UI (ProcessUpload.tsx + ProcessAnalysis.tsx)**: Show the Analyst agent's activity log during upload. On the Analysis page, display the agent's summary card at the top ("I extracted 6 steps from your document. I identified 2 gaps: missing volume data for steps 3-4, and unclear decision logic at step 5.").

### Task 3: Clarifier Agent — Conversational Panel
Transform the ClarificationPanel from a wizard into a **chat-like agent conversation**:
- Agent introduces itself: "I'm the Clarifier agent. I've analyzed your process and have some questions to improve the automation analysis."
- Questions still appear as structured cards with options, but within a conversational flow
- After each answer, the agent acknowledges and may ask a follow-up (new edge function enhancement: `generate-clarifications` accepts previous answers and generates follow-ups)
- **New edge function `agent-clarify`**: Replaces `generate-clarifications`. Accepts `{ process_id, conversation_history }` and returns the next question(s) based on what's already been answered. This makes it truly conversational.
- The panel shows a chat-like timeline: agent message → user selection → agent acknowledgment → next question

### Task 4: Discoverer Agent — Visible Discovery Process
- When "Launch Discovery" is clicked, show the Discoverer agent working in a modal/panel:
  - "Analyzing process context and 6 steps..."
  - "Cross-referencing with knowledge base..."
  - "Generating automation scenarios..."
  - "Found 3 use cases with 8 variants total"
- **Enhanced `analyze-process` function**: Add a `reasoning` field to the response summarizing why each use case was identified
- **UI (ProcessAnalysis.tsx)**: Replace the simple toast with an agent activity modal showing real-time progress

### Task 5: Agent Status Dashboard on Overview
- Add an "Agent Activity" section to the Overview page showing recent agent actions across all processes
- Query a new `agent_logs` table that stores: agent_name, process_id, action, status, message, created_at
- Gives users visibility into what agents have done

### Task 6: Agent Logs Table (Database)
Create table `agent_logs`:
- `id` (uuid, PK)
- `process_id` (uuid, FK to uploaded_processes)
- `agent_name` (text: 'analyst' | 'clarifier' | 'discoverer')
- `action` (text: e.g. 'extract_steps', 'generate_questions', 'analyze_use_cases')
- `status` (text: 'started' | 'completed' | 'error')
- `message` (text: human-readable summary)
- `metadata` (jsonb: details like step count, question count, etc.)
- `created_at` (timestamptz)

Each edge function writes to this table at start and completion.

### Task 7: Sidebar Agent Indicators
- Add small status indicators next to "Process Analysis" and "Automation Discovery" in the sidebar showing if an agent is currently active
- Use a pulsing dot (green = active, idle = hidden)

## Files to Create
- `src/components/agents/AgentActivityLog.tsx` — reusable agent timeline component
- `src/components/agents/AgentMessage.tsx` — single agent message bubble
- `src/components/agents/AgentDiscoveryModal.tsx` — modal for discovery agent progress
- `supabase/functions/agent-analyze-as-is/index.ts` — enhanced analyst agent
- `supabase/functions/agent-clarify/index.ts` — conversational clarifier agent

## Files to Edit
- `src/pages/Overview.tsx` — add agent activity section
- `src/pages/ProcessUpload.tsx` — replace progress bar with AgentActivityLog
- `src/pages/ProcessAnalysis.tsx` — add analyst summary card, discovery agent modal
- `src/components/process-analysis/ClarificationPanel.tsx` — transform to conversational agent UI
- `src/components/AppSidebar.tsx` — add agent status indicators
- `supabase/functions/analyze-process/index.ts` — add agent_logs writes + reasoning
- `supabase/functions/extract-steps/index.ts` — add agent_logs writes + summary
- `supabase/functions/generate-clarifications/index.ts` — add conversation history support

## Database Migration
```sql
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read agent_logs" ON public.agent_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert agent_logs" ON public.agent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update agent_logs" ON public.agent_logs FOR UPDATE USING (true);
```

