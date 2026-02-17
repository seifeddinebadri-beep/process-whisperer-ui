

# Enhanced As-Is Process Description — Rich, Editable Context for Accurate Discovery

## Problem
The current As-Is Process Description section is read-only — steps are displayed as static text with no way to edit, delete, add, or enrich them with the context needed to drive accurate automation discovery. Users cannot add business rules, constraints, pain points, or decision logic that are critical signals for automation detection.

## What Changes

### 1. Editable Step List (replace static list)
Each process step becomes a rich, interactive card showing:
- **Step name** (inline editable)
- **Description** (inline editable)
- **Role** (editable dropdown/input)
- **Tool used** (editable dropdown/input)
- **New fields:**
  - **Decision type**: Manual judgment / Rule-based / No decision
  - **Data inputs**: What data enters this step
  - **Data outputs**: What data leaves this step
  - **Pain points / bottlenecks**: Free text (e.g., "Takes 2 hours on average", "Frequent errors")
  - **Business rules**: Free text for conditions/thresholds (e.g., "If amount > $5000, escalate")
  - **Frequency**: How often this step runs (daily, per-invoice, weekly, etc.)
  - **Volume estimate**: Approximate number of executions per period

Each step card has:
- **Edit button** opening a detailed modal with all fields
- **Delete button** with confirmation
- Steps are **reorderable** via up/down arrows

### 2. Add New Step
A prominent "+ Add Step" button at the bottom of the step list opens a modal pre-filled with empty fields for all the above attributes.

### 3. Roles & Tools Management (editable)
- Roles section becomes editable: add/remove role badges
- Tools section becomes editable: add/remove tool badges

### 4. New: Process-Level Context Section
A new card below the steps list with editable fields:
- **Process objective**: What this process is supposed to achieve
- **Known constraints**: Compliance rules, SLAs, regulatory requirements
- **Assumptions**: Any assumptions about how the process works
- **Pain points summary**: Overall process-level issues
- **Volume & frequency**: Overall process execution stats
- **Stakeholder notes**: Free-text for additional analyst observations

### 5. Approve Button Enhanced
The "Approve As-Is" button moves to a prominent position at the bottom of the page (sticky bar style) with:
- Label: "Approve & Run Discovery"
- A subtitle: "Approving will trigger automation use case discovery based on the process and context above."
- Disabled state if no steps exist

## Technical Details

### Data model changes (`mockData.ts`)
Extend `ProcessStep` interface with new optional fields:
```
decisionType?: "manual_judgment" | "rule_based" | "no_decision";
dataInputs?: string[];
dataOutputs?: string[];
painPoints?: string;
businessRules?: string;
frequency?: string;
volumeEstimate?: string;
```

Add new `ProcessContext` interface:
```
processObjective?: string;
knownConstraints?: string;
assumptions?: string;
painPointsSummary?: string;
volumeAndFrequency?: string;
stakeholderNotes?: string;
```

Add `context` field to `ProcessAnalysis` interface.

### Page changes (`ProcessAnalysis.tsx`)
- Replace static step list with stateful editable step cards
- Add step edit modal with all new fields
- Add delete confirmation
- Add reorder (move up/down) functionality
- Add roles/tools inline editing (add/remove badges with input)
- Add Process Context card with editable text areas
- Move approve button to sticky bottom bar with enhanced messaging
- All state managed locally (no backend)

### Files modified
1. `src/data/mockData.ts` — Extended interfaces and mock data
2. `src/pages/ProcessAnalysis.tsx` — Full rebuild of the As-Is section with rich editing

