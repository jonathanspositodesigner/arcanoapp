
DROP POLICY "Authenticated users can view artes" ON public.admin_artes;
CREATE POLICY "Anyone can view artes" ON public.admin_artes FOR SELECT TO authenticated, anon USING (true);
