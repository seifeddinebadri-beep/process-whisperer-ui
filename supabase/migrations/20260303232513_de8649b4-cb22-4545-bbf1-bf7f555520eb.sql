
CREATE TABLE public.automation_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  use_case_id UUID NOT NULL REFERENCES public.automation_use_cases(id) ON DELETE CASCADE,
  variant_number INTEGER NOT NULL DEFAULT 1,
  variant_name TEXT NOT NULL,
  approach_description TEXT,
  complexity TEXT,
  impact TEXT,
  roi_estimate TEXT,
  tools_suggested TEXT[] DEFAULT '{}',
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  estimated_cost TEXT,
  estimated_timeline TEXT,
  recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read automation_variants"
ON public.automation_variants FOR SELECT
USING (true);

CREATE POLICY "Allow public insert automation_variants"
ON public.automation_variants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete automation_variants"
ON public.automation_variants FOR DELETE
USING (true);

CREATE INDEX idx_automation_variants_use_case ON public.automation_variants(use_case_id);
