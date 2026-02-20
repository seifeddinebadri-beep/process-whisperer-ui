
-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  strategy_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow public insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete companies" ON public.companies FOR DELETE USING (true);

-- Tools table
CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT,
  type TEXT CHECK (type IN ('manual', 'semi-automated', 'system')),
  documentation TEXT
);
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tools" ON public.tools FOR SELECT USING (true);
CREATE POLICY "Allow public insert tools" ON public.tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tools" ON public.tools FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tools" ON public.tools FOR DELETE USING (true);

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public insert departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update departments" ON public.departments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete departments" ON public.departments FOR DELETE USING (true);

-- Entities table
CREATE TABLE public.entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read entities" ON public.entities FOR SELECT USING (true);
CREATE POLICY "Allow public insert entities" ON public.entities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update entities" ON public.entities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete entities" ON public.entities FOR DELETE USING (true);

-- Activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  business_objective TEXT,
  documentation TEXT[]
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update activities" ON public.activities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete activities" ON public.activities FOR DELETE USING (true);

-- Activity-Tools junction table
CREATE TABLE public.activity_tools (
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, tool_id)
);
ALTER TABLE public.activity_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read activity_tools" ON public.activity_tools FOR SELECT USING (true);
CREATE POLICY "Allow public insert activity_tools" ON public.activity_tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete activity_tools" ON public.activity_tools FOR DELETE USING (true);

-- Uploaded processes table
CREATE TABLE public.uploaded_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'analyzed', 'approved', 'discovered'))
);
ALTER TABLE public.uploaded_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read uploaded_processes" ON public.uploaded_processes FOR SELECT USING (true);
CREATE POLICY "Allow public insert uploaded_processes" ON public.uploaded_processes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update uploaded_processes" ON public.uploaded_processes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete uploaded_processes" ON public.uploaded_processes FOR DELETE USING (true);

-- Process steps table
CREATE TABLE public.process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT,
  tool_used TEXT,
  decision_type TEXT,
  data_inputs TEXT[],
  data_outputs TEXT[],
  pain_points TEXT,
  business_rules TEXT,
  frequency TEXT,
  volume_estimate TEXT
);
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read process_steps" ON public.process_steps FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_steps" ON public.process_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update process_steps" ON public.process_steps FOR UPDATE USING (true);
CREATE POLICY "Allow public delete process_steps" ON public.process_steps FOR DELETE USING (true);

-- Process context table
CREATE TABLE public.process_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL UNIQUE REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  process_objective TEXT,
  known_constraints TEXT,
  assumptions TEXT,
  pain_points_summary TEXT,
  volume_and_frequency TEXT,
  stakeholder_notes TEXT
);
ALTER TABLE public.process_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read process_context" ON public.process_context FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_context" ON public.process_context FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update process_context" ON public.process_context FOR UPDATE USING (true);
CREATE POLICY "Allow public delete process_context" ON public.process_context FOR DELETE USING (true);

-- Document chunks table (RAG)
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read document_chunks" ON public.document_chunks FOR SELECT USING (true);
CREATE POLICY "Allow public insert document_chunks" ON public.document_chunks FOR INSERT WITH CHECK (true);

-- Automation use cases table (generated by AI)
CREATE TABLE public.automation_use_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  complexity TEXT,
  impact TEXT,
  tools_suggested TEXT[],
  roi_estimate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_use_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read automation_use_cases" ON public.automation_use_cases FOR SELECT USING (true);
CREATE POLICY "Allow public insert automation_use_cases" ON public.automation_use_cases FOR INSERT WITH CHECK (true);

-- Match documents function for RAG semantic search
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_process_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  process_id UUID,
  chunk_index INT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.process_id,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE (filter_process_id IS NULL OR dc.process_id = filter_process_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Storage bucket for process files
INSERT INTO storage.buckets (id, name, public) VALUES ('process-files', 'process-files', false);

-- Storage policies
CREATE POLICY "Allow public upload process-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'process-files');
CREATE POLICY "Allow public read process-files" ON storage.objects FOR SELECT USING (bucket_id = 'process-files');
CREATE POLICY "Allow public delete process-files" ON storage.objects FOR DELETE USING (bucket_id = 'process-files');
