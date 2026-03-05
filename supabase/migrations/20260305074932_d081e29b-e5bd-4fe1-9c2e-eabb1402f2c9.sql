
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  business_objective text,
  documentation text[]
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete services" ON public.services FOR DELETE USING (true);
CREATE POLICY "Allow public update services" ON public.services FOR UPDATE USING (true);

CREATE TABLE public.kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read kb_documents" ON public.kb_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert kb_documents" ON public.kb_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete kb_documents" ON public.kb_documents FOR DELETE USING (true);
