
# Gerenciamento de Créditos IA no Admin Dashboard

## Resumo Executivo

Você quer poder gerenciar os créditos de IA de **todos os usuários** que compraram créditos (pelos 6 produtos configurados) diretamente no painel admin. Isso inclui visualizar, adicionar e remover créditos tanto **mensais** quanto **vitalícios**.

---

## Problema Atual

O painel `/admin-premium-dashboard` atualmente só mostra usuários que estão na tabela `premium_users` (assinantes). Porém, existem usuários que:
- Compraram apenas créditos avulsos (não são premium)
- Têm créditos vitalícios de promoções ou bônus

**Exemplo atual no banco:**
| Usuário | É Premium? | Créditos Mensais | Créditos Vitalícios |
|---------|-----------|------------------|---------------------|
| jonathan.lifecazy@gmail.com | ✅ Sim | 900.069 | 0 |
| reichert.alexandre@gmail.com | ❌ Não | 0 | 4.200 |
| janacomercial3@gmail.com | ❌ Não | 0 | 1.500 |

Os usuários NÃO premium com créditos **não aparecem** no painel atual.

---

## Solução Proposta

### Opção 1: Nova Aba no Dashboard Existente (Recomendada)
Adicionar uma aba "Créditos IA" no painel `/admin-premium-dashboard` que mostra:
- Todos os usuários com créditos (premium ou não)
- Saldo mensal e vitalício separados
- Botões para adicionar/remover de cada tipo

### Opção 2: Nova Página Separada
Criar uma nova página `/admin-credits-dashboard` dedicada exclusivamente à gestão de créditos.

**Recomendo a Opção 1** para manter tudo centralizado.

---

## Funcionalidades

### Listagem de Usuários com Créditos
```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🔍 Buscar por nome ou email...                                          │
├──────────────────┬─────────────────┬─────────────────┬─────────┬───────┤
│ Usuário          │ Créditos Mensais│ Créditos Vitalí│ Total   │ Ações │
├──────────────────┼─────────────────┼─────────────────┼─────────┼───────┤
│ jonathan@...     │ 900.069         │ 0               │ 900.069 │ ✏️ 🗑️ │
│ reichert@...     │ 0               │ 4.200           │ 4.200   │ ✏️ 🗑️ │
│ jana@...         │ 0               │ 1.500           │ 1.500   │ ✏️ 🗑️ │
└──────────────────┴─────────────────┴─────────────────┴─────────┴───────┘
```

### Modal de Edição de Créditos
Ao clicar em editar, abre um modal com:

1. **Informações do Usuário** (nome, email - somente leitura)
2. **Créditos Mensais**
   - Campo mostrando saldo atual
   - Input para ajuste (+/- quantidade)
   - Botão "Adicionar Mensais" / "Remover Mensais"
3. **Créditos Vitalícios**
   - Campo mostrando saldo atual
   - Input para ajuste (+/- quantidade)  
   - Botão "Adicionar Vitalícios" / "Remover Vitalícios"
4. **Campo de descrição** (para log da transação)

---

## Implementação Técnica

### 1. Novo RPC para Remover Créditos (Banco de Dados)
Atualmente só existem funções para **adicionar** créditos. Precisamos criar:

```sql
-- Remover créditos mensais
CREATE FUNCTION remove_monthly_credits(_user_id uuid, _amount integer, _description text)
RETURNS TABLE(success boolean, new_balance integer)

-- Remover créditos vitalícios  
CREATE FUNCTION remove_lifetime_credits(_user_id uuid, _amount integer, _description text)
RETURNS TABLE(success boolean, new_balance integer)
```

### 2. Modificações no Frontend

**Arquivo: `src/pages/AdminPremiumDashboard.tsx`**

- Adicionar sistema de abas (Tabs): "Assinantes" | "Créditos IA"
- Nova função `fetchCreditUsers()` - busca dados de `upscaler_credits` com JOIN em `profiles`
- Novo estado para lista de usuários com créditos
- Modal de edição com campos separados para cada tipo de crédito
- Funções para chamar as RPCs de add/remove créditos

### 3. Fluxo de Edição

```text
Admin clica "Editar" em usuário
         ↓
Modal abre com saldos atuais
         ↓
Admin digita quantidade (ex: 500)
         ↓
Admin escolhe operação:
  • "➕ Adicionar Mensais"
  • "➖ Remover Mensais"
  • "➕ Adicionar Vitalícios"
  • "➖ Remover Vitalícios"
         ↓
RPC é chamado com:
  - user_id
  - amount (500)
  - description ("Ajuste manual - Admin")
         ↓
Saldo atualizado na tabela
Transação registrada em upscaler_credit_transactions
         ↓
Lista atualizada no painel
```

---

## Arquivos que Serão Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/pages/AdminPremiumDashboard.tsx` | Modificar - adicionar aba de créditos |
| Nova migração SQL | Criar - funções RPC para remover créditos |

---

## Segurança

- Todas as operações de créditos exigem role `admin`
- Cada transação é registrada na tabela `upscaler_credit_transactions` com timestamp e descrição
- As funções RPC usam `SECURITY DEFINER` para garantir que apenas admins executem
