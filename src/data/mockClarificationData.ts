export type ClarificationCategory =
  | "missing_context"
  | "ambiguity"
  | "volume_detail"
  | "exception_handling"
  | "business_rule"
  | "stakeholder";

export interface ClarificationQuestion {
  id: string;
  category: ClarificationCategory;
  question: string;
  why: string;
  answer?: string;
}

export const categoryLabels: Record<ClarificationCategory, { fr: string; en: string }> = {
  missing_context: { fr: "Contexte manquant", en: "Missing Context" },
  ambiguity: { fr: "Ambiguïté", en: "Ambiguity" },
  volume_detail: { fr: "Détail volume", en: "Volume Detail" },
  exception_handling: { fr: "Gestion des exceptions", en: "Exception Handling" },
  business_rule: { fr: "Règle métier", en: "Business Rule" },
  stakeholder: { fr: "Partie prenante", en: "Stakeholder" },
};

export const categoryColors: Record<ClarificationCategory, string> = {
  missing_context: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  ambiguity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  volume_detail: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  exception_handling: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  business_rule: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  stakeholder: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const mockClarificationQuestions: ClarificationQuestion[] = [
  {
    id: "q1",
    category: "volume_detail",
    question:
      "Combien de fois ce processus est-il exécuté par jour/semaine/mois ? Quel est le volume moyen de dossiers traités par exécution ?",
    why: "Sans données volumétriques précises, il est impossible d'estimer le ROI d'une automatisation ni de dimensionner correctement la solution.",
  },
  {
    id: "q2",
    category: "exception_handling",
    question:
      "Que se passe-t-il lorsqu'une exception survient en cours de traitement ? Existe-t-il un chemin de repli documenté ou est-ce géré au cas par cas ?",
    why: "Les exceptions non documentées représentent souvent 20-30% du temps de traitement et sont critiques pour définir le périmètre d'automatisation.",
  },
  {
    id: "q3",
    category: "missing_context",
    question:
      "Quels sont les systèmes ou applications impliqués dans ce processus qui ne sont pas mentionnés dans les étapes ? Y a-t-il des échanges de fichiers ou des accès à des bases de données externes ?",
    why: "Les intégrations système cachées impactent directement la complexité et la faisabilité technique de l'automatisation.",
  },
  {
    id: "q4",
    category: "business_rule",
    question:
      "Existe-t-il des seuils de validation ou des règles de routage conditionnelles (ex: montant > X€, type de client, zone géographique) qui influencent le traitement ?",
    why: "Les règles métier conditionnelles déterminent si l'automatisation peut être complète (straight-through) ou nécessite des points de contrôle humains.",
  },
  {
    id: "q5",
    category: "ambiguity",
    question:
      "L'étape de 'vérification' mentionnée dans le processus — s'agit-il d'une vérification visuelle, d'un rapprochement de données, ou d'une validation basée sur des critères précis ?",
    why: "Le type de vérification détermine si elle peut être automatisée par des règles, du machine learning, ou si elle doit rester manuelle.",
  },
  {
    id: "q6",
    category: "stakeholder",
    question:
      "Qui sont les parties prenantes clés de ce processus ? Y a-t-il un sponsor métier identifié pour un projet d'automatisation ?",
    why: "L'adhésion des parties prenantes est un facteur critique de succès. Un processus sans sponsor métier a peu de chances d'être priorisé.",
  },
  {
    id: "q7",
    category: "missing_context",
    question:
      "Quel est le taux d'erreur actuel de ce processus ? Quels types d'erreurs sont les plus fréquents et quel est leur impact (reprise, pénalités, insatisfaction client) ?",
    why: "Le taux d'erreur est un levier majeur pour justifier l'automatisation et quantifier les gains attendus.",
  },
  {
    id: "q8",
    category: "volume_detail",
    question:
      "Y a-t-il des pics saisonniers ou des variations significatives de charge ? Comment sont-ils gérés aujourd'hui (heures supplémentaires, intérimaires, retards) ?",
    why: "Les variations de charge impactent le dimensionnement de la solution et peuvent justifier à elles seules un investissement en automatisation.",
  },
];
