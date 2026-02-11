
## Atualizar textos de 240 para 300 creditos + aviso de validade mensal

### Situacao atual
- O `ai_tool_settings` ja tem `credit_cost = 100`, entao a RPC ja calcula `3 * 100 = 300` creditos
- O backend ja esta correto - so precisa atualizar os textos no frontend e os fallbacks nas Edge Functions

### Mudancas

#### 1. `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx`
- Linha 256: "Ganhe 3 gerações gratuitas!" -> "Ganhe 300 créditos grátis!"
- Linha 314: "Cadastre-se e ganhe 3 gerações gratuitas" -> "Cadastre-se e ganhe 300 créditos grátis"
- Linha 342: "...suas 3 gerações gratuitas" -> "...seus 300 créditos grátis"
- Adicionar aviso "Créditos válidos por 1 mês" abaixo do titulo principal

#### 2. `src/pages/TesteGratis.tsx`
- Linha 112: toast "240 créditos adicionados!" -> "300 créditos adicionados!"
- Linha 222: "Ganhe 240 créditos" -> "Ganhe 300 créditos"
- Linha 259: "resgatar seus 240 créditos" -> "resgatar seus 300 créditos"
- Linha 317: "ganhar 240 créditos" -> "ganhar 300 créditos"
- Linha 415: "240 créditos adicionados!" -> "300 créditos adicionados!"
- Linha 433: "resgatar seus 240 créditos" -> "resgatar seus 300 créditos"
- Adicionar aviso "Créditos válidos por 1 mês" nos estados relevantes (email, login, signup)

#### 3. `supabase/functions/claim-arcano-free-trial/index.ts`
- Linha 89: fallback `|| 240` -> `|| 300`

#### 4. `supabase/functions/claim-free-trial/index.ts`
- Linha 112: fallback `|| 240` -> `|| 300`

#### 5. RPC `claim_arcano_free_trial_atomic` (migracao SQL)
- Atualizar a descricao da transacao de "3 gerações gratuitas" para "300 créditos grátis"

### Resumo
| Arquivo | Tipo |
|---------|------|
| `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx` | Textos + aviso validade |
| `src/pages/TesteGratis.tsx` | Textos + aviso validade |
| `supabase/functions/claim-arcano-free-trial/index.ts` | Fallback 240->300 |
| `supabase/functions/claim-free-trial/index.ts` | Fallback 240->300 |
| Nova migracao SQL | Descricao na RPC |
