
CREATE POLICY "Allow public delete agent_logs" ON public.agent_logs FOR DELETE USING (true);
