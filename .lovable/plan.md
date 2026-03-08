

## Plan: Rename KB hierarchy, add delete, add document upload

### 1. Rename hierarchy labels (i18n only, no DB changes)

Update `src/lib/i18n.tsx` — the KB section labels:
- "Companies" stays as top level (unchanged)
- Current "Departments" → **"Départements"** (stays same in FR, already correct)
- Current "Entities" → **"Entités"** (stays same)  
- Current "Activities" → **"Activités"** (stays same)

Wait — re-reading the user request: "Department -> Entity -> Activity -> Service". This means the hierarchy levels should be renamed:
- Level 1 (was "Department") → **"Département"** (no change)
- Level 2 (was "Entity") → **"Entité"** (no change)  
- Level 3 (was "Activity") → **"Activité"** (no change)
- Level 4 → **"Service"** (NEW level, or rename Activity to Service?)

Actually, the user says "rename it": the current hierarchy under a company is Department > Entity > Activity. The user wants it labeled as **Department > Entity > Activity > Service**. This adds a new level "Service" under Activity, OR renames the existing levels.

Given the DB structure (departments → entities → activities), the simplest interpretation is renaming the labels:
- What was "Department" → **"Département"** (same)
- What was "Entity" → **"Entité"** (same)  
- What was "Activity" → **"Activité"** (same)

But that's 3 levels, and the user listed 4. I think the user wants to rename the 3 existing sub-levels under Company:
- "Departments" → **"Department"** 
- "Entities" → **"Entity"**
- "Activities" → **"Activity"**

And add a 4th level: **"Service"** under Activity.

OR the user wants to rename the 3 levels as: Department, Entity, Activity, Service — meaning rename what was "Activity" to "Service" and add "Activity" as a middle level. That would require a new DB table.

**Simplest interpretation**: Rename the 3 existing levels to match the user's naming, and the last one "Service" replaces "Activity" label. So:
- Level 1: Department (same)
- Level 2: Entity (same)  
- Level 3: Activity (same — currently "Entity" in DB)
- Level 4: Service (currently "Activity" in DB, renamed to "Service")

Actually, I think the user just wants the labels to be exactly: **Department → Entity → Activity → Service**. Since there are currently only 3 levels under Company (Department, Entity, Activity), this means adding a **4th level: Service** under Activity. This requires a new DB table `services`.

Let me go with the most practical interpretation: **add a new "Service" level under Activity**, requiring a new `services` table.

### Changes

**A. Database migration — create `services` table**
```sql
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  business_objective text,
  documentation text[]
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
-- RLS policies (public access like other KB tables)
CREATE POLICY "Allow public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete services" ON public.services FOR DELETE USING (true);
CREATE POLICY "Allow public update services" ON public.services FOR UPDATE USING (true);
```

Also create a `kb_documents` table for uploaded documents at any level:
```sql
CREATE TABLE public.kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  entity_type text NOT NULL, -- 'company','department','entity','activity','service'
  entity_id uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read kb_documents" ON public.kb_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert kb_documents" ON public.kb_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete kb_documents" ON public.kb_documents FOR DELETE USING (true);
```

**B. Update `src/lib/i18n.tsx`**
- Add new KB translations for Service level: `services`, `addService`, `serviceName`, `serviceAdded`, `addNewService`, `serviceDetails`
- Add delete-related translations: `confirmDelete`, `deleted`
- Add document upload translations: `uploadDocument`, `documentUploaded`

**C. Update `src/pages/KnowledgeBase.tsx`**
1. **Add Service level**: New view "services", queries, mutations, navigation, cards — following the same pattern as activities
2. **Add delete buttons** on each card (company, department, entity, activity, service) with confirmation dialog. Each delete calls `supabase.from("tableName").delete().eq("id", id)` and invalidates queries.
3. **Add document upload**: A file input + upload button on each level's view. Files uploaded to the `process-files` bucket under a path like `kb/{entity_type}/{entity_id}/{filename}`. Record saved in `kb_documents` table. Display uploaded documents as badges with delete option.

**D. Update Activity view**: Currently clicking an Activity opens a detail Sheet. Now clicking an Activity navigates to the Services list (new level). The detail sheet moves to Service level.

### File changes summary
- **Migration**: 1 new migration (services table + kb_documents table)
- `src/lib/i18n.tsx`: Add service + delete + upload translations
- `src/pages/KnowledgeBase.tsx`: Add services level, delete buttons on all levels, document upload UI

