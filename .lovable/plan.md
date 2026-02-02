

# Plano: Webhook Greenn para Recarga de Créditos Vitalícios

## Resumo

Criar uma nova Edge Function `webhook-greenn-creditos` que processa compras de pacotes de créditos da Greenn e adiciona créditos **permanentes (lifetime)** à conta do usuário. Se o usuário não existir, a conta é criada automaticamente com a senha igual ao email (mesmo padrão dos outros webhooks).

## Mapeamento de Produtos

| Product ID | Créditos | Pacote |
|------------|----------|--------|
| 156946 | +1.500 | R$ 29,90 |
| 156948 | +4.200 | R$ 39,90 |
| 156952 | +10.800 | R$ 99,90 |

## Fluxo Principal

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         GREENN CHECKOUT                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ POST (webhook)
┌─────────────────────────────────────────────────────────────────────┐
│              webhook-greenn-creditos (Edge Function)                │
│                                                                     │
│   1. Recebe payload (< 100ms ACK)                                   │
│   2. Log em webhook_logs com platform='creditos'                    │
│   3. Background: processar créditos                                 │
│      ├─ Mapeia product_id → quantidade de créditos                  │
│      ├─ Busca usuário por email                                     │
│      ├─ SE NÃO EXISTE: Cria conta (email = senha)                   │
│      ├─ Upsert profile                                              │
│      ├─ Chama add_lifetime_credits() RPC                            │
│      ├─ Envia email de boas-vindas (com dados de acesso)            │
│      └─ Atualiza log com resultado                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Fluxo Detalhado

### 1. Status `paid` / `approved`
1. Verificar blacklist
2. Mapear `product_id` para quantidade de créditos
3. Buscar usuário por email (profiles → auth.users paginado)
4. **Se não existe:** Criar usuário com `password: email`, `email_confirm: true`
5. Upsert profile com `password_changed: false`
6. Chamar `add_lifetime_credits(_user_id, _amount, _description)`
7. Enviar email de boas-vindas com dados de acesso
8. Atualizar `webhook_logs` com sucesso

### 2. Status `refunded` / `chargeback`
- Apenas logar o evento (créditos lifetime não são removidos)
- Em caso de chargeback: adicionar email à blacklist

### 3. Outros status
- Ignorar (`pending`, `waiting_payment`, etc.)

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/webhook-greenn-creditos/index.ts` | **CRIAR** |
| `supabase/config.toml` | **MODIFICAR** - Adicionar `[functions.webhook-greenn-creditos]` |

---

## Detalhes Técnicos

### Estrutura do webhook-greenn-creditos

```typescript
// Mapeamento de produtos
const PRODUCT_CREDITS: Record<number, number> = {
  156946: 1500,   // Pacote +1.500
  156948: 4200,   // Pacote +4.200  
  156952: 10800   // Pacote +10.800
}

// Criação de usuário (mesmo padrão dos outros webhooks)
const { data: newUser, error } = await supabase.auth.admin.createUser({
  email,
  password: email,        // Senha = email
  email_confirm: true     // Já confirmado
})

// Upsert profile
await supabase.from('profiles').upsert({
  id: userId,
  name: clientName,
  phone: clientPhone,
  email,
  password_changed: false,  // Força troca de senha no primeiro acesso
  updated_at: new Date().toISOString()
}, { onConflict: 'id' })

// Adicionar créditos lifetime
await supabase.rpc('add_lifetime_credits', {
  _user_id: userId,
  _amount: creditAmount,
  _description: `Compra pacote +${creditAmount} créditos`
})
```

### Email de Boas-Vindas

O email incluirá:
- Dados de acesso (email e senha temporária = email)
- Aviso para trocar senha no primeiro acesso
- Quantidade de créditos adquiridos
- Botão CTA para acessar a plataforma

### Padrões Seguidos
- **Fast Acknowledgment**: Retorna 200 OK imediatamente (< 100ms)
- **Background Processing**: `EdgeRuntime.waitUntil()` para tarefas pesadas
- **Logging**: Tabela `webhook_logs` com `platform='creditos'`
- **Blacklist**: Verifica antes de processar, adiciona em chargebacks
- **Criação de Conta**: Email = senha, `password_changed: false`

### URL do Webhook para Greenn

Após deploy:
```
https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-greenn-creditos
```

