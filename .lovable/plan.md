

# Base de données Knowledge Base + Upload de fichiers + Système RAG

## Vue d'ensemble

Migrer la Knowledge Base et le système d'upload de fichiers de données mock vers une base de données Supabase (via Lovable Cloud), ajouter le stockage de fichiers, et implémenter un système RAG (Retrieval-Augmented Generation) utilisant Lovable AI pour enrichir l'analyse des processus.

## Etape 1 : Activer Lovable Cloud

Activer Lovable Cloud sur le projet pour obtenir la base de données, le stockage et les edge functions.

## Etape 2 : Schema de la base de donnees

Creer les tables suivantes, refletant la hierarchie existante :

```text
companies
  - id (uuid, PK)
  - name (text)
  - industry (text)
  - size (text)
  - strategy_notes (text)
  - created_at (timestamptz)

tools
  - id (uuid, PK)
  - company_id (uuid, FK -> companies)
  - name (text)
  - purpose (text)
  - type (text: manual | semi-automated | system)
  - documentation (text)

departments
  - id (uuid, PK)
  - company_id (uuid, FK -> companies)
  - name (text)

entities
  - id (uuid, PK)
  - department_id (uuid, FK -> departments)
  - name (text)

activities
  - id (uuid, PK)
  - entity_id (uuid, FK -> entities)
  - name (text)
  - description (text)
  - business_objective (text)
  - documentation (text[])

activity_tools (jonction)
  - activity_id (uuid, FK -> activities)
  - tool_id (uuid, FK -> tools)

uploaded_processes
  - id (uuid, PK)
  - file_name (text)
  - file_path (text)  -- chemin dans le bucket storage
  - upload_date (timestamptz)
  - company_id (uuid, FK)
  - department_id (uuid, FK)
  - entity_id (uuid, FK)
  - activity_id (uuid, FK)
  - notes (text)
  - status (text: uploaded | analyzed | approved | discovered)

process_steps
  - id (uuid, PK)
  - process_id (uuid, FK -> uploaded_processes)
  - step_order (int)
  - name (text)
  - description (text)
  - role (text)
  - tool_used (text)
  - decision_type (text)
  - data_inputs (text[])
  - data_outputs (text[])
  - pain_points (text)
  - business_rules (text)
  - frequency (text)
  - volume_estimate (text)

process_context
  - id (uuid, PK)
  - process_id (uuid, FK -> uploaded_processes, unique)
  - process_objective (text)
  - known_constraints (text)
  - assumptions (text)
  - pain_points_summary (text)
  - volume_and_frequency (text)
  - stakeholder_notes (text)

-- RAG : chunks de documents indexes
document_chunks
  - id (uuid, PK)
  - process_id (uuid, FK -> uploaded_processes)
  - chunk_index (int)
  - content (text)
  - metadata (jsonb)
  - embedding (vector(768))  -- pour la recherche semantique
  - created_at (timestamptz)
```

## Etape 3 : Stockage de fichiers

- Creer un bucket `process-files` (prive) pour stocker les fichiers CSV/PDF uploades
- Configurer les policies RLS pour autoriser l'upload et la lecture

## Etape 4 : Edge Functions

### 4a. `parse-document`
- Recoit un fichier uploade (chemin dans le storage)
- Lit le contenu, le decoupe en chunks
- Pour les CSV : parse les lignes, groupe en segments logiques
- Stocke les chunks dans `document_chunks`

### 4b. `generate-embeddings`
- Appelee apres le parsing
- Utilise Lovable AI pour generer des embeddings pour chaque chunk
- Stocke les vecteurs dans la colonne `embedding`

### 4c. `rag-query`
- Recoit une question + process_id
- Recherche les chunks les plus pertinents via similarite cosinus (pgvector)
- Envoie le contexte + la question a Lovable AI (Gemini)
- Retourne la reponse augmentee

### 4d. `analyze-process`
- Appelee quand on approuve un processus
- Utilise le RAG pour analyser le contexte complet (steps, context, document chunks)
- Genere les cas d'usage d'automatisation via Lovable AI
- Stocke les resultats dans une table `automation_use_cases`

## Etape 5 : Mise a jour du frontend

### Knowledge Base (`KnowledgeBase.tsx`)
- Remplacer `mockCompanies` par des requetes Supabase (`useQuery`)
- Les formulaires d'ajout (company, department, entity, activity) font des `INSERT` reels
- Les listes se rechargent apres mutation (`useMutation` + `invalidateQueries`)

### Process Upload (`ProcessUpload.tsx`)
- Upload reel du fichier dans le bucket `process-files`
- INSERT dans `uploaded_processes` avec le chemin du fichier
- Appel a l'edge function `parse-document` apres upload
- L'historique vient de la base de donnees

### Process Analysis (`ProcessAnalysis.tsx`)
- Charger les steps depuis `process_steps`
- Les modifications (edit, add, delete, reorder) font des mutations reelles
- Le contexte vient de `process_context`
- Le bouton "Approuver" declenche `analyze-process`

### Automation Discovery
- Les use cases viennent d'une table `automation_use_cases` remplie par l'edge function

## Etape 6 : Activation de pgvector

- Activer l'extension `vector` dans Supabase pour le stockage et la recherche d'embeddings
- Creer une fonction SQL `match_documents` pour la recherche par similarite

## Ordre d'implementation

1. Activer Lovable Cloud
2. Creer le schema (migrations)
3. Creer le bucket storage
4. Seed les donnees mock existantes
5. Creer les edge functions (parse, embeddings, rag-query, analyze)
6. Migrer le frontend Knowledge Base vers Supabase
7. Migrer le frontend Upload vers Supabase + storage
8. Migrer le frontend Process Analysis vers Supabase
9. Connecter le RAG a la decouverte d'automatisation

## Details techniques

- **Embeddings** : Lovable AI avec `google/gemini-3-flash-preview` pour la generation de texte, embeddings via l'API gateway
- **Recherche vectorielle** : pgvector avec `cosine` distance
- **Chunking** : 500 tokens par chunk avec 50 tokens de chevauchement
- **RLS** : Policies permissives pour le moment (pas d'auth utilisateur dans le prototype), a securiser plus tard

