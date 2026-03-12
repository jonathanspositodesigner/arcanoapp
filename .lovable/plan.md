

## Auditoria de Segurança das Edge Functions

Analisei todas as Edge Functions críticas do projeto. Aqui está o resultado:

---

### Vulnerabilidades Encontradas

#### 1. CRITICA: `webhook-pagarme` — Sem verificação de assinatura
O webhook Pagar.me aceita **qualquer requisição POST** sem validar que veio realmente do Pagar.me. Um atacante pode enviar payloads falsos para:
- Ativar packs/créditos sem pagar
- Criar usuários falsos com acesso completo
- Simular pagamentos de qualquer produto

**Correção:** Validar o header `x-hub-signature` do Pagar.me usando HMAC-SHA256 com a chave secreta. O Pagar.me envia esse header em todos os webhooks.

#### 2. CRITICA: `create-pagarme-checkout` — Sem autenticação e sem rate limit
Qualquer pessoa pode chamar esta função infinitamente para:
- Criar milhares de ordens `pending` (poluindo o banco)
- Consumir a cota da API Pagar.me
- Usar como vetor para spam/abuse

**Correção:** Adicionar rate limit usando a função `check_rate_limit` que já existe no banco, limitando por IP/email.

#### 3. CRITICA: `fetch-meta-ads` — Zero autenticação
Esta função está completamente aberta (`verify_jwt = false`) e **não verifica nenhum token/role**. Qualquer pessoa pode:
- Ler todos os dados de gastos com anúncios (Meta Ads)
- **Pausar ou ativar campanhas** via `update-status` action
- Trocar tokens OAuth via `exchange-token`

**Correção:** Adicionar verificação de auth + admin role (igual ao `refund-pagarme`).

#### 4. ALTA: `webhook-greenn`, `webhook-hotmart-artes` — Sem verificação de assinatura
Mesma situação do webhook Pagar.me. Aceitam qualquer payload. Greenn e Hotmart também enviam assinaturas que devem ser validadas.

**Correção:** Validar assinaturas dos respectivos gateways.

#### 5. MEDIA: `create-pagarme-checkout` — Sem validação de preço no servidor
O preço vem do banco (`mp_products`), o que é correto. Mas não há verificação se o produto é vendável para aquele email específico (ex: preço de membro para não-membro).

**Correção:** Validar no servidor se o slug requisitado é coerente com o status do usuário.

---

### O que já está seguro

| Função | Proteção |
|--------|----------|
| `refund-pagarme` | Auth + Admin role + senha de confirmação |
| `pagarme-one-click` | Auth obrigatória + ownership do cartão |
| `admin-add-credit-user` | Auth + Admin role |
| `manage-admin` | Auth + Admin role |
| `runninghub-*` | Auth + rate limit + verificação de créditos |
| Webhook idempotência | `webhook_logs` com `transaction_id` |

---

### Plano de Correção (por prioridade)

#### 1. `webhook-pagarme` — Adicionar verificação de assinatura HMAC
- Ler o header `x-hub-signature` da requisição
- Calcular HMAC-SHA256 do body com `PAGARME_SECRET_KEY`
- Rejeitar se não bater
- Isso **não quebra nada** — apenas adiciona uma checagem antes do processamento

#### 2. `fetch-meta-ads` — Adicionar auth + admin check
- Extrair token do header `Authorization`
- Verificar `getUser()` + `has_role(admin)`
- Rejeitar se não for admin

#### 3. `create-pagarme-checkout` — Adicionar rate limit
- Usar `check_rate_limit` existente (por IP ou email)
- Limitar a ~5 checkouts por minuto por email
- Não afeta usuários legítimos

#### 4. `webhook-greenn` e `webhook-hotmart-artes` — Adicionar verificação de assinatura
- Greenn: validar token/secret do webhook
- Hotmart: validar `hottok` header

---

### Detalhes Técnicos

**Webhook Pagar.me — Assinatura:**
O Pagar.me envia o header `x-hub-signature` com formato `sha256=HASH`. Para validar:
```typescript
const signature = req.headers.get('x-hub-signature')
const body = await req.text()
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pagarmeSecretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
if (signature !== expected) return new Response('Invalid signature', { status: 401 })
```

**Nenhuma dessas correções altera o comportamento existente** — apenas bloqueiam requisições que não vêm das fontes legítimas.

