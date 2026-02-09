

## Correção do erro "new row violates row-level security policy"

### Problema
A tabela `character_generator_jobs` tem a coluna `user_id` como **nullable** (permite valor nulo), mas a política RLS de INSERT exige `auth.uid() = user_id`. Quando a coluna permite nulo, o Postgres pode rejeitar a inserção por incompatibilidade na verificação de segurança.

### Solução
Alterar a coluna `user_id` para **NOT NULL**, igual ao padrão correto das outras ferramentas de IA do sistema.

### Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE public.character_generator_jobs 
  ALTER COLUMN user_id SET NOT NULL;
```

Essa é uma alteração simples e segura. Todos os registros existentes já possuem `user_id` preenchido (o código sempre envia `user_id: user.id`), então não haverá conflito.

