## 🔎 Diagnóstico

Investiguei `/admin-hub` → aba **Painel de Colaboradores** (componente `PartnerEarningsAdminContent.tsx`) e o banco. Encontrei **3 problemas** distintos que combinados causam o efeito "só aparece prompts copiados, jobs de IA somem":

### 1. UI do Overview NÃO mostra a coluna de Jobs de IA
A tabela do "Visão Geral" exibe apenas:
- Saldo Bruto / Saques Pagos / Disponível / **P. Copiados** / Prompts Aprovados

Mas a tabela `collaborator_balances` só guarda `total_unlocks` (= prompts copiados). Os **jobs em ferramentas de IA** ficam em `collaborator_tool_earnings` e nunca são contados/exibidos no overview. Por isso parece que "só conta clicks em prompts".

Exemplo real (colaborador `f008a899...`):
- Tem **6 jobs de IA** registrados (R$ 0,84 em earnings de ferramentas)
- Tem **2 unlocks de prompt** (R$ 0,17)
- Coluna "P. Copiados" mostra `2` ✅
- Mas não há coluna mostrando os `6 jobs` ❌

### 2. `collaborator_balances.total_earned` está dessincronizado
O balance mostra **R$ 0,80** mas a soma real (unlocks + tools + bônus) é **R$ ~1,01**. Faltam R$ 0,21.

Causa: **não existe trigger** em `collaborator_tool_earnings` / `collaborator_unlock_earnings` / `partner_bonus_payments` que atualize `collaborator_balances`. A atualização é feita manualmente dentro das RPCs `register_collaborator_tool_earning` e `register_collaborator_unlock` — quando alguém insere direto na tabela ou quando há erro/race, o balance fica defasado pra sempre.

Pior: a função `reconcile_collaborator_balances` **só recalcula a partir de `collaborator_unlock_earnings`** (ignora `collaborator_tool_earnings` e `partner_bonus_payments`). Ou seja, rodar reconciliação apaga os ganhos de ferramentas do balance.

### 3. Existem DUAS funções `register_collaborator_tool_earning` (sobrecarga)
- Versão antiga (4 args): lê valor de `collaborator_tool_rates`
- Versão nova (7 args): calcula valor por `level` do parceiro

Isso pode causar Edge Functions chamando a versão errada e duplicando/perdendo registros.

---

## 🛠️ Plano de Correção

### Fase 1 — Corrigir a UI do Overview (`PartnerEarningsAdminContent.tsx`)
- Buscar agregados de `collaborator_tool_earnings` por colaborador no `fetchAll` (count + sum por `collaborator_id`)
- Buscar agregados de `partner_bonus_payments` por colaborador
- Adicionar à interface `PartnerRow`:
  - `tool_jobs: number` (total de jobs de IA)
  - `tool_earned: number` (R$ ganho em ferramentas)
  - `bonus_earned: number` (R$ em bônus de ranking)
- Adicionar duas novas colunas na tabela do Overview:
  - **"🤖 Jobs IA"** (com sort)
  - **"R$ Ferramentas"** (com sort)
- Calcular `total_earned` na UI como `unlock_earned + tool_earned + bonus_earned` (fonte de verdade) ao invés de confiar em `collaborator_balances.total_earned`, evitando o problema de dessincronia
- Atualizar cards do topo: adicionar card **"Total Jobs IA"** ao lado de "Prompts Copiados Totais"

### Fase 2 — Corrigir o Extrato Individual (aba "Detail")
Já busca tudo certo (unlock + tool + bonus), mas:
- Adicionar mini-cards de breakdown no topo do extrato (Unlocks vs Ferramentas vs Bônus) — igual à página `/parceiro-extrato`
- Mostrar tag visual diferente para `tool_usage` (já tem, mas reforçar com ícone do tool)

### Fase 3 — Corrigir a função `reconcile_collaborator_balances` (migration SQL)
Reescrever para somar das **3 fontes**:
```sql
SELECT collaborator_id, SUM(amount), COUNT(*)
FROM (
  SELECT collaborator_id, amount FROM collaborator_unlock_earnings
  UNION ALL
  SELECT collaborator_id, amount FROM collaborator_tool_earnings
  UNION ALL
  SELECT partner_id AS collaborator_id, amount FROM partner_bonus_payments
) t GROUP BY collaborator_id
```
E manter `total_unlocks` apenas como contagem de `collaborator_unlock_earnings` (pra preservar a semântica da coluna).

Remover o `DELETE FROM collaborator_balances WHERE collaborator_id NOT IN (...)` ou ampliar para considerar tool_earnings.

### Fase 4 — Reconciliar dados existentes
Após corrigir a função, executar `reconcile_collaborator_balances()` uma vez para alinhar todos os balances com a realidade.

### Fase 5 — Eliminar a sobrecarga ambígua
Dropar a versão antiga (4 args) `register_collaborator_tool_earning(_user_id, _job_id, _tool_table, _prompt_id)` para garantir que todas as Edge Functions usem a versão nova baseada em `level`. Vou validar primeiro com `rg` quem chama qual assinatura.

### Fase 6 — Bump de versão
Incrementar `APP_BUILD_VERSION` em `src/pages/Index.tsx` (memória `auto-increment-build-version`).

---

## ✅ Resultado esperado
- Admin Hub passa a mostrar **jobs IA + R$ ferramentas** por colaborador
- Saldo bruto na UI vira soma real das 3 fontes (não confia em balance defasado)
- Botão de reconciliação passa a corrigir tudo (não só unlocks)
- Sem mais duplicidade de função RPC

Posso prosseguir?