

## Problema identificado

O email `aliados.sj@gmail.com`:
- **Existe no Auth** (sistema de login do Supabase) → por isso não deixa cadastrar de novo
- **NÃO existe na tabela `profiles`** → por isso não aparece na busca de clientes

Isso acontece quando a criação do profile falha mas o usuário já foi criado no Auth.

---

## Solução

### 1) Correção imediata: Cadastrar esse cliente específico

Vou ajustar a edge function `create-pack-client` para **forçar a criação/atualização do profile** mesmo quando o usuário já existe no Auth. Isso já deveria acontecer (tem `upsert`), mas preciso verificar se há algum problema.

Depois, você tenta cadastrar o cliente de novo com os packs que ele deveria ter.

### 2) Correção na edge function

Garantir que:
- Quando encontra usuário existente no Auth, sempre faz o upsert do profile
- Se der erro no upsert, loga claramente qual foi o problema
- Adiciona mais logs para diagnóstico

### 3) Correção na busca de clientes (prevenção futura)

Adicionar lógica para detectar "usuários órfãos" (existem no Auth mas não no profiles) e permitir que o admin veja/corrija esses casos.

---

## Arquivos que serão alterados

- `supabase/functions/create-pack-client/index.ts` - Melhorar logs e garantir upsert funciona
- `src/pages/AdminPackPurchases.tsx` - Adicionar tratamento para esse cenário

---

## Ação imediata

Depois das correções, você vai poder cadastrar o `aliados.sj@gmail.com` normalmente - o sistema vai encontrar ele no Auth, criar o profile que estava faltando, e adicionar os packs.

