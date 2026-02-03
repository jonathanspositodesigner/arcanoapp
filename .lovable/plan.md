

# Adicionar Créditos a Novo Usuário no Admin

## Resumo

Adicionar um botão "Adicionar Créditos a Novo Usuário" na aba "Créditos IA" do painel admin que permite:
1. Buscar um usuário existente pelo email
2. Se não existir, criar o usuário na hora
3. Adicionar créditos (mensais ou vitalícios) ao usuário

---

## Fluxo do Usuário

```text
Admin clica "➕ Adicionar Novo Usuário"
         ↓
Modal abre com campo de busca de email
         ↓
Admin digita email e clica "Buscar"
         ↓
    ┌─────────────┐
    │ Email existe?│
    └──────┬──────┘
           │
    Sim ───┼─── Não
    │             │
    ▼             ▼
Mostra dados   Mostra opção
do usuário     "Criar Usuário"
    │             │
    └─────┬───────┘
          ▼
Admin escolhe quantidade e tipo de crédito
          ▼
Clica "Adicionar Mensais" ou "Adicionar Vitalícios"
          ▼
Usuário criado (se novo) + créditos adicionados
          ▼
Lista atualizada
```

---

## Implementação Técnica

### 1. Nova Edge Function: `admin-add-credit-user`

Responsável por:
- Receber email do usuário
- Buscar na tabela `profiles` primeiro
- Se não encontrar, criar novo usuário via `auth.admin.createUser`
- Criar registro de perfil se necessário
- Adicionar créditos usando as RPCs existentes

**Localização:** `supabase/functions/admin-add-credit-user/index.ts`

### 2. Modificações no Frontend

**Arquivo:** `src/components/admin/AdminCreditsTab.tsx`

Novos elementos:
- Botão "Adicionar Novo Usuário" ao lado do botão de refresh
- Modal "Adicionar Créditos a Novo Usuário" com:
  - Campo de email para busca
  - Botão "Buscar"
  - Área de resultado (usuário encontrado ou opção de criar)
  - Campos de nome (opcional, para novos usuários)
  - Campo de quantidade de créditos
  - Campo de descrição
  - Botões para adicionar mensais/vitalícios

### 3. Estados do Modal

| Estado | Descrição |
|--------|-----------|
| `idle` | Aguardando input de email |
| `searching` | Buscando usuário... |
| `found` | Usuário encontrado, mostra dados |
| `not_found` | Usuário não existe, mostra formulário de criação |
| `submitting` | Processando adição de créditos |

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/admin-add-credit-user/index.ts` | Criar |
| `supabase/config.toml` | Modificar - adicionar função |
| `src/components/admin/AdminCreditsTab.tsx` | Modificar - adicionar modal |

---

## Segurança

- Edge Function verifica role `admin` do usuário solicitante
- Usa `SUPABASE_SERVICE_ROLE_KEY` para criar usuários
- Novos usuários são criados com senha = email (padrão do projeto)
- Todas as transações de crédito são logadas

---

## Detalhes Técnicos

### Edge Function - Endpoints

**POST /admin-add-credit-user**

Request:
```json
{
  "email": "usuario@email.com",
  "action": "search" | "add_credits",
  "name": "Nome do Usuário",
  "creditType": "monthly" | "lifetime",
  "amount": 1500,
  "description": "Motivo do crédito"
}
```

Response (search):
```json
{
  "found": true,
  "user": {
    "id": "uuid",
    "email": "usuario@email.com",
    "name": "Nome"
  }
}
```

Response (add_credits - novo usuário):
```json
{
  "success": true,
  "user_created": true,
  "user_id": "uuid",
  "new_balance": 1500
}
```

Response (add_credits - usuário existente):
```json
{
  "success": true,
  "user_created": false,
  "user_id": "uuid",
  "new_balance": 2500
}
```

