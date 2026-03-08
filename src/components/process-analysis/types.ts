// Shared types for process analysis components (maps DB columns to frontend)

export type StepSource = "event_log" | "knowledge_base" | "manual" | "merged";

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
  source?: StepSource;
  screenshotUrl?: string;
}

export interface ProcessScreenshot {
  id: string;
  processId: string;
  filePath: string;
  pageNumber?: number;
  caption?: string;
  createdAt?: string;
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
