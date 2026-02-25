

# Top Indicadores - Dashboard de Indicacoes

## Resumo
Criar uma nova pagina "Top Indicadores" no admin do PromptClub que lista os usuarios que mais indicaram pessoas para a plataforma, com detalhes de creditos ganhos, creditos restantes, e ao clicar em um usuario, expandir a lista de pessoas que vieram pelo link dele. Paginacao de 20 por pagina em ambas as listas.

## O que sera feito

### 1. Nova rota e pagina
- Criar `src/pages/admin/PromptsTopIndicadores.tsx`
- Registrar rota `/admin-prompts/top-indicadores` no `App.tsx`
- Importar o componente com lazy loading seguindo o padrao existente

### 2. Menu lateral - novo item
- Editar `src/components/AdminSidebarPlatform.tsx`
- Adicionar item "TOP INDICADORES" no array `promptsExtraItems` com icone `Users` (lucide), path `/admin-prompts/top-indicadores`, descricao "Ranking de indicacoes"
- Posicionar abaixo de DASHBOARD

### 3. Politicas RLS para admin
- Criar migration com SELECT policies para admin nas tabelas `referral_codes` e `referrals`:
  - `has_role(auth.uid(), 'admin')` permite SELECT em ambas

### 4. Pagina PromptsTopIndicadores

**Tabela principal (Top Indicadores):**
- Colunas: Posicao (#), Usuario (nome + email), Creditos Ganhos (total de `credits_given_referrer`), Creditos Restantes (lifetime_balance da tabela `upscaler_credits`), Recrutados (contagem)
- Ordenado por quantidade de recrutados (desc)
- Paginacao: 20 por pagina
- Busca via queries ao banco:
  1. Query na tabela `referrals` agrupando por `referrer_id` com JOIN em `profiles` para nome/email
  2. Para cada referrer, buscar `lifetime_balance` de `upscaler_credits`

**Detalhe ao clicar (lista de indicados):**
- Ao clicar em uma linha, expande/abre um modal ou secao mostrando as pessoas que vieram pelo link desse indicador
- Colunas: Nome, Email, Data da indicacao
- Busca na tabela `referrals` WHERE `referrer_id` = usuario selecionado, com JOIN em `profiles` usando `referred_id`
- Paginacao: 20 por pagina

**Layout:**
- Usa `AdminLayoutPlatform` com `platform="prompts"` (padrao existente)
- Cards de resumo no topo: Total de indicadores ativos, Total de indicacoes, Total de creditos distribuidos

### Detalhes tecnicos

**Arquivos criados:**
1. `src/pages/admin/PromptsTopIndicadores.tsx` - pagina completa

**Arquivos modificados:**
1. `src/components/AdminSidebarPlatform.tsx` - novo item no menu
2. `src/App.tsx` - nova rota

**Migration SQL:**
```sql
CREATE POLICY "Admins can read all referral_codes"
  ON public.referral_codes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all referrals"
  ON public.referrals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

**Queries principais:**
- Buscar top indicadores com contagem e soma de creditos (via `referrals` + `profiles`)
- Buscar creditos restantes (via `upscaler_credits`)
- Buscar lista de indicados de um usuario especifico (via `referrals` + `profiles`)

Toda a logica fica no frontend usando o Supabase client, sem necessidade de edge function.
