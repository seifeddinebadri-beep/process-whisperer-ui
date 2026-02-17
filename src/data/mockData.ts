// ============================================================
// Mock Data for Automation Discovery Dashboard
// ============================================================

export interface Tool {
  id: string;
  name: string;
  purpose: string;
  type: "manual" | "semi-automated" | "system";
  documentation?: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  businessObjective: string;
  tools: string[]; // tool IDs
  documentation?: string[];
}

export interface Entity {
  id: string;
  name: string;
  activities: Activity[];
}

export interface Department {
  id: string;
  name: string;
  entities: Entity[];
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  strategyNotes: string;
  departments: Department[];
  tools: Tool[];
}

export interface UploadedProcess {
  id: string;
  fileName: string;
  uploadDate: string;
  companyId: string;
  departmentId: string;
  entityId: string;
  activityId: string;
  notes: string;
  status: "uploaded" | "analyzed" | "approved" | "discovered";
}

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
}

export interface ProcessContext {
  processObjective?: string;
  knownConstraints?: string;
  assumptions?: string;
  painPointsSummary?: string;
  volumeAndFrequency?: string;
  stakeholderNotes?: string;
}

export interface ProcessAnalysis {
  processId: string;
  steps: ProcessStep[];
  roles: string[];
  toolsUsed: string[];
  context?: ProcessContext;
}

export interface AutomationUseCase {
  id: string;
  processId: string;
  name: string;
  description: string;
  potential: "low" | "medium" | "high";
  howToAutomate: string;
  trigger: string;
  inputs: string[];
  outputs: string[];
  automatedProcessDescription: string;
}

// ---------- Companies ----------

export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Acme Corp",
    industry: "Manufacturing",
    size: "500–1,000 employees",
    strategyNotes: "Focus on digital transformation and operational efficiency improvements across all production lines.",
    departments: [
      {
        id: "d1",
        name: "Finance",
        entities: [
          {
            id: "e1",
            name: "Accounts Payable",
            activities: [
              {
                id: "a1",
                name: "Invoice Processing",
                description: "Receive, validate, and process vendor invoices for payment.",
                businessObjective: "Reduce invoice processing time by 40%",
                tools: ["t1", "t2"],
                documentation: ["AP_Guidelines_v3.pdf"],
              },
              {
                id: "a2",
                name: "Vendor Onboarding",
                description: "Register new vendors, collect documentation, and set up payment terms.",
                businessObjective: "Streamline vendor setup to under 2 business days",
                tools: ["t1", "t3"],
              },
            ],
          },
          {
            id: "e2",
            name: "Financial Reporting",
            activities: [
              {
                id: "a3",
                name: "Monthly Close",
                description: "Consolidate financial data and produce monthly reports.",
                businessObjective: "Close books within 5 business days",
                tools: ["t1", "t4"],
              },
            ],
          },
        ],
      },
      {
        id: "d2",
        name: "Human Resources",
        entities: [
          {
            id: "e3",
            name: "Talent Acquisition",
            activities: [
              {
                id: "a4",
                name: "Candidate Screening",
                description: "Review applications, schedule interviews, and manage candidate pipeline.",
                businessObjective: "Reduce time-to-hire by 30%",
                tools: ["t5", "t3"],
              },
            ],
          },
          {
            id: "e4",
            name: "Payroll",
            activities: [
              {
                id: "a5",
                name: "Payroll Processing",
                description: "Calculate salaries, deductions, and generate payslips monthly.",
                businessObjective: "Zero payroll errors per quarter",
                tools: ["t1", "t6"],
              },
            ],
          },
        ],
      },
      {
        id: "d3",
        name: "Operations",
        entities: [
          {
            id: "e5",
            name: "Supply Chain",
            activities: [
              {
                id: "a6",
                name: "Order Fulfillment",
                description: "Process customer orders from receipt to shipment.",
                businessObjective: "Achieve 98% on-time delivery rate",
                tools: ["t7", "t1"],
              },
            ],
          },
        ],
      },
    ],
    tools: [
      { id: "t1", name: "SAP ERP", purpose: "Enterprise resource planning", type: "system", documentation: "SAP_Config.pdf" },
      { id: "t2", name: "DocuSign", purpose: "Digital signature and document routing", type: "semi-automated" },
      { id: "t3", name: "Microsoft Excel", purpose: "Data analysis and tracking", type: "manual" },
      { id: "t4", name: "Power BI", purpose: "Business intelligence and reporting", type: "system" },
      { id: "t5", name: "Workday", purpose: "HR management and recruiting", type: "system" },
      { id: "t6", name: "ADP Payroll", purpose: "Payroll processing", type: "system" },
      { id: "t7", name: "Oracle WMS", purpose: "Warehouse management", type: "system" },
    ],
  },
];

// ---------- Uploaded Processes ----------

export const mockProcesses: UploadedProcess[] = [
  {
    id: "p1",
    fileName: "invoice_processing_log.csv",
    uploadDate: "2026-01-15",
    companyId: "c1",
    departmentId: "d1",
    entityId: "e1",
    activityId: "a1",
    notes: "Contains 3 months of invoice processing event logs from the AP team.",
    status: "approved",
  },
  {
    id: "p2",
    fileName: "candidate_screening_events.csv",
    uploadDate: "2026-02-01",
    companyId: "c1",
    departmentId: "d2",
    entityId: "e3",
    activityId: "a4",
    notes: "Screening workflow data for Q4 2025 hiring cycle.",
    status: "analyzed",
  },
];

// ---------- Process Analyses ----------

export const mockAnalyses: Record<string, ProcessAnalysis> = {
  p1: {
    processId: "p1",
    steps: [
      { id: "s1", name: "Receive Invoice", description: "Invoice received via email or postal mail", role: "AP Clerk", toolUsed: "Outlook", decisionType: "no_decision", dataInputs: ["Invoice email"], dataOutputs: ["Invoice document"], frequency: "Per invoice", volumeEstimate: "~200/month", painPoints: "Invoices arrive in multiple formats (PDF, paper, image), causing delays" },
      { id: "s2", name: "Log Invoice", description: "Enter invoice details into SAP ERP", role: "AP Clerk", toolUsed: "SAP ERP", decisionType: "no_decision", dataInputs: ["Invoice document"], dataOutputs: ["SAP invoice record"], frequency: "Per invoice", volumeEstimate: "~200/month", painPoints: "Manual data entry takes 10-15 min per invoice, frequent typos", businessRules: "All mandatory fields must be filled before saving" },
      { id: "s3", name: "Validate Invoice", description: "Cross-check invoice against purchase order and delivery receipt", role: "AP Analyst", toolUsed: "SAP ERP", decisionType: "rule_based", dataInputs: ["Invoice record", "Purchase order", "Goods receipt"], dataOutputs: ["Validation result"], frequency: "Per invoice", painPoints: "Three-way match is tedious, mismatches require manual investigation", businessRules: "Invoice amount must match PO within 2% tolerance" },
      { id: "s4", name: "Route for Approval", description: "Send invoice to department manager for approval via DocuSign", role: "AP Analyst", toolUsed: "DocuSign", decisionType: "rule_based", dataInputs: ["Validated invoice"], dataOutputs: ["Approval request"], businessRules: "If amount > $5,000, route to VP; otherwise route to dept manager" },
      { id: "s5", name: "Manager Approval", description: "Manager reviews and approves or rejects the invoice", role: "Department Manager", toolUsed: "DocuSign", decisionType: "manual_judgment", dataInputs: ["Invoice details", "Budget status"], dataOutputs: ["Approval decision"], painPoints: "Managers often delay approvals by 2-3 days" },
      { id: "s6", name: "Schedule Payment", description: "Approved invoices are scheduled for the next payment run", role: "AP Manager", toolUsed: "SAP ERP", decisionType: "rule_based", dataInputs: ["Approved invoice", "Payment terms"], dataOutputs: ["Payment schedule entry"], businessRules: "Group by vendor, prioritize early payment discounts" },
      { id: "s7", name: "Execute Payment", description: "Payment executed via bank transfer", role: "Treasury", toolUsed: "SAP ERP", decisionType: "no_decision", dataInputs: ["Payment batch"], dataOutputs: ["Payment confirmation", "Bank statement entry"] },
    ],
    roles: ["AP Clerk", "AP Analyst", "Department Manager", "AP Manager", "Treasury"],
    toolsUsed: ["Outlook", "SAP ERP", "DocuSign"],
    context: {
      processObjective: "Process vendor invoices accurately and on time to maintain vendor relationships and capture early payment discounts.",
      knownConstraints: "SOX compliance requires full audit trail. Payment SLA is net-30 from receipt.",
      assumptions: "All invoices have a valid PO number. Vendors are already registered in SAP.",
      painPointsSummary: "High manual effort in data entry and validation. Approval bottlenecks cause late payments. Multiple formats increase error rate.",
      volumeAndFrequency: "~200 invoices/month, processed daily. Peak at month-end.",
      stakeholderNotes: "AP team is open to automation. Finance director sponsors the initiative.",
    },
  },
  p2: {
    processId: "p2",
    steps: [
      { id: "s8", name: "Post Job Opening", description: "Create and publish job listing on Workday", role: "Recruiter", toolUsed: "Workday", decisionType: "no_decision", dataInputs: ["Job description", "Requirements"], dataOutputs: ["Published listing"] },
      { id: "s9", name: "Collect Applications", description: "Applications gathered via career portal", role: "Recruiter", toolUsed: "Workday", decisionType: "no_decision", dataInputs: ["Career portal submissions"], dataOutputs: ["Application list"] },
      { id: "s10", name: "Screen Resumes", description: "Manual review of resumes against job requirements", role: "Recruiter", toolUsed: "Excel", decisionType: "manual_judgment", dataInputs: ["Resumes", "Job requirements"], dataOutputs: ["Shortlist"], painPoints: "Takes 3-5 min per resume, highly subjective", businessRules: "Minimum 3 years experience for senior roles" },
      { id: "s11", name: "Phone Screen", description: "Conduct initial phone interviews with shortlisted candidates", role: "Recruiter", toolUsed: "Teams", decisionType: "manual_judgment", dataInputs: ["Candidate profile"], dataOutputs: ["Interview notes", "Go/No-go decision"] },
      { id: "s12", name: "Schedule Interviews", description: "Coordinate interview slots with hiring managers", role: "Recruiter", toolUsed: "Outlook", decisionType: "no_decision", dataInputs: ["Candidate availability", "Manager calendar"], dataOutputs: ["Interview schedule"], painPoints: "Back-and-forth emails to find available slots, takes 1-2 days" },
    ],
    roles: ["Recruiter", "Hiring Manager"],
    toolsUsed: ["Workday", "Excel", "Teams", "Outlook"],
    context: {
      processObjective: "Identify and screen qualified candidates efficiently to reduce time-to-hire.",
      painPointsSummary: "Resume screening is time-consuming and inconsistent. Scheduling coordination causes delays.",
      volumeAndFrequency: "~50 applications per open role, 5-8 open roles at any time.",
    },
  },
};

// ---------- Automation Use Cases ----------

export const mockUseCases: AutomationUseCase[] = [
  {
    id: "uc1",
    processId: "p1",
    name: "Automated Invoice Data Extraction",
    description: "Use OCR and AI to automatically extract key fields from invoices (vendor, amount, date, PO number) and populate SAP.",
    potential: "high",
    howToAutomate: "Deploy an AI-powered OCR solution (e.g., ABBYY or Azure Form Recognizer) integrated with SAP via API to auto-extract and populate invoice data.",
    trigger: "New invoice received in AP mailbox",
    inputs: ["Invoice document (PDF/image)", "Vendor master data"],
    outputs: ["Structured invoice record in SAP", "Validation flag"],
    automatedProcessDescription: "When a new invoice arrives, the OCR engine extracts key fields, validates them against the vendor master and PO records, and creates a draft invoice entry in SAP for human review.",
  },
  {
    id: "uc2",
    processId: "p1",
    name: "Three-Way Match Automation",
    description: "Automatically match invoices against purchase orders and goods receipts to flag discrepancies.",
    potential: "high",
    howToAutomate: "Configure SAP's built-in three-way matching rules with enhanced tolerance thresholds and automated exception routing.",
    trigger: "Invoice logged in SAP",
    inputs: ["Invoice data", "Purchase order", "Goods receipt"],
    outputs: ["Match result (pass/fail)", "Exception report"],
    automatedProcessDescription: "Upon invoice entry, the system automatically compares the invoice amount, quantity, and vendor against the corresponding PO and goods receipt. Matches are auto-approved; discrepancies are flagged for manual review.",
  },
  {
    id: "uc3",
    processId: "p1",
    name: "Approval Workflow Automation",
    description: "Replace manual approval routing with a rules-based automated workflow that escalates based on invoice amount.",
    potential: "medium",
    howToAutomate: "Implement a workflow engine (e.g., Power Automate) with approval rules based on invoice amount thresholds and department budgets.",
    trigger: "Invoice passes three-way match",
    inputs: ["Validated invoice", "Approval matrix", "Budget data"],
    outputs: ["Approval decision", "Audit trail"],
    automatedProcessDescription: "Invoices under $5,000 are auto-approved. Invoices between $5,000–$25,000 route to the department manager. Above $25,000, they require VP approval. All decisions are logged.",
  },
  {
    id: "uc4",
    processId: "p1",
    name: "Payment Scheduling Bot",
    description: "Automate the scheduling of approved payments to optimize cash flow and capture early payment discounts.",
    potential: "low",
    howToAutomate: "Build an RPA bot that reviews approved invoices daily, groups them by payment terms, and schedules optimal payment batches.",
    trigger: "Daily scheduled run at 6:00 AM",
    inputs: ["Approved invoices", "Payment terms", "Cash position"],
    outputs: ["Payment batch file", "Cash flow forecast update"],
    automatedProcessDescription: "A bot runs daily, identifies all approved invoices, groups them by vendor and payment terms, prioritizes those with early payment discounts, and creates a payment batch in SAP for treasury review.",
  },
];

// ---------- Activity Feed ----------

export interface ActivityItem {
  id: string;
  type: "upload" | "approval" | "discovery" | "company";
  message: string;
  timestamp: string;
}

export const mockActivityFeed: ActivityItem[] = [
  { id: "af1", type: "discovery", message: "4 automation use cases discovered for Invoice Processing", timestamp: "2026-02-13T14:30:00" },
  { id: "af2", type: "approval", message: "Invoice Processing as-is process approved", timestamp: "2026-02-12T10:15:00" },
  { id: "af3", type: "upload", message: "candidate_screening_events.csv uploaded", timestamp: "2026-02-01T09:00:00" },
  { id: "af4", type: "upload", message: "invoice_processing_log.csv uploaded", timestamp: "2026-01-15T11:20:00" },
  { id: "af5", type: "company", message: "Acme Corp added to Knowledge Base", timestamp: "2026-01-10T08:00:00" },
];
