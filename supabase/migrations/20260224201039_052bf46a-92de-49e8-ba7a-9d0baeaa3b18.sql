-- Allow DELETE on automation_use_cases (needed for re-analysis)
CREATE POLICY "Allow public delete automation_use_cases"
ON public.automation_use_cases
FOR DELETE
USING (true);

-- Allow DELETE on document_chunks (needed for re-parsing)
CREATE POLICY "Allow public delete document_chunks"
ON public.document_chunks
FOR DELETE
USING (true);

-- Allow UPDATE on document_chunks (needed for embedding updates)
CREATE POLICY "Allow public update document_chunks"
ON public.document_chunks
FOR UPDATE
USING (true);