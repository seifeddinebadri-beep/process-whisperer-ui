

## Plan: Refonte UX de la vue de fusion des étapes

### Problème actuel
La vue de comparaison est trop basique : deux colonnes côte-à-côte avec de simples boutons Accept/Skip. Pas de contexte sur les différences, pas de gestion des exceptions (étapes similaires entre sources, étapes conflictuelles, étapes uniques à une source), et pas de prévisualisation du résultat fusionné.

### Nouvelle architecture UX

```text
StepComparisonView (refonte complète)
├── Header avec stats et légende des couleurs
├── Section 1 : Étapes similaires (auto-détectées par nom/description)
│   └── Ligne par paire : EL à gauche, KB à droite, bouton "Garder EL / Garder KB / Fusionner"
├── Section 2 : Étapes uniques Event Log (pas d'équivalent KB)
│   └── Chaque étape avec Accept/Skip
├── Section 3 : Étapes uniques KB (pas d'équivalent EL)
│   └── Chaque étape avec Accept/Skip
├── Section 4 : Prévisualisation du résultat fusionné (live)
│   └── Liste ordonnée des étapes acceptées avec badges source
└── Footer : barre de progression + bouton "Valider la fusion"
```

### Implémentation

1. **Algorithme de matching des étapes similaires**
   - Comparaison par mots-clés dans `name` et `description` (simple similarity basée sur mots communs)
   - Classement en 3 catégories : `paired` (similaires), `uniqueEL` (event log only), `uniqueKB` (KB only)
   - Mock data : enrichir les données pour illustrer les 3 cas

2. **Refonte `StepComparisonView.tsx`**
   - **Paired steps** : affichage côte-à-côte avec highlight des différences (champs qui diffèrent en orange). Actions : "Garder gauche", "Garder droite", ou "Combiner" (prend le meilleur des deux : description la plus longue, union des pain points, etc.)
   - **Unique steps** : affichage en pleine largeur avec Accept/Skip
   - **Live preview** : section en bas qui montre le résultat en temps réel avec numérotation et badges source
   - **Progress bar** : pourcentage de décisions prises
   - **Gestion des exceptions** : 
     - Étapes avec `businessRules` conflictuelles → warning icon + tooltip
     - Étapes avec `decisionType` différent → highlight orange
     - Étapes sans description → badge "Incomplet"

3. **Enrichir les mock data** (`mockComparisonSteps.ts`)
   - Ajouter des étapes qui matchent entre EL et KB (réception facture ↔ collecte factures)
   - Ajouter une étape KB sans équivalent EL (vérification conformité)
   - Ajouter une étape EL sans équivalent KB (paiement)

4. **Nouvelles traductions i18n**
   - Sections : "Étapes similaires", "Uniques Event Log", "Uniques KB", "Aperçu du résultat"
   - Actions : "Garder", "Combiner", "Incomplet", "Conflit détecté"

### Fichiers à modifier
- `src/components/process-analysis/StepComparisonView.tsx` — refonte complète
- `src/data/mockComparisonSteps.ts` — enrichir pour couvrir les 3 cas
- `src/lib/i18n.tsx` — nouvelles traductions

