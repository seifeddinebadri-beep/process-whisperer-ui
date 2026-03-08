CREATE POLICY "Allow public delete ba_messages" ON public.ba_messages FOR DELETE USING (true);
CREATE POLICY "Allow public delete pdd_documents" ON public.pdd_documents FOR DELETE USING (true);