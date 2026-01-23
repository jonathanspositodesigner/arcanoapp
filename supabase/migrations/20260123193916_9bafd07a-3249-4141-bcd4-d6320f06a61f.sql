-- Garantir que usuários autenticados possam inserir seu próprio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Garantir que usuários autenticados possam atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = id);