
# Reestruturar aba Assinantes para mostrar Planos 2

## Contexto
A aba "Assinantes" do painel admin atualmente mostra dados da tabela legada `premium_users` (planos antigos: Arcano Basico, Pro, Unlimited). Os novos planos (Free, Starter, Pro, Ultimate, Unlimited) estao na tabela `planos2_subscriptions` e precisam ser exibidos como a aba principal.

## Dados atuais no banco (planos2_subscriptions)
- Free: 23 ativos
- Starter: 2 ativos
- Pro: 1 ativo
- Ultimate: 1 ativo
- Unlimited: 1 ativo

## O que sera feito

### 1. Adicionar nova aba "Assinantes Antigos"
- A tab bar passara de 3 para 4 abas: **Assinantes** | **Assinantes Antigos** | **Creditos IA** | **Uso Ferramentas**
- Todo o conteudo atual da aba "Assinantes" (tabela, cards, graficos, modais de criar/editar/deletar do `premium_users`) sera movido para "Assinantes Antigos"

### 2. Nova aba "Assinantes" com dados de planos2_subscriptions
- Fetch dos dados de `planos2_subscriptions` com join em `profiles` para nome/email
- Cards de metricas: Total, Ativos (excluindo free), Expirando em 7 dias, Inativos
- Grafico de distribuicao por plano com cores distintas para cada nivel (Free, Starter, Pro, Ultimate, Unlimited)
- Tabela com colunas: Nome/Email, Plano, Creditos/mes, Status, Expira em, Assinado em
- Labels dos planos: free="Free", starter="Starter", pro="Pro", ultimate="Ultimate", unlimited="IA Unlimited"
- Filtro de busca e periodo
- Paginacao

### 3. Detalhes tecnicos
**Arquivo modificado:** `src/pages/AdminPremiumDashboard.tsx`

- Nova interface `Planos2User` com campos da tabela: `id, user_id, plan_slug, is_active, credits_per_month, daily_prompt_limit, has_image_generation, has_video_generation, cost_multiplier, greenn_product_id, greenn_contract_id, created_at, updated_at, expires_at`
- Nova funcao `fetchPlanos2Users()` que busca de `planos2_subscriptions` + join com `profiles`
- Novo state para `planos2Users`, busca, filtro e paginacao separados da aba legada
- Labels e cores para os 5 novos planos
- A aba legada mantera toda a funcionalidade existente (criar, editar, deletar, reset senha) sem alteracoes
