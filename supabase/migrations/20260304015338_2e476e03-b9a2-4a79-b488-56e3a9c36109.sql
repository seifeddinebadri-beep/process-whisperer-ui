
CREATE TABLE public.use_case_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.automation_use_cases(id) ON DELETE CASCADE,
  detail_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(use_case_id)
);

ALTER TABLE public.use_case_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read use_case_details" ON public.use_case_details FOR SELECT USING (true);
CREATE POLICY "Allow public insert use_case_details" ON public.use_case_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update use_case_details" ON public.use_case_details FOR UPDATE USING (true);
CREATE POLICY "Allow public delete use_case_details" ON public.use_case_details FOR DELETE USING (true);
