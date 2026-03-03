// Mock data for Automation Discovery page — used as fallback when DB is empty

export interface MockUseCase {
  id: string;
  title: string;
  description: string;
  impact: string;
  complexity: string;
  roi_estimate: string;
  tools_suggested: string[];
  process_id: string;
  created_at: string;
  uploaded_processes: { file_name: string; status: string } | null;
  automation_variants: { id: string }[];
}

export const mockUseCases: MockUseCase[] = [
  {
    id: "uc1",
    title: "Extraction automatisée des données de facture",
    description: "Utilisation de l'OCR et de l'IA pour extraire automatiquement les champs clés des factures (fournisseur, montant, date, numéro de PO) et alimenter SAP.",
    impact: "high",
    complexity: "medium",
    roi_estimate: "Réduction de 80% du temps de traitement",
    tools_suggested: ["Azure Form Recognizer", "SAP API", "Power Automate"],
    process_id: "p1",
    created_at: "2026-02-13T14:30:00",
    uploaded_processes: { file_name: "invoice_processing_log.csv", status: "approved" },
    automation_variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
  },
  {
    id: "uc2",
    title: "Automatisation du rapprochement tripartite",
    description: "Comparaison automatique des factures avec les bons de commande et les bons de réception pour identifier les écarts.",
    impact: "high",
    complexity: "low",
    roi_estimate: "Réduction de 70% de l'effort de validation",
    tools_suggested: ["SAP ERP", "SAP Configuration"],
    process_id: "p1",
    created_at: "2026-02-13T14:30:00",
    uploaded_processes: { file_name: "invoice_processing_log.csv", status: "approved" },
    automation_variants: [{ id: "v4" }, { id: "v5" }],
  },
  {
    id: "uc3",
    title: "Automatisation du workflow d'approbation",
    description: "Remplacement du routage manuel des approbations par un workflow automatisé basé sur des règles de seuils de montant.",
    impact: "medium",
    complexity: "low",
    roi_estimate: "Réduction de 60% du temps de routage",
    tools_suggested: ["Power Automate", "Microsoft Teams", "SAP"],
    process_id: "p1",
    created_at: "2026-02-13T14:30:00",
    uploaded_processes: { file_name: "invoice_processing_log.csv", status: "approved" },
    automation_variants: [{ id: "v6" }, { id: "v7" }],
  },
  {
    id: "uc4",
    title: "Bot de planification des paiements",
    description: "Automatisation de la planification des paiements approuvés pour optimiser la trésorerie et capturer les remises de paiement anticipé.",
    impact: "low",
    complexity: "medium",
    roi_estimate: "Capture systématique des remises 2/10 net 30",
    tools_suggested: ["UiPath", "SAP ERP"],
    process_id: "p1",
    created_at: "2026-02-13T14:30:00",
    uploaded_processes: { file_name: "invoice_processing_log.csv", status: "approved" },
    automation_variants: [],
  },
  {
    id: "uc5",
    title: "Screening automatisé des candidats",
    description: "Analyse IA des CV par rapport aux exigences du poste pour pré-qualifier les candidats et réduire le tri manuel.",
    impact: "high",
    complexity: "medium",
    roi_estimate: "Réduction de 70% du temps de screening",
    tools_suggested: ["Azure AI", "Workday API", "Power Automate"],
    process_id: "p2",
    created_at: "2026-02-15T10:00:00",
    uploaded_processes: { file_name: "candidate_screening_events.csv", status: "analyzed" },
    automation_variants: [{ id: "v8" }, { id: "v9" }, { id: "v10" }],
  },
  {
    id: "uc6",
    title: "Planification automatique des entretiens",
    description: "Coordination automatisée des créneaux d'entretien entre candidats et managers via intégration calendrier.",
    impact: "medium",
    complexity: "low",
    roi_estimate: "Réduction de 90% du temps de coordination",
    tools_suggested: ["Microsoft Graph API", "Outlook", "Teams"],
    process_id: "p2",
    created_at: "2026-02-15T10:00:00",
    uploaded_processes: { file_name: "candidate_screening_events.csv", status: "analyzed" },
    automation_variants: [{ id: "v11" }, { id: "v12" }],
  },
];
