
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read agent_logs" ON public.agent_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert agent_logs" ON public.agent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update agent_logs" ON public.agent_logs FOR UPDATE USING (true);
