
# Correção do Login - Email Não Encontrado

## Problema Identificado

O usuário `aliados.sj@gmail.com` **existe no banco de dados**, mas quando tenta fazer login, o sistema mostra "Email não encontrado".

### Causa Raiz

A função `check_profile_exists` não consegue ler da tabela `profiles` quando chamada por usuários não autenticados, mesmo sendo `SECURITY DEFINER`.

**Por quê?**

As políticas RLS da tabela `profiles` usam `auth.uid()` para verificar acesso:

| Política | Condição |
|----------|----------|
| Users can view their own profile | `auth.uid() = id` |
| Admins can view all profiles | `has_role(auth.uid(), 'admin')` |

Quando um usuário **não está logado**:
- `auth.uid()` retorna `NULL`
- Nenhuma política RLS permite acesso
- A função não encontra registros
- Retorna `exists_in_db: false` mesmo o email existindo

---

## Solução

Adicionar uma política RLS que permite a função `check_profile_exists` fazer SELECT apenas nas colunas necessárias (`email` e `password_changed`), bypassando a restrição de autenticação para essa verificação específica.

### Opção Implementada: Política RLS para verificação de email

Criar uma nova política que permite leitura pública apenas para verificação de existência:

```sql
-- Permitir que a função check_profile_exists leia profiles
-- Isso é seguro porque a função só retorna true/false, não expõe dados
CREATE POLICY "Allow check_profile_exists function"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
```

**IMPORTANTE**: Isso pode ser muito permissivo. Uma alternativa mais segura é usar uma View com SECURITY DEFINER:

### Alternativa Mais Segura: Atualizar a função com SET search_path

A forma mais segura é garantir que a função realmente bypass RLS adicionando a opção correta:

```sql
DROP FUNCTION IF EXISTS check_profile_exists(TEXT);

CREATE OR REPLACE FUNCTION check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validação básica
  IF check_email IS NULL OR LENGTH(TRIM(check_email)) < 3 THEN
    RETURN QUERY SELECT FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Normalizar email (trim + lowercase)
  check_email := LOWER(TRIM(check_email));
  
  -- Buscar perfil (RLS bypassado via SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    TRUE,
    COALESCE(p.password_changed, FALSE)
  FROM profiles p
  WHERE LOWER(p.email) = check_email
  LIMIT 1;
  
  -- Se não encontrou
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE;
  END IF;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION check_profile_exists(TEXT) TO anon, authenticated;
```

E adicionar uma política específica para o postgres user:

```sql
-- Política para permitir que SECURITY DEFINER functions leiam profiles
CREATE POLICY "Service role can read all profiles"
ON public.profiles
FOR SELECT
TO postgres
USING (true);
```

---

## Mudanças

### 1. Migração SQL (Database)

Atualizar a função RPC e adicionar política RLS apropriada.

### 2. Frontend (Opcional - ForgotPassword)

Atualizar `src/pages/ForgotPassword.tsx` para ler o parâmetro `?email=` da URL e pré-preencher o campo.

---

## Resumo Técnico

| Item | Antes | Depois |
|------|-------|--------|
| Função RPC | Não faz TRIM interno | Faz TRIM e LOWER internamente |
| RLS postgres | Sem política | Política permitindo leitura |
| ForgotPassword | Não lê URL params | Lê e preenche email da URL |

---

## Resultado Esperado

1. Usuário digita `aliados.sj@gmail.com` (com ou sem espaços)
2. RPC retorna `exists_in_db: true, password_changed: false`
3. Sistema tenta auto-login com email como senha
4. Se falhar, redireciona para `/forgot-password?email=xxx`
5. Página abre com email pré-preenchido
6. Usuário clica em enviar e recebe link de recuperação
