
-- Table: process_variants
CREATE TABLE public.process_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  variant_label text,
  consultant_name text,
  frequency integer DEFAULT 0,
  avg_duration_minutes double precision,
  steps_json jsonb DEFAULT '[]'::jsonb,
  insights jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read process_variants" ON public.process_variants FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_variants" ON public.process_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update process_variants" ON public.process_variants FOR UPDATE USING (true);
CREATE POLICY "Allow public delete process_variants" ON public.process_variants FOR DELETE USING (true);

-- Table: variant_steps
CREATE TABLE public.variant_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.process_variants(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  is_skipped boolean NOT NULL DEFAULT false,
  is_extra boolean NOT NULL DEFAULT false,
  is_reordered boolean NOT NULL DEFAULT false,
  avg_duration_seconds double precision,
  frequency_pct double precision
);

ALTER TABLE public.variant_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read variant_steps" ON public.variant_steps FOR SELECT USING (true);
CREATE POLICY "Allow public insert variant_steps" ON public.variant_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update variant_steps" ON public.variant_steps FOR UPDATE USING (true);
CREATE POLICY "Allow public delete variant_steps" ON public.variant_steps FOR DELETE USING (true);
