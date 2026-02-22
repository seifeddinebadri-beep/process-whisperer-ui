// Shared types for process analysis components (maps DB columns to frontend)

export interface ProcessStep {
  id: string;
  name: string;
  description: string;
  role: string;
  toolUsed: string;
  decisionType?: "manual_judgment" | "rule_based" | "no_decision";
  dataInputs?: string[];
  dataOutputs?: string[];
  painPoints?: string;
  businessRules?: string;
  frequency?: string;
  volumeEstimate?: string;
  stepOrder?: number;
}

export interface ProcessContext {
  id?: string;
  processObjective?: string;
  knownConstraints?: string;
  assumptions?: string;
  painPointsSummary?: string;
  volumeAndFrequency?: string;
  stakeholderNotes?: string;
}
