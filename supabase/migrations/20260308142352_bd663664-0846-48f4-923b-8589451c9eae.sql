
CREATE TABLE public.step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  action_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  system_used TEXT,
  screenshot_page INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.step_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read step_actions" ON public.step_actions FOR SELECT USING (true);
CREATE POLICY "Allow public insert step_actions" ON public.step_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete step_actions" ON public.step_actions FOR DELETE USING (true);
CREATE POLICY "Allow public update step_actions" ON public.step_actions FOR UPDATE USING (true);
