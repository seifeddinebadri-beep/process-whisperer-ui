
-- Add screenshot_url to process_steps
ALTER TABLE public.process_steps ADD COLUMN screenshot_url TEXT;

-- Create process_screenshots table
CREATE TABLE public.process_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  page_number INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.process_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read process_screenshots" ON public.process_screenshots FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_screenshots" ON public.process_screenshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete process_screenshots" ON public.process_screenshots FOR DELETE USING (true);
CREATE POLICY "Allow public update process_screenshots" ON public.process_screenshots FOR UPDATE USING (true);
