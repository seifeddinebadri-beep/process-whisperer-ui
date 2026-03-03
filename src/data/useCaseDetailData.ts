// ============================================================
// Extended Mock Data for Use Case Detail Views
// ============================================================

export interface DetectionSignal {
  id: string;
  type: "repetitive_manual" | "rule_based" | "high_frequency" | "structured_inputs" | "tool_transfer";
  label: string;
  description: string;
  triggeringStep: string; // step name
  ruleOrThreshold: string;
}

export interface ContextReference {
  id: string;
  type: "role" | "tool" | "business_rule" | "constraint";
  name: string;
  detail: string;
}

export interface AutomationScopeItem {
  step: string;
  system?: string;
  decision?: string;
}

export interface ManualItem {
  item: string;
  reason: string;
}

export interface ExclusionItem {
  scenario: string;
  reason: string;
}

export interface DetailedAutomatedStep {
  id: string;
  stepName: string;
  trigger: string;
  inputData: string[];
  validationRules: string[];
  systemAction: string;
  outputProduced: string;
  logging: string;
}

export interface ExceptionScenario {
  id: string;
  whatCanGoWrong: string;
  howDetected: string;
  whatHappensNext: string;
  whoIsNotified: string;
  dataPreserved: string;
  severity: "low" | "medium" | "high";
}

export interface BeforeAfterComparison {
  before: {
    steps: number;
    humanEffort: string;
    toolsInvolved: string[];
    errorRisks: string[];
  };
  after: {
    steps: number;
    automationCheckpoints: string[];
    humanTouchpoints: string[];
    residualRisks: string[];
  };
}

export interface ValueMetric {
  metric: string;
  level: "low" | "medium" | "high";
  explanation: string;
  assumptions: string;
}

export interface TraceabilityLink {
  type: "process_step" | "role" | "tool" | "business_rule";
  name: string;
  detail: string;
}

export interface DecisionRecord {
  id: string;
  action: "approved" | "changes_requested" | "rejected";
  user: string;
  timestamp: string;
  comment: string;
}

export interface CommentItem {
  id: string;
  user: string;
  timestamp: string;
  text: string;
}

export interface UseCaseDetail {
  useCaseId: string;
  // Section 1 — Overview
  linkedProcess: string;
  department: string;
  entity: string;
  automationPattern: string;
  // Section 2 — Explainability
  detectionSignals: DetectionSignal[];
  contextReferences: ContextReference[];
  confidenceLevel: "low" | "medium" | "high";
  confidenceExplanation: string;
  // Section 3 — Scope
  willBeAutomated: AutomationScopeItem[];
  willRemainManual: ManualItem[];
  explicitExclusions: ExclusionItem[];
  // Section 4 — Detailed Automated Process
  detailedSteps: DetailedAutomatedStep[];
  // Section 5 — Exceptions
  exceptions: ExceptionScenario[];
  // Section 6 — Before / After
  comparison: BeforeAfterComparison;
  // Section 7 — Value & Feasibility
  valueMetrics: ValueMetric[];
  // Section 8 — Traceability
  traceabilityLinks: TraceabilityLink[];
  // Section 9 — Validation
  decisions: DecisionRecord[];
  comments: CommentItem[];
}

// ---------- Detailed data for uc1: Automated Invoice Data Extraction ----------

export const mockUseCaseDetails: Record<string, UseCaseDetail> = {
  uc1: {
    useCaseId: "uc1",
    linkedProcess: "Invoice Processing",
    department: "Finance",
    entity: "Accounts Payable",
    automationPattern: "Intelligent Document Processing",

    detectionSignals: [
      {
        id: "ds1",
        type: "repetitive_manual",
        label: "Repetitive manual steps",
        description: "Invoice data is manually keyed into SAP for every received invoice.",
        triggeringStep: "Log Invoice",
        ruleOrThreshold: "Step repeated 300+ times/month with identical field mapping",
      },
      {
        id: "ds2",
        type: "structured_inputs",
        label: "Structured inputs",
        description: "Invoices follow a standard format with consistent fields: vendor, amount, date, PO number.",
        triggeringStep: "Receive Invoice",
        ruleOrThreshold: "95% of invoices have machine-readable structured fields",
      },
      {
        id: "ds3",
        type: "rule_based",
        label: "Rule-based decisions",
        description: "Validation against PO data follows deterministic matching rules.",
        triggeringStep: "Validate Invoice",
        ruleOrThreshold: "Three-way match logic with fixed tolerance thresholds (±2%)",
      },
      {
        id: "ds4",
        type: "tool_transfer",
        label: "Tool-to-tool data transfer",
        description: "Data moves from email/scan to SAP manually — a classic integration opportunity.",
        triggeringStep: "Log Invoice",
        ruleOrThreshold: "Manual copy-paste between Outlook and SAP ERP detected",
      },
      {
        id: "ds5",
        type: "high_frequency",
        label: "High frequency",
        description: "The AP team processes an average of 300 invoices per month.",
        triggeringStep: "Receive Invoice",
        ruleOrThreshold: "Frequency > 200 instances/month qualifies as high-volume",
      },
    ],

    contextReferences: [
      { id: "cr1", type: "role", name: "AP Clerk", detail: "Responsible for receiving and logging invoices. Spends ~60% of time on data entry." },
      { id: "cr2", type: "role", name: "AP Analyst", detail: "Validates invoices against POs and routes for approval." },
      { id: "cr3", type: "tool", name: "SAP ERP", detail: "Central system for invoice records, PO management, and payment scheduling." },
      { id: "cr4", type: "tool", name: "Outlook", detail: "Primary channel for receiving invoices via email attachments." },
      { id: "cr5", type: "business_rule", name: "Three-Way Match", detail: "Invoice must match PO amount (±2%) and goods receipt quantity before approval." },
      { id: "cr6", type: "constraint", name: "Audit Compliance", detail: "All invoice processing must maintain a full audit trail per SOX requirements." },
    ],

    confidenceLevel: "high",
    confidenceExplanation: "High confidence because inputs are structured, decision logic is explicit, and the process has high volume with low variance.",

    willBeAutomated: [
      { step: "Receive Invoice", system: "Email integration / OCR scanner" },
      { step: "Extract invoice fields", system: "Azure Form Recognizer" },
      { step: "Validate against PO", system: "SAP ERP API", decision: "Three-way match pass/fail" },
      { step: "Create draft invoice entry", system: "SAP ERP" },
      { step: "Flag discrepancies", system: "Workflow engine" },
    ],

    willRemainManual: [
      { item: "Manager approval for invoices > $5,000", reason: "Requires human judgment on budget allocation and vendor relationships." },
      { item: "Exception resolution for mismatched invoices", reason: "Discrepancies require investigation and vendor communication." },
      { item: "New vendor registration", reason: "Involves compliance checks and contract negotiation." },
    ],

    explicitExclusions: [
      { scenario: "Handwritten or faxed invoices", reason: "OCR accuracy below 70% for non-digital formats. Manual processing required." },
      { scenario: "Multi-currency invoices with dynamic exchange rates", reason: "Requires treasury desk input for rate confirmation." },
      { scenario: "Invoices without a PO reference", reason: "Cannot be matched automatically; requires manual categorization." },
    ],

    detailedSteps: [
      {
        id: "das1",
        stepName: "Invoice Reception & Intake",
        trigger: "New email with attachment arrives in AP mailbox",
        inputData: ["Email with PDF/image attachment", "Sender email address"],
        validationRules: ["Attachment must be PDF, PNG, or JPG", "Sender must be in known vendor list or flagged for review"],
        systemAction: "Email listener detects new invoice, downloads attachment, and queues for OCR processing.",
        outputProduced: "Raw invoice file stored in processing queue with metadata (timestamp, sender, file type)",
        logging: "Log entry: invoice received, file hash, sender, timestamp. Stored in audit_log table.",
      },
      {
        id: "das2",
        stepName: "Data Extraction via OCR",
        trigger: "New file in processing queue",
        inputData: ["Invoice PDF/image file"],
        validationRules: ["OCR confidence score must exceed 85%", "All mandatory fields must be detected (vendor, amount, date, PO#)"],
        systemAction: "Azure Form Recognizer extracts key-value pairs. If confidence < 85%, routes to manual review queue.",
        outputProduced: "Structured JSON with extracted fields: vendor_name, invoice_amount, invoice_date, po_number, line_items",
        logging: "Log entry: extraction result, confidence scores per field, processing duration.",
      },
      {
        id: "das3",
        stepName: "Vendor Validation",
        trigger: "Extracted data available",
        inputData: ["Extracted vendor name", "Vendor master data from SAP"],
        validationRules: ["Vendor must exist in SAP vendor master", "Vendor must have active status"],
        systemAction: "System matches extracted vendor name against SAP vendor master using fuzzy matching (threshold: 90%). Unmatched vendors flagged for manual review.",
        outputProduced: "Validated vendor ID linked to invoice record",
        logging: "Log entry: vendor match result, match score, vendor ID.",
      },
      {
        id: "das4",
        stepName: "Three-Way Match Verification",
        trigger: "Vendor validated successfully",
        inputData: ["Invoice data", "Purchase Order from SAP", "Goods Receipt from SAP"],
        validationRules: ["Invoice amount within ±2% of PO amount", "Quantity matches goods receipt", "Vendor on invoice matches PO vendor"],
        systemAction: "System compares invoice against PO and GR records. Full match → auto-approved. Partial match → exception flagged.",
        outputProduced: "Match result: PASS / PARTIAL_MATCH / FAIL with detailed discrepancy report",
        logging: "Log entry: match result, comparison details, discrepancy amounts if any.",
      },
      {
        id: "das5",
        stepName: "Draft Invoice Creation in SAP",
        trigger: "Three-way match passes",
        inputData: ["Validated invoice data", "Matched PO reference", "Vendor ID"],
        validationRules: ["No duplicate invoice exists for same vendor + amount + date", "Invoice date within acceptable range (not older than 90 days)"],
        systemAction: "System creates draft invoice entry in SAP with all extracted and validated data. Status set to 'Pending Review'.",
        outputProduced: "SAP invoice document number, draft status confirmation",
        logging: "Log entry: SAP document number, creation timestamp, data source (automated), all field values.",
      },
      {
        id: "das6",
        stepName: "Human Review Notification",
        trigger: "Draft invoice created OR exception flagged",
        inputData: ["Invoice summary", "Match result", "Exception details (if any)"],
        validationRules: ["Notification must be sent within 5 minutes of draft creation"],
        systemAction: "System sends notification to appropriate reviewer based on invoice amount and department. Includes direct link to SAP record.",
        outputProduced: "Email/Teams notification sent to reviewer with action required",
        logging: "Log entry: notification sent, recipient, invoice reference, notification type.",
      },
    ],

    exceptions: [
      {
        id: "ex1",
        whatCanGoWrong: "OCR fails to extract mandatory fields (confidence below 85%)",
        howDetected: "Confidence score check after extraction step",
        whatHappensNext: "Invoice routed to manual data entry queue with partial extracted data pre-filled",
        whoIsNotified: "AP Clerk assigned to manual review queue",
        dataPreserved: "Original file, partial extraction results, confidence scores",
        severity: "medium",
      },
      {
        id: "ex2",
        whatCanGoWrong: "Vendor not found in SAP master data",
        howDetected: "Fuzzy match score below 90% threshold",
        whatHappensNext: "Invoice flagged as 'Unknown Vendor' — held for manual vendor identification",
        whoIsNotified: "AP Analyst and Vendor Management team",
        dataPreserved: "Extracted vendor name, all invoice data, match attempts",
        severity: "medium",
      },
      {
        id: "ex3",
        whatCanGoWrong: "Three-way match fails — amount discrepancy exceeds tolerance",
        howDetected: "Automated comparison detects variance > ±2%",
        whatHappensNext: "Invoice placed in exception queue with discrepancy details. Automation stops here.",
        whoIsNotified: "AP Analyst for investigation, Department Manager if amount > $10,000",
        dataPreserved: "Full comparison report: invoice vs PO vs GR amounts, percentage variance",
        severity: "high",
      },
      {
        id: "ex4",
        whatCanGoWrong: "Duplicate invoice detected",
        howDetected: "System checks for same vendor + amount + date combination",
        whatHappensNext: "Invoice blocked from entry. Human intervention required to confirm or dismiss.",
        whoIsNotified: "AP Clerk with duplicate reference details",
        dataPreserved: "Both invoice records for comparison, flagged fields",
        severity: "high",
      },
      {
        id: "ex5",
        whatCanGoWrong: "SAP API unavailable during draft creation",
        howDetected: "API timeout or error response after 3 retry attempts",
        whatHappensNext: "Invoice queued for retry. If still failing after 1 hour, routed to manual entry.",
        whoIsNotified: "IT Operations team and AP Manager",
        dataPreserved: "All validated invoice data cached locally, retry log",
        severity: "low",
      },
    ],

    comparison: {
      before: {
        steps: 7,
        humanEffort: "~25 minutes per invoice across 3 roles",
        toolsInvolved: ["Outlook", "SAP ERP", "DocuSign"],
        errorRisks: [
          "Manual data entry errors (~8% error rate)",
          "Missed PO discrepancies due to fatigue",
          "Delayed processing during peak periods",
          "Inconsistent validation across clerks",
        ],
      },
      after: {
        steps: 4,
        automationCheckpoints: [
          "OCR confidence validation (85% threshold)",
          "Vendor master verification",
          "Three-way match (±2% tolerance)",
          "Duplicate detection",
        ],
        humanTouchpoints: [
          "Review and approve draft invoices",
          "Resolve flagged exceptions",
          "Handle unknown vendors",
        ],
        residualRisks: [
          "OCR misreads on low-quality scans (~3% of invoices)",
          "New vendor invoices require manual routing",
          "System downtime affects processing queue",
        ],
      },
    },

    valueMetrics: [
      {
        metric: "Business Value",
        level: "high",
        explanation: "Eliminates ~80% of manual data entry effort, reduces processing time from 25 to 5 minutes per invoice, and significantly lowers error rates.",
        assumptions: "Based on current volume of 300 invoices/month with 95% in standard digital format.",
      },
      {
        metric: "Implementation Complexity",
        level: "medium",
        explanation: "Requires OCR integration, SAP API configuration, and workflow engine setup. Core logic is straightforward but integration testing is substantial.",
        assumptions: "Assumes existing SAP API access and Azure subscription. No major customization to SAP required.",
      },
      {
        metric: "Risk Level",
        level: "low",
        explanation: "Low risk due to clear fallback paths. Every automated step has a manual backup. No irreversible actions — drafts require human approval.",
        assumptions: "Assumes adequate monitoring and alerting is in place for exception handling.",
      },
      {
        metric: "Change Impact",
        level: "medium",
        explanation: "AP Clerks will shift from data entry to exception handling. Requires role transition training and updated SOPs. Minimal impact on other departments.",
        assumptions: "Assumes change management support and a 4-week parallel run before full rollout.",
      },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Receive Invoice", detail: "Step 1 of the as-is invoice processing flow" },
      { type: "process_step", name: "Log Invoice", detail: "Step 2 — manual data entry into SAP" },
      { type: "process_step", name: "Validate Invoice", detail: "Step 3 — three-way match verification" },
      { type: "role", name: "AP Clerk", detail: "Primary operator for data entry and invoice intake" },
      { type: "role", name: "AP Analyst", detail: "Validates and investigates exceptions" },
      { type: "role", name: "Department Manager", detail: "Approves invoices above threshold" },
      { type: "tool", name: "SAP ERP", detail: "Central system for invoice and PO management" },
      { type: "tool", name: "Outlook", detail: "Email channel for invoice receipt" },
      { type: "tool", name: "DocuSign", detail: "Digital signature for approval routing" },
      { type: "business_rule", name: "Three-Way Match (±2%)", detail: "Invoice must match PO and GR within 2% tolerance" },
      { type: "business_rule", name: "Approval Matrix", detail: "Invoices >$5k need manager approval; >$25k need VP approval" },
      { type: "business_rule", name: "SOX Audit Trail", detail: "All invoice actions must be logged with timestamp and user ID" },
    ],

    decisions: [
      {
        id: "dec1",
        action: "changes_requested",
        user: "Sarah Chen (Process Lead)",
        timestamp: "2026-02-10T09:15:00",
        comment: "Please clarify the fallback for handwritten invoices — should they go to a separate queue or the same manual review?",
      },
      {
        id: "dec2",
        action: "approved",
        user: "Michael Torres (IT Architect)",
        timestamp: "2026-02-11T14:30:00",
        comment: "Technical feasibility confirmed. SAP API endpoints available. OCR integration is standard. Approved from a technical perspective.",
      },
    ],

    comments: [
      {
        id: "com1",
        user: "Sarah Chen",
        timestamp: "2026-02-09T11:00:00",
        text: "The detection signals look solid. I agree that the manual data entry step is the clearest automation target.",
      },
      {
        id: "com2",
        user: "Michael Torres",
        timestamp: "2026-02-10T16:45:00",
        text: "We should consider adding a confidence dashboard for the OCR output to help AP Clerks trust the automated extractions.",
      },
      {
        id: "com3",
        user: "Lisa Park",
        timestamp: "2026-02-11T09:20:00",
        text: "From a compliance standpoint, the audit logging described in the detailed steps meets our SOX requirements.",
      },
    ],
  },

  uc2: {
    useCaseId: "uc2",
    linkedProcess: "Invoice Processing",
    department: "Finance",
    entity: "Accounts Payable",
    automationPattern: "Rule-Based Processing",

    detectionSignals: [
      {
        id: "ds6",
        type: "rule_based",
        label: "Rule-based decisions",
        description: "Matching logic follows deterministic rules with fixed thresholds.",
        triggeringStep: "Validate Invoice",
        ruleOrThreshold: "Three-way match with ±2% tolerance is fully rule-based",
      },
      {
        id: "ds7",
        type: "high_frequency",
        label: "High frequency",
        description: "Every invoice goes through this validation step — 300+ per month.",
        triggeringStep: "Validate Invoice",
        ruleOrThreshold: "Frequency > 200/month",
      },
    ],

    contextReferences: [
      { id: "cr7", type: "tool", name: "SAP ERP", detail: "Contains PO and GR records for matching." },
      { id: "cr8", type: "business_rule", name: "Three-Way Match", detail: "Invoice must match PO and GR within tolerance." },
    ],

    confidenceLevel: "high",
    confidenceExplanation: "High confidence because the matching logic is entirely rule-based with clear pass/fail criteria.",

    willBeAutomated: [
      { step: "Compare invoice to PO", system: "SAP ERP" },
      { step: "Compare invoice to Goods Receipt", system: "SAP ERP" },
      { step: "Generate match result", system: "SAP ERP", decision: "Pass / Fail with tolerance" },
    ],

    willRemainManual: [
      { item: "Exception investigation", reason: "Discrepancies require vendor communication and judgment." },
    ],

    explicitExclusions: [
      { scenario: "Invoices without PO reference", reason: "Cannot be matched — separate workflow required." },
    ],

    detailedSteps: [
      {
        id: "das7",
        stepName: "Retrieve PO and GR Records",
        trigger: "Invoice logged in SAP",
        inputData: ["Invoice PO number", "SAP PO database"],
        validationRules: ["PO must exist and be in 'Open' status"],
        systemAction: "System retrieves PO and associated GR records from SAP.",
        outputProduced: "PO and GR data linked to invoice",
        logging: "Log: PO lookup result, GR availability.",
      },
      {
        id: "das8",
        stepName: "Execute Three-Way Comparison",
        trigger: "PO and GR records retrieved",
        inputData: ["Invoice amount", "PO amount", "GR quantity"],
        validationRules: ["Amount within ±2%", "Quantity matches GR", "Vendor matches"],
        systemAction: "Automated comparison of all three documents. Results classified as PASS, PARTIAL, or FAIL.",
        outputProduced: "Match result with detailed variance report",
        logging: "Log: comparison details, variance percentages, result classification.",
      },
    ],

    exceptions: [
      {
        id: "ex6",
        whatCanGoWrong: "PO not found for given PO number",
        howDetected: "SAP lookup returns no results",
        whatHappensNext: "Invoice flagged for manual PO identification",
        whoIsNotified: "AP Analyst",
        dataPreserved: "Invoice data, attempted PO number",
        severity: "medium",
      },
    ],

    comparison: {
      before: {
        steps: 3,
        humanEffort: "~10 minutes per invoice for manual comparison",
        toolsInvolved: ["SAP ERP", "Excel"],
        errorRisks: ["Human error in comparing amounts", "Missed quantity discrepancies"],
      },
      after: {
        steps: 2,
        automationCheckpoints: ["PO existence check", "Three-way tolerance match"],
        humanTouchpoints: ["Review exceptions only"],
        residualRisks: ["PO data quality issues"],
      },
    },

    valueMetrics: [
      { metric: "Business Value", level: "high", explanation: "Eliminates manual comparison effort for 90%+ of invoices.", assumptions: "Assumes PO data is up to date in SAP." },
      { metric: "Implementation Complexity", level: "low", explanation: "Leverages existing SAP matching capabilities.", assumptions: "SAP configuration changes only — no external tools." },
      { metric: "Risk Level", level: "low", explanation: "Clear fallback to manual review for exceptions.", assumptions: "Exception queue monitored daily." },
      { metric: "Change Impact", level: "low", explanation: "Minimal change — analysts shift focus to exceptions only.", assumptions: "No headcount changes expected." },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Validate Invoice", detail: "Three-way match step" },
      { type: "role", name: "AP Analyst", detail: "Currently performs manual matching" },
      { type: "tool", name: "SAP ERP", detail: "Source of PO and GR data" },
      { type: "business_rule", name: "Three-Way Match (±2%)", detail: "Core matching rule" },
    ],

    decisions: [],
    comments: [],
  },

  uc3: {
    useCaseId: "uc3",
    linkedProcess: "Invoice Processing",
    department: "Finance",
    entity: "Accounts Payable",
    automationPattern: "Workflow Automation",

    detectionSignals: [
      {
        id: "ds8",
        type: "rule_based",
        label: "Rule-based decisions",
        description: "Approval routing follows fixed rules based on invoice amount.",
        triggeringStep: "Route for Approval",
        ruleOrThreshold: "Amount thresholds: <$5k auto, $5k-$25k manager, >$25k VP",
      },
      {
        id: "ds9",
        type: "repetitive_manual",
        label: "Repetitive manual steps",
        description: "Manual email routing for each approval request.",
        triggeringStep: "Route for Approval",
        ruleOrThreshold: "Same routing pattern repeated for every invoice",
      },
    ],

    contextReferences: [
      { id: "cr9", type: "tool", name: "DocuSign", detail: "Used for approval signatures." },
      { id: "cr10", type: "business_rule", name: "Approval Matrix", detail: "Tiered approval based on invoice amount." },
    ],

    confidenceLevel: "medium",
    confidenceExplanation: "Medium confidence — routing rules are clear but some approvals involve subjective budget considerations.",

    willBeAutomated: [
      { step: "Determine approval tier", system: "Workflow engine", decision: "Amount-based routing" },
      { step: "Auto-approve under $5,000", system: "Workflow engine" },
      { step: "Route to appropriate approver", system: "Power Automate" },
    ],

    willRemainManual: [
      { item: "Actual approval decision", reason: "Human judgment on budget fit and vendor priority." },
      { item: "Budget override requests", reason: "Requires management discussion." },
    ],

    explicitExclusions: [
      { scenario: "Cross-department charges", reason: "Require multi-party approval not covered by standard matrix." },
    ],

    detailedSteps: [
      {
        id: "das9",
        stepName: "Evaluate Approval Tier",
        trigger: "Invoice passes three-way match",
        inputData: ["Invoice amount", "Department budget data", "Approval matrix"],
        validationRules: ["Amount thresholds correctly applied", "Approver availability confirmed"],
        systemAction: "System classifies invoice into approval tier and identifies the correct approver.",
        outputProduced: "Approval tier assignment and approver identification",
        logging: "Log: tier classification, approver assigned, amount.",
      },
      {
        id: "das10",
        stepName: "Auto-Approve or Route",
        trigger: "Tier determined",
        inputData: ["Tier classification", "Approver details"],
        validationRules: ["Auto-approval only for amounts < $5,000", "Routing confirmation for higher tiers"],
        systemAction: "Invoices under $5k auto-approved with audit log. Others sent to approver via email/Teams with action link.",
        outputProduced: "Approval status or pending notification",
        logging: "Log: approval action, auto vs manual, notification details.",
      },
    ],

    exceptions: [
      {
        id: "ex7",
        whatCanGoWrong: "Approver is unavailable (out of office)",
        howDetected: "OOO status check or no response within 48 hours",
        whatHappensNext: "Escalated to backup approver per delegation matrix",
        whoIsNotified: "Backup approver and AP Manager",
        dataPreserved: "Original routing attempt, escalation reason",
        severity: "low",
      },
    ],

    comparison: {
      before: {
        steps: 3,
        humanEffort: "~15 minutes for routing and follow-up per invoice",
        toolsInvolved: ["DocuSign", "Email"],
        errorRisks: ["Wrong approver selected", "Delayed approvals due to manual routing"],
      },
      after: {
        steps: 2,
        automationCheckpoints: ["Tier classification", "Auto-approval for low amounts"],
        humanTouchpoints: ["Approve/reject decision for amounts > $5k"],
        residualRisks: ["Approver delegation gaps"],
      },
    },

    valueMetrics: [
      { metric: "Business Value", level: "medium", explanation: "Reduces approval cycle time and eliminates routing errors.", assumptions: "Approval matrix is stable and well-defined." },
      { metric: "Implementation Complexity", level: "low", explanation: "Standard workflow engine configuration.", assumptions: "Power Automate or similar already licensed." },
      { metric: "Risk Level", level: "low", explanation: "Fallback to manual routing always available.", assumptions: "Delegation matrix is maintained." },
      { metric: "Change Impact", level: "medium", explanation: "Changes approval habits — managers receive automated requests instead of personal emails.", assumptions: "Training session needed for approvers." },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Route for Approval", detail: "Manual routing step being automated" },
      { type: "process_step", name: "Manager Approval", detail: "Decision step — remains human" },
      { type: "role", name: "AP Analyst", detail: "Currently handles routing" },
      { type: "role", name: "Department Manager", detail: "Approver" },
      { type: "tool", name: "DocuSign", detail: "Current approval tool" },
      { type: "business_rule", name: "Approval Matrix", detail: "Tiered thresholds for approval authority" },
    ],

    decisions: [],
    comments: [],
  },

  uc4: {
    useCaseId: "uc4",
    linkedProcess: "Invoice Processing",
    department: "Finance",
    entity: "Accounts Payable",
    automationPattern: "Scheduled Batch Processing (RPA)",

    detectionSignals: [
      {
        id: "ds10",
        type: "repetitive_manual",
        label: "Repetitive manual steps",
        description: "Payment batching done manually each day by reviewing approved invoices.",
        triggeringStep: "Schedule Payment",
        ruleOrThreshold: "Daily repetition with identical logic",
      },
      {
        id: "ds11",
        type: "rule_based",
        label: "Rule-based decisions",
        description: "Payment grouping follows fixed rules based on payment terms and discount windows.",
        triggeringStep: "Schedule Payment",
        ruleOrThreshold: "2/10 net 30 discount logic is fully deterministic",
      },
    ],

    contextReferences: [
      { id: "cr11", type: "tool", name: "SAP ERP", detail: "Source of approved invoices and payment terms." },
      { id: "cr12", type: "role", name: "Treasury", detail: "Currently reviews and executes payment batches." },
    ],

    confidenceLevel: "low",
    confidenceExplanation: "Low confidence — while logic is rule-based, treasury decisions on cash position involve judgment and market conditions.",

    willBeAutomated: [
      { step: "Identify approved invoices", system: "SAP ERP" },
      { step: "Group by payment terms", system: "RPA bot" },
      { step: "Generate payment batch file", system: "SAP ERP" },
    ],

    willRemainManual: [
      { item: "Cash position assessment", reason: "Depends on real-time treasury decisions and market conditions." },
      { item: "Final payment batch approval", reason: "Treasury sign-off required before execution." },
    ],

    explicitExclusions: [
      { scenario: "Emergency payments", reason: "Handled through separate expedited process." },
      { scenario: "International wire transfers", reason: "Require additional compliance checks not covered by standard automation." },
    ],

    detailedSteps: [
      {
        id: "das11",
        stepName: "Scan Approved Invoices",
        trigger: "Daily scheduled run at 6:00 AM",
        inputData: ["SAP approved invoice list", "Payment terms per vendor"],
        validationRules: ["Invoice must be in 'Approved' status", "Payment date not in future beyond batch window"],
        systemAction: "Bot queries SAP for all invoices with approved status and due within the next 10 business days.",
        outputProduced: "List of payable invoices with amounts and terms",
        logging: "Log: query timestamp, number of invoices found, total amount.",
      },
      {
        id: "das12",
        stepName: "Optimize and Batch",
        trigger: "Invoice list generated",
        inputData: ["Payable invoices", "Discount terms", "Cash position (manual input)"],
        validationRules: ["Early payment discount captured if within window", "Total batch amount within daily limit"],
        systemAction: "Bot groups invoices by vendor, prioritizes early-payment discounts, and creates optimal payment batch.",
        outputProduced: "Payment batch file ready for treasury review",
        logging: "Log: batch composition, discount savings captured, vendor groupings.",
      },
    ],

    exceptions: [
      {
        id: "ex8",
        whatCanGoWrong: "Insufficient cash for full batch",
        howDetected: "Batch total exceeds available cash position",
        whatHappensNext: "Bot generates priority-ranked partial batch for treasury decision",
        whoIsNotified: "Treasury Manager",
        dataPreserved: "Full batch details, priority ranking, shortfall amount",
        severity: "medium",
      },
    ],

    comparison: {
      before: {
        steps: 3,
        humanEffort: "~45 minutes daily for batch review and scheduling",
        toolsInvolved: ["SAP ERP", "Excel"],
        errorRisks: ["Missed early payment discounts", "Manual batch errors"],
      },
      after: {
        steps: 2,
        automationCheckpoints: ["Invoice eligibility scan", "Discount optimization"],
        humanTouchpoints: ["Treasury batch approval", "Cash position input"],
        residualRisks: ["Cash position data staleness"],
      },
    },

    valueMetrics: [
      { metric: "Business Value", level: "low", explanation: "Saves daily effort but main value is in capturing early payment discounts consistently.", assumptions: "Assumes sufficient invoices with discount terms to justify automation." },
      { metric: "Implementation Complexity", level: "medium", explanation: "RPA bot development plus SAP integration and scheduling.", assumptions: "Assumes RPA platform already available (e.g., UiPath, Blue Prism)." },
      { metric: "Risk Level", level: "medium", explanation: "Payment processing is sensitive — errors have direct financial impact.", assumptions: "Assumes thorough testing and parallel run before go-live." },
      { metric: "Change Impact", level: "low", explanation: "Treasury workflow remains largely the same — bot prepares what was previously done manually.", assumptions: "No role changes expected." },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Schedule Payment", detail: "Daily payment scheduling step" },
      { type: "process_step", name: "Execute Payment", detail: "Final payment execution — remains human-approved" },
      { type: "role", name: "AP Manager", detail: "Currently prepares batches" },
      { type: "role", name: "Treasury", detail: "Reviews and executes payments" },
      { type: "tool", name: "SAP ERP", detail: "Payment and invoice management" },
      { type: "business_rule", name: "2/10 Net 30", detail: "Early payment discount terms" },
    ],

    decisions: [],
    comments: [],
  },

  uc5: {
    useCaseId: "uc5",
    linkedProcess: "Candidate Screening",
    department: "Ressources Humaines",
    entity: "Talent Acquisition",
    automationPattern: "Intelligent Document Analysis (NLP)",

    detectionSignals: [
      {
        id: "ds12",
        type: "repetitive_manual",
        label: "Tâches manuelles répétitives",
        description: "Chaque CV est lu manuellement et comparé aux exigences du poste par le recruteur.",
        triggeringStep: "Trier les CV",
        ruleOrThreshold: "200+ candidatures par poste ouvert, même grille d'évaluation appliquée",
      },
      {
        id: "ds13",
        type: "structured_inputs",
        label: "Entrées structurées",
        description: "Les CV et descriptions de poste suivent des formats prévisibles (compétences, expérience, formation).",
        triggeringStep: "Recevoir candidature",
        ruleOrThreshold: "85% des CV sont au format PDF/DOCX avec sections identifiables",
      },
      {
        id: "ds14",
        type: "rule_based",
        label: "Décisions basées sur des règles",
        description: "Le premier tri suit des critères objectifs : années d'expérience, diplômes requis, compétences clés.",
        triggeringStep: "Évaluer critères minimum",
        ruleOrThreshold: "Critères éliminatoires définis dans 90% des fiches de poste",
      },
      {
        id: "ds15",
        type: "high_frequency",
        label: "Volume élevé",
        description: "L'équipe traite en moyenne 150 candidatures par semaine durant les périodes de recrutement.",
        triggeringStep: "Trier les CV",
        ruleOrThreshold: "Fréquence > 100 candidatures/semaine",
      },
    ],

    contextReferences: [
      { id: "cr13", type: "role", name: "Recruteur", detail: "Passe ~40% de son temps à trier et évaluer les CV. Gère 5-8 postes simultanément." },
      { id: "cr14", type: "role", name: "Hiring Manager", detail: "Définit les critères du poste et évalue la shortlist finale." },
      { id: "cr15", type: "tool", name: "Workday", detail: "ATS principal — gestion des candidatures, suivi du pipeline." },
      { id: "cr16", type: "tool", name: "LinkedIn Recruiter", detail: "Source de candidatures et communication avec les candidats." },
      { id: "cr17", type: "business_rule", name: "Critères éliminatoires", detail: "Expérience minimum, diplômes requis, localisation géographique, langues." },
      { id: "cr18", type: "constraint", name: "Réglementation RGPD", detail: "Les données des candidats doivent être traitées conformément au RGPD — consentement, droit à l'oubli, durée de conservation." },
    ],

    confidenceLevel: "high",
    confidenceExplanation: "Confiance élevée car les critères de tri sont explicites, les volumes sont importants et le processus est hautement répétitif.",

    willBeAutomated: [
      { step: "Extraire les informations du CV", system: "Azure AI / NLP" },
      { step: "Comparer aux critères du poste", system: "Moteur de scoring", decision: "Score de pertinence ≥ seuil" },
      { step: "Classer les candidats", system: "Workday API" },
      { step: "Générer la shortlist", system: "Workflow automatisé" },
      { step: "Envoyer les notifications aux candidats", system: "Email automatique" },
    ],

    willRemainManual: [
      { item: "Évaluation qualitative de la shortlist", reason: "Le hiring manager doit évaluer la culture fit et le potentiel de développement." },
      { item: "Entretien de pré-qualification", reason: "Interaction humaine nécessaire pour évaluer la motivation et la communication." },
      { item: "Décision finale d'embauche", reason: "Implique négociation salariale et validation RH." },
    ],

    explicitExclusions: [
      { scenario: "Postes de direction (C-level)", reason: "Processus de recrutement spécifique avec cabinet de chasse de têtes." },
      { scenario: "Candidatures spontanées sans poste cible", reason: "Pas de fiche de poste pour le matching automatique." },
      { scenario: "Candidats internes", reason: "Processus de mobilité interne distinct avec critères différents." },
    ],

    detailedSteps: [
      {
        id: "das13",
        stepName: "Réception et parsing du CV",
        trigger: "Nouvelle candidature reçue dans Workday",
        inputData: ["CV au format PDF/DOCX", "Fiche de poste", "Profil LinkedIn (si disponible)"],
        validationRules: ["Format de fichier supporté (PDF, DOCX)", "Taille < 5 Mo", "Candidature complète (CV + lettre de motivation)"],
        systemAction: "Le système parse le CV, extrait les sections (expérience, formation, compétences) et crée un profil candidat structuré.",
        outputProduced: "Profil candidat JSON : nom, expériences, compétences, formation, langues, certifications",
        logging: "Log : candidature reçue, parsing réussi/échoué, temps de traitement.",
      },
      {
        id: "das14",
        stepName: "Scoring par critères objectifs",
        trigger: "Profil candidat structuré disponible",
        inputData: ["Profil candidat structuré", "Critères de la fiche de poste"],
        validationRules: ["Expérience minimum atteinte", "Diplômes requis présents", "Compétences obligatoires couvertes à ≥ 60%"],
        systemAction: "Le moteur NLP compare sémantiquement les compétences du candidat avec les exigences. Score pondéré calculé (0-100).",
        outputProduced: "Score de pertinence avec détail par critère, classification : Qualifié / À évaluer / Non qualifié",
        logging: "Log : score par critère, score global, classification, justification.",
      },
      {
        id: "das15",
        stepName: "Classement et génération de shortlist",
        trigger: "Scoring terminé pour toutes les candidatures d'un poste",
        inputData: ["Scores de tous les candidats", "Nombre de places en shortlist (configurable)"],
        validationRules: ["Minimum 3 candidats qualifiés pour constituer une shortlist", "Diversité vérifiée (pas de biais sur genre/âge)"],
        systemAction: "Classement des candidats par score décroissant. Top N sélectionnés pour la shortlist. Rapport de diversité généré.",
        outputProduced: "Shortlist avec profils classés, rapport de scoring comparatif, rapport de diversité",
        logging: "Log : shortlist générée, nombre de candidats qualifiés, distribution des scores.",
      },
      {
        id: "das16",
        stepName: "Notification automatique aux candidats",
        trigger: "Shortlist validée par le recruteur",
        inputData: ["Statut candidat (shortlisté / non retenu)", "Template email", "Données candidat"],
        validationRules: ["Email valide", "Consentement RGPD vérifié", "Délai de notification ≤ 5 jours ouvrés"],
        systemAction: "Envoi d'emails personnalisés : invitation à l'entretien pour les shortlistés, message de rejet courtois pour les autres.",
        outputProduced: "Emails envoyés, statuts mis à jour dans Workday",
        logging: "Log : emails envoyés, taux de délivrance, statuts Workday mis à jour.",
      },
    ],

    exceptions: [
      {
        id: "ex9",
        whatCanGoWrong: "CV dans un format non supporté (image, scan mal formaté)",
        howDetected: "Échec du parsing — aucune section structurée détectée",
        whatHappensNext: "CV mis en file d'attente pour revue manuelle avec notification au recruteur",
        whoIsNotified: "Recruteur assigné au poste",
        dataPreserved: "Fichier original, métadonnées de la candidature, résultat d'erreur de parsing",
        severity: "low",
      },
      {
        id: "ex10",
        whatCanGoWrong: "Aucun candidat n'atteint le score minimum de qualification",
        howDetected: "Tous les scores < seuil configurable (par défaut 40/100)",
        whatHappensNext: "Alerte au recruteur et au hiring manager. Suggestion de réviser les critères du poste.",
        whoIsNotified: "Recruteur et Hiring Manager",
        dataPreserved: "Tous les scores avec détails, critères appliqués, suggestion de modification",
        severity: "medium",
      },
      {
        id: "ex11",
        whatCanGoWrong: "Biais détecté dans les résultats (surreprésentation d'un groupe)",
        howDetected: "Contrôle de diversité automatique sur la shortlist",
        whatHappensNext: "Rapport de biais généré. Shortlist mise en attente pour revue humaine.",
        whoIsNotified: "Responsable Diversité & Inclusion, Recruteur",
        dataPreserved: "Distribution démographique anonymisée, métriques de biais, shortlist alternative",
        severity: "high",
      },
    ],

    comparison: {
      before: {
        steps: 5,
        humanEffort: "~3 minutes par CV × 200 = 10 heures par poste ouvert",
        toolsInvolved: ["Workday", "Email", "Excel", "LinkedIn"],
        errorRisks: [
          "Biais inconscient du recruteur",
          "Incohérence d'évaluation entre recruteurs",
          "Candidats qualifiés manqués par fatigue",
          "Délais de réponse longs (candidats perdus)",
        ],
      },
      after: {
        steps: 3,
        automationCheckpoints: [
          "Parsing et extraction du CV",
          "Scoring NLP par critères objectifs",
          "Contrôle de diversité automatique",
          "Notification automatisée",
        ],
        humanTouchpoints: [
          "Validation de la shortlist",
          "Entretien de pré-qualification",
          "Décision finale d'embauche",
        ],
        residualRisks: [
          "Biais intégré dans les données d'entraînement (~2%)",
          "CV très atypiques mal évalués",
          "Dépendance à la qualité des fiches de poste",
        ],
      },
    },

    valueMetrics: [
      { metric: "Valeur métier", level: "high", explanation: "Réduit le temps de screening de 70%, améliore la qualité de la shortlist et l'expérience candidat.", assumptions: "Basé sur 200 candidatures/poste et 15 postes ouverts/trimestre." },
      { metric: "Complexité de mise en œuvre", level: "medium", explanation: "Nécessite l'intégration NLP, la configuration Workday API et le calibrage du modèle de scoring.", assumptions: "Suppose un accès API Workday et un abonnement Azure AI." },
      { metric: "Niveau de risque", level: "low", explanation: "Risque faible grâce au contrôle humain de la shortlist et aux vérifications de biais intégrées.", assumptions: "Suppose une revue régulière des métriques de biais." },
      { metric: "Impact sur le changement", level: "medium", explanation: "Les recruteurs passent de la lecture exhaustive de CV à la validation de shortlists IA. Formation nécessaire.", assumptions: "Programme de formation de 2 semaines prévu avant le déploiement." },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Trier les CV", detail: "Étape de tri manuel remplacée par scoring automatique" },
      { type: "process_step", name: "Constituer shortlist", detail: "Étape de sélection assistée par classement IA" },
      { type: "role", name: "Recruteur", detail: "Opérateur principal — passe de l'exécution à la supervision" },
      { type: "role", name: "Hiring Manager", detail: "Validateur de la shortlist finale" },
      { type: "tool", name: "Workday", detail: "ATS source et destination des données candidats" },
      { type: "tool", name: "Azure AI", detail: "Moteur NLP pour l'analyse sémantique" },
      { type: "business_rule", name: "Critères éliminatoires", detail: "Expérience, diplômes, compétences obligatoires" },
      { type: "business_rule", name: "RGPD", detail: "Consentement, durée de conservation, droit à l'oubli" },
    ],

    decisions: [
      {
        id: "dec3",
        action: "approved",
        user: "Julie Martin (DRH)",
        timestamp: "2026-02-16T10:00:00",
        comment: "Approuvé. Le contrôle de biais intégré est un point fort. À déployer sur 3 postes pilotes d'abord.",
      },
    ],
    comments: [
      {
        id: "com4",
        user: "Julie Martin",
        timestamp: "2026-02-15T14:30:00",
        text: "Comment le modèle gère-t-il les reconversions professionnelles ? Un candidat avec peu d'expérience directe mais de bonnes compétences transférables pourrait être pénalisé.",
      },
      {
        id: "com5",
        user: "Thomas Dupont (Data Scientist)",
        timestamp: "2026-02-15T16:45:00",
        text: "Bonne question. Le scoring NLP prend en compte la similarité sémantique, pas seulement les mots-clés exacts. Un développeur Java qui postule pour du Python sera reconnu comme pertinent. On ajoutera aussi un flag 'profil atypique' pour les cas limites.",
      },
    ],
  },

  uc6: {
    useCaseId: "uc6",
    linkedProcess: "Candidate Screening",
    department: "Ressources Humaines",
    entity: "Talent Acquisition",
    automationPattern: "Calendar Integration & Workflow",

    detectionSignals: [
      {
        id: "ds16",
        type: "repetitive_manual",
        label: "Tâches manuelles répétitives",
        description: "Le recruteur envoie manuellement des emails pour proposer des créneaux et coordonner les agendas.",
        triggeringStep: "Planifier entretien",
        ruleOrThreshold: "5-10 emails échangés en moyenne par entretien planifié",
      },
      {
        id: "ds17",
        type: "tool_transfer",
        label: "Transfert inter-outils",
        description: "Le recruteur navigue entre Outlook, Workday et Teams pour vérifier les disponibilités et créer les invitations.",
        triggeringStep: "Vérifier disponibilités",
        ruleOrThreshold: "3 outils consultés manuellement par planification",
      },
    ],

    contextReferences: [
      { id: "cr19", type: "role", name: "Recruteur", detail: "Coordonne les agendas entre candidat, hiring manager et panel. ~30% du temps passé en coordination." },
      { id: "cr20", type: "tool", name: "Outlook", detail: "Calendrier principal pour vérifier les disponibilités des managers." },
      { id: "cr21", type: "tool", name: "Microsoft Teams", detail: "Plateforme d'entretien vidéo par défaut." },
      { id: "cr22", type: "business_rule", name: "Délai de planification", detail: "L'entretien doit être planifié dans les 5 jours ouvrés suivant la shortlist." },
    ],

    confidenceLevel: "high",
    confidenceExplanation: "Confiance élevée — le processus est purement logistique, sans décision subjective. Les API calendrier sont matures.",

    willBeAutomated: [
      { step: "Vérifier les disponibilités du manager", system: "Microsoft Graph API" },
      { step: "Proposer des créneaux au candidat", system: "Email automatique / Bookings" },
      { step: "Confirmer et créer l'invitation", system: "Outlook + Teams", decision: "Créneau accepté par le candidat" },
      { step: "Envoyer les rappels", system: "Workflow automatisé" },
    ],

    willRemainManual: [
      { item: "Choix du panel d'entretien", reason: "Le recruteur sélectionne les interviewers en fonction du poste et de la disponibilité de l'équipe." },
      { item: "Reprogrammation pour cas exceptionnels", reason: "Annulations de dernière minute nécessitent une gestion humaine du contexte." },
    ],

    explicitExclusions: [
      { scenario: "Entretiens sur site avec logistique voyage", reason: "Implique réservation de billets, hôtels et remboursements — processus séparé." },
      { scenario: "Entretiens pour postes confidentiels", reason: "Nécessite coordination privée hors des systèmes standard." },
    ],

    detailedSteps: [
      {
        id: "das17",
        stepName: "Récupérer les disponibilités",
        trigger: "Candidat ajouté à la shortlist validée",
        inputData: ["Calendrier Outlook du hiring manager", "Calendrier du panel (si applicable)", "Préférences du candidat"],
        validationRules: ["Créneaux de 45-60 minutes", "Pas de conflit avec les réunions existantes", "Dans les 5 jours ouvrés"],
        systemAction: "L'API Graph interroge les calendriers Outlook et identifie les créneaux communs disponibles.",
        outputProduced: "Liste de 3-5 créneaux proposables, triés par préférence",
        logging: "Log : nombre de créneaux identifiés, calendriers consultés, contraintes appliquées.",
      },
      {
        id: "das18",
        stepName: "Envoyer proposition au candidat",
        trigger: "Créneaux disponibles identifiés",
        inputData: ["Créneaux proposés", "Email du candidat", "Template d'invitation"],
        validationRules: ["Email candidat valide", "Au moins 3 créneaux proposés", "Lien de réservation fonctionnel"],
        systemAction: "Email personnalisé envoyé au candidat avec un lien Bookings/Calendly pour choisir son créneau préféré.",
        outputProduced: "Email de proposition envoyé, lien de réservation actif",
        logging: "Log : email envoyé, créneaux proposés, lien de réservation.",
      },
      {
        id: "das19",
        stepName: "Confirmer et créer l'événement",
        trigger: "Candidat sélectionne un créneau",
        inputData: ["Créneau choisi", "Détails du candidat", "Lien Teams à générer"],
        validationRules: ["Créneau toujours disponible (double-check)", "Lien Teams généré avec succès"],
        systemAction: "Système crée l'invitation calendrier pour tous les participants, génère le lien Teams, et met à jour Workday.",
        outputProduced: "Invitation calendrier envoyée, lien Teams créé, statut Workday mis à jour",
        logging: "Log : événement créé, participants notifiés, statut Workday.",
      },
      {
        id: "das20",
        stepName: "Rappels automatiques",
        trigger: "24h et 1h avant l'entretien",
        inputData: ["Détails de l'entretien", "Contacts des participants"],
        validationRules: ["Entretien non annulé", "Rappel non déjà envoyé"],
        systemAction: "Envoi de rappels email/Teams au candidat et aux interviewers avec les détails de l'entretien.",
        outputProduced: "Rappels envoyés à tous les participants",
        logging: "Log : rappels envoyés, destinataires, heure d'envoi.",
      },
    ],

    exceptions: [
      {
        id: "ex12",
        whatCanGoWrong: "Aucun créneau commun trouvé dans les 5 jours ouvrés",
        howDetected: "Algorithme de matching ne retourne aucun résultat",
        whatHappensNext: "Alerte au recruteur pour élargir la fenêtre ou proposer des alternatives (soir, autre manager).",
        whoIsNotified: "Recruteur",
        dataPreserved: "Calendriers consultés, contraintes appliquées, plage recherchée",
        severity: "low",
      },
      {
        id: "ex13",
        whatCanGoWrong: "Candidat ne répond pas dans les 48h",
        howDetected: "Pas de sélection de créneau après 48h",
        whatHappensNext: "Rappel automatique envoyé. Si pas de réponse après 72h supplémentaires, notification au recruteur.",
        whoIsNotified: "Recruteur (après 5 jours sans réponse)",
        dataPreserved: "Historique des notifications, créneaux proposés, statut candidat",
        severity: "low",
      },
      {
        id: "ex14",
        whatCanGoWrong: "Conflit de calendrier de dernière minute (manager annule)",
        howDetected: "Changement détecté dans le calendrier Outlook après confirmation",
        whatHappensNext: "Notification au recruteur et au candidat. Proposition automatique de nouveaux créneaux.",
        whoIsNotified: "Recruteur, candidat, hiring manager",
        dataPreserved: "Entretien original, raison du conflit, nouveaux créneaux proposés",
        severity: "medium",
      },
    ],

    comparison: {
      before: {
        steps: 5,
        humanEffort: "~20 minutes par entretien planifié (emails, vérifications calendrier, création invitation)",
        toolsInvolved: ["Outlook", "Workday", "Teams", "Email"],
        errorRisks: [
          "Doubles réservations (calendrier non à jour)",
          "Oubli de rappel au candidat",
          "Délai de planification dépassé",
          "Lien Teams oublié dans l'invitation",
        ],
      },
      after: {
        steps: 2,
        automationCheckpoints: [
          "Vérification automatique des disponibilités",
          "Lien de réservation self-service",
          "Création automatique d'événement Teams",
          "Rappels programmés",
        ],
        humanTouchpoints: [
          "Choix du panel d'entretien",
          "Gestion des cas exceptionnels",
        ],
        residualRisks: [
          "Calendrier Outlook non à jour",
          "Candidat préfère un canal de communication différent",
        ],
      },
    },

    valueMetrics: [
      { metric: "Valeur métier", level: "medium", explanation: "Élimine 90% des emails de coordination et réduit le délai de planification de 5 jours à quelques heures.", assumptions: "Basé sur 50 entretiens/mois avec 5-10 emails de coordination chacun." },
      { metric: "Complexité de mise en œuvre", level: "low", explanation: "Utilise des outils Microsoft existants (Graph API, Bookings). Intégration standard.", assumptions: "Licence Microsoft 365 Business avec Bookings inclus." },
      { metric: "Niveau de risque", level: "low", explanation: "Aucun risque opérationnel majeur — le pire cas est un retour à la coordination manuelle.", assumptions: "API Microsoft Graph stable et documentée." },
      { metric: "Impact sur le changement", level: "low", explanation: "Les recruteurs gagnent du temps sans changer fondamentalement leur processus. Adoption rapide attendue.", assumptions: "Formation de 2h suffisante pour l'ensemble de l'équipe." },
    ],

    traceabilityLinks: [
      { type: "process_step", name: "Planifier entretien", detail: "Étape de coordination manuelle remplacée par self-service" },
      { type: "process_step", name: "Envoyer rappel", detail: "Rappels manuels remplacés par automatisation" },
      { type: "role", name: "Recruteur", detail: "Libéré de la coordination logistique" },
      { type: "role", name: "Hiring Manager", detail: "Reçoit l'invitation automatiquement" },
      { type: "tool", name: "Microsoft Graph API", detail: "API d'accès aux calendriers Outlook" },
      { type: "tool", name: "Microsoft Bookings", detail: "Self-service de réservation pour les candidats" },
      { type: "tool", name: "Microsoft Teams", detail: "Plateforme vidéo pour les entretiens" },
      { type: "business_rule", name: "Délai 5 jours ouvrés", detail: "SLA de planification d'entretien" },
    ],

    decisions: [],
    comments: [
      {
        id: "com6",
        user: "Amélie Durand (Recruteuse senior)",
        timestamp: "2026-02-16T11:00:00",
        text: "C'est exactement ce dont on a besoin. Je passe littéralement des heures à envoyer des emails de coordination. Question : est-ce que les candidats qui n'ont pas Outlook pourront quand même choisir un créneau ?",
      },
      {
        id: "com7",
        user: "Marc Lefebvre (IT)",
        timestamp: "2026-02-16T14:15:00",
        text: "Oui, le lien Bookings fonctionne dans n'importe quel navigateur, pas besoin d'Outlook. Le candidat voit les créneaux disponibles et clique pour réserver. C'est compatible mobile aussi.",
      },
    ],
  },
};

// ========== Variant Mock Data ==========

export interface MockVariant {
  variant_number: number;
  variant_name: string;
  approach_description: string;
  complexity: string;
  impact: string;
  roi_estimate: string;
  tools_suggested: string[];
  pros: string[];
  cons: string[];
  estimated_cost: string;
  estimated_timeline: string;
  recommended: boolean;
}

export const mockVariants: Record<string, MockVariant[]> = {
  uc1: [
    {
      variant_number: 1,
      variant_name: "RPA Simple",
      approach_description: "Automatisation basée sur un robot RPA qui simule les actions manuelles : ouverture des emails, téléchargement des pièces jointes, saisie dans SAP via l'interface utilisateur. Approche non-invasive ne nécessitant aucune modification de SAP.",
      complexity: "low",
      impact: "medium",
      roi_estimate: "Réduction de 40% du temps de saisie",
      tools_suggested: ["UiPath", "Outlook", "SAP GUI"],
      pros: [
        "Mise en œuvre rapide (2-3 semaines)",
        "Aucune modification de SAP requise",
        "Coût initial faible",
        "Facilement réversible",
      ],
      cons: [
        "Fragile aux changements d'interface SAP",
        "Ne gère pas les formats de facture variés",
        "Maintenance continue nécessaire",
        "Pas de validation intelligente des données",
      ],
      estimated_cost: "5 000 – 15 000 €",
      estimated_timeline: "2-3 semaines",
      recommended: false,
    },
    {
      variant_number: 2,
      variant_name: "IA + OCR",
      approach_description: "Extraction intelligente des données de facture via OCR (Azure Form Recognizer) couplée à une validation IA. Les données extraites sont injectées dans SAP via API. Gère les formats variés et apprend des corrections.",
      complexity: "medium",
      impact: "high",
      roi_estimate: "Réduction de 80% du temps de traitement, taux d'erreur < 3%",
      tools_suggested: ["Azure Form Recognizer", "SAP API", "Power Automate", "Azure Functions"],
      pros: [
        "Gère les formats de facture variés",
        "Amélioration continue par apprentissage",
        "Validation intelligente des données",
        "Intégration SAP via API (robuste)",
        "Scalable pour des volumes croissants",
      ],
      cons: [
        "Coût initial plus élevé",
        "Nécessite une configuration OCR initiale",
        "Dépendance à Azure",
        "Délai de mise en œuvre plus long",
      ],
      estimated_cost: "25 000 – 50 000 €",
      estimated_timeline: "6-8 semaines",
      recommended: true,
    },
    {
      variant_number: 3,
      variant_name: "Intégration Complète",
      approach_description: "Solution end-to-end intégrant OCR, validation IA, matching automatique PO/GR, workflow d'approbation et paiement. Couvre l'ensemble du cycle de vie de la facture avec un tableau de bord temps réel.",
      complexity: "high",
      impact: "high",
      roi_estimate: "Réduction de 90% du temps, ROI en 8-12 mois",
      tools_suggested: ["Azure Form Recognizer", "SAP S/4HANA", "Power Platform", "Azure AI", "Power BI"],
      pros: [
        "Automatisation de bout en bout",
        "Tableau de bord et analytics temps réel",
        "Réduction maximale des erreurs",
        "Conformité SOX intégrée",
        "Scalable pour l'entreprise",
      ],
      cons: [
        "Investissement initial important",
        "Complexité de mise en œuvre élevée",
        "Nécessite coordination multi-équipes",
        "Risque de sur-ingénierie pour des volumes modérés",
        "Délai de mise en œuvre long",
      ],
      estimated_cost: "80 000 – 150 000 €",
      estimated_timeline: "3-5 mois",
      recommended: false,
    },
  ],
  uc2: [
    {
      variant_number: 1,
      variant_name: "Matching SAP natif",
      approach_description: "Activation et configuration des fonctionnalités de matching automatique native de SAP. Paramétrage des tolérances et des règles de matching sans développement externe.",
      complexity: "low",
      impact: "high",
      roi_estimate: "Réduction de 70% de l'effort de validation",
      tools_suggested: ["SAP ERP", "SAP Configuration"],
      pros: [
        "Utilise les fonctionnalités existantes",
        "Coût minimal",
        "Support SAP standard",
      ],
      cons: [
        "Flexibilité limitée des règles",
        "Pas de ML pour cas ambigus",
      ],
      estimated_cost: "3 000 – 8 000 €",
      estimated_timeline: "1-2 semaines",
      recommended: true,
    },
    {
      variant_number: 2,
      variant_name: "Matching IA avancé",
      approach_description: "Module de matching intelligent utilisant le ML pour gérer les cas ambigus, apprendre des décisions passées et améliorer la précision au fil du temps.",
      complexity: "high",
      impact: "high",
      roi_estimate: "Réduction de 95% des interventions manuelles",
      tools_suggested: ["Azure ML", "SAP API", "Python"],
      pros: [
        "Gère les cas ambigus",
        "Amélioration continue",
        "Taux de matching supérieur",
      ],
      cons: [
        "Développement sur mesure",
        "Données d'entraînement nécessaires",
        "Coût et délai élevés",
      ],
      estimated_cost: "40 000 – 70 000 €",
      estimated_timeline: "2-3 mois",
      recommended: false,
    },
  ],
  uc3: [
    {
      variant_number: 1,
      variant_name: "Power Automate",
      approach_description: "Workflow d'approbation configuré dans Power Automate avec routage basé sur la matrice d'approbation existante. Notifications Teams/email automatiques.",
      complexity: "low",
      impact: "medium",
      roi_estimate: "Réduction de 60% du temps de routage",
      tools_suggested: ["Power Automate", "Microsoft Teams", "SAP"],
      pros: ["Mise en place rapide", "Intégration Microsoft native", "Faible coût"],
      cons: ["Logique d'approbation simple", "Limité à l'écosystème Microsoft"],
      estimated_cost: "5 000 – 10 000 €",
      estimated_timeline: "1-2 semaines",
      recommended: true,
    },
    {
      variant_number: 2,
      variant_name: "Workflow SAP intégré",
      approach_description: "Utilisation du module SAP Workflow pour un routage d'approbation intégré au sein de l'ERP, avec traçabilité complète et conformité native.",
      complexity: "medium",
      impact: "high",
      roi_estimate: "Réduction de 80% du temps, traçabilité complète",
      tools_suggested: ["SAP Workflow", "SAP Fiori"],
      pros: ["Intégration SAP native", "Traçabilité SOX", "Pas de système externe"],
      cons: ["Configuration SAP complexe", "Coût de licence", "Moins flexible"],
      estimated_cost: "20 000 – 40 000 €",
      estimated_timeline: "4-6 semaines",
      recommended: false,
    },
  ],
  uc4: [
    {
      variant_number: 1,
      variant_name: "RPA planification",
      approach_description: "Robot RPA qui scanne quotidiennement les factures approuvées dans SAP, les regroupe par conditions de paiement et génère un fichier batch pour validation par la trésorerie.",
      complexity: "medium",
      impact: "medium",
      roi_estimate: "Capture systématique des remises 2/10 net 30",
      tools_suggested: ["UiPath", "SAP ERP", "Excel"],
      pros: ["Automatisation de la routine quotidienne", "Optimisation des remises de paiement", "Faible risque"],
      cons: ["Nécessite une plateforme RPA", "Maintenance du bot", "Pas d'optimisation de trésorerie avancée"],
      estimated_cost: "15 000 – 30 000 €",
      estimated_timeline: "3-4 semaines",
      recommended: true,
    },
    {
      variant_number: 2,
      variant_name: "Module SAP Payment",
      approach_description: "Configuration du module de paiement automatique SAP (F110) avec règles de planification avancées et intégration bancaire directe.",
      complexity: "high",
      impact: "high",
      roi_estimate: "Réduction de 80% du temps + optimisation trésorerie",
      tools_suggested: ["SAP F110", "SAP Bank Communication", "SAP Fiori"],
      pros: ["Intégration native SAP", "Paiement direct bancaire", "Traçabilité complète", "Gestion multi-devises"],
      cons: ["Configuration complexe", "Coût de consulting SAP élevé", "Risque de migration"],
      estimated_cost: "50 000 – 90 000 €",
      estimated_timeline: "2-3 mois",
      recommended: false,
    },
  ],
  uc5: [
    {
      variant_number: 1,
      variant_name: "Scoring par mots-clés",
      approach_description: "Analyse automatique des CV par correspondance de mots-clés avec les exigences du poste. Score de pertinence calculé et classement automatique des candidats.",
      complexity: "low",
      impact: "medium",
      roi_estimate: "Réduction de 50% du temps de tri",
      tools_suggested: ["Python", "Workday API"],
      pros: ["Mise en œuvre rapide", "Transparent et explicable", "Faible coût"],
      cons: ["Ne capte pas le contexte sémantique", "Biais potentiel sur les mots-clés", "Pas d'apprentissage"],
      estimated_cost: "8 000 – 15 000 €",
      estimated_timeline: "2-3 semaines",
      recommended: false,
    },
    {
      variant_number: 2,
      variant_name: "IA NLP avancée",
      approach_description: "Modèle de NLP qui comprend le contexte sémantique des CV et des descriptions de poste. Scoring intelligent avec explications.",
      complexity: "medium",
      impact: "high",
      roi_estimate: "Réduction de 70% du temps, qualité +40%",
      tools_suggested: ["Azure AI", "Workday API", "Power Automate"],
      pros: ["Compréhension sémantique", "Scoring expliqué", "Amélioration continue", "Réduction des biais"],
      cons: ["Données d'entraînement nécessaires", "Coût Azure AI", "Délai de mise en œuvre"],
      estimated_cost: "30 000 – 55 000 €",
      estimated_timeline: "6-8 semaines",
      recommended: true,
    },
    {
      variant_number: 3,
      variant_name: "Plateforme ATS intelligente",
      approach_description: "Remplacement complet par une plateforme ATS avec IA intégrée (ex: HireVue, Eightfold). Screening, scoring et coordination automatisés de bout en bout.",
      complexity: "high",
      impact: "high",
      roi_estimate: "Réduction de 85% du temps total de recrutement",
      tools_suggested: ["Eightfold AI", "HireVue", "Workday Integration"],
      pros: ["Solution clé en main", "IA état de l'art", "Analytics avancées", "Expérience candidat améliorée"],
      cons: ["Coût de licence élevé", "Dépendance fournisseur", "Migration complexe", "Délai d'implémentation long"],
      estimated_cost: "80 000 – 120 000 €/an",
      estimated_timeline: "3-4 mois",
      recommended: false,
    },
  ],
  uc6: [
    {
      variant_number: 1,
      variant_name: "Microsoft Bookings",
      approach_description: "Utilisation de Microsoft Bookings intégré à Outlook pour permettre aux candidats de choisir un créneau disponible parmi les plages proposées par les managers.",
      complexity: "low",
      impact: "medium",
      roi_estimate: "Réduction de 90% des emails de coordination",
      tools_suggested: ["Microsoft Bookings", "Outlook", "Teams"],
      pros: ["Déploiement immédiat", "Intégration Microsoft native", "Zéro développement", "Gratuit avec M365"],
      cons: ["Personnalisation limitée", "Pas de logique de priorité", "Branding limité"],
      estimated_cost: "1 000 – 3 000 €",
      estimated_timeline: "1 semaine",
      recommended: true,
    },
    {
      variant_number: 2,
      variant_name: "Calendly + Graph API",
      approach_description: "Intégration Calendly avec Microsoft Graph API pour synchronisation bidirectionnelle des calendriers. Workflow automatisé de rappels et confirmation.",
      complexity: "medium",
      impact: "high",
      roi_estimate: "Réduction de 95% du temps, expérience candidat premium",
      tools_suggested: ["Calendly", "Microsoft Graph API", "Power Automate"],
      pros: ["Expérience candidat excellente", "Personnalisation avancée", "Rappels automatiques", "Analytics"],
      cons: ["Coût de licence Calendly", "Intégration à configurer", "Dépendance outil tiers"],
      estimated_cost: "5 000 – 12 000 €",
      estimated_timeline: "2-3 semaines",
      recommended: false,
    },
  ],
};
