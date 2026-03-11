
CREATE TABLE public.validated_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.automation_use_cases(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.automation_variants(id) ON DELETE CASCADE,
  validated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (use_case_id, variant_id)
);

ALTER TABLE public.validated_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read validated_selections" ON public.validated_selections FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert validated_selections" ON public.validated_selections FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public delete validated_selections" ON public.validated_selections FOR DELETE TO public USING (true);
