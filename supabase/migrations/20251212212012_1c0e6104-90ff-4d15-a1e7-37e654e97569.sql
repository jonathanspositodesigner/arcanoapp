-- Permitir que usuários insiram seu próprio profile (não admin, apenas seu próprio registro)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);