
-- Table for BA agent conversations
CREATE TABLE public.ba_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.automation_use_cases(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.uploaded_processes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Messages within a BA conversation
CREATE TABLE public.ba_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ba_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Generated PDD documents
CREATE TABLE public.pdd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ba_conversations(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL REFERENCES public.automation_use_cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  html_content text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ba_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ba_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ba_conversations" ON public.ba_conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert ba_conversations" ON public.ba_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update ba_conversations" ON public.ba_conversations FOR UPDATE USING (true);

CREATE POLICY "Allow public read ba_messages" ON public.ba_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert ba_messages" ON public.ba_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read pdd_documents" ON public.pdd_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert pdd_documents" ON public.pdd_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update pdd_documents" ON public.pdd_documents FOR UPDATE USING (true);
