

## Auditoria Completa: Funções de Email em Todos os Webhooks

Analisei **7 webhooks** que enviam emails. Aqui estão os bugs e falhas de robustez encontrados, por nível de gravidade.

---

### BUGS CRÍTICOS

#### 1. `webhook-mercadopago` — Sem retry robusto, deleta logs de falha
**Arquivo:** `supabase/functions/webhook-mercadopago/index.ts` (linhas 256-287)
- Apenas 2 tentativas com lógica frágil
- Na linha 264-267: **DELETA o registro de falha** do `welcome_email_logs` antes do retry — apaga evidência de erro
- Sem dedup por `dedup_key` (usa apenas `email` + `template_used`), não distingue compras diferentes do mesmo produto
- Se a segunda tentativa também falha, o fluxo só loga no catch genérico
- **Correção:** Refatorar `sendPurchaseEmail` para usar a mesma lógica robusta do `webhook-pagarme` (3 tentativas, exponential backoff, dedup_key por order_id, sem deletar logs)

#### 2. `webhook-greenn-creditos` — `sendArcanoClonnerEmail` sem NENHUM log
**Arquivo:** `supabase/functions/webhook-greenn-creditos/index.ts` (linhas 296-462)
- A função `sendArcanoClonnerEmail` **não faz INSERT em `welcome_email_logs`** — nenhum registro de envio ou falha
- Sem deduplicação — se o webhook disparar 2x, envia email duplicado
- Sem retry
- **Correção:** Adicionar dedup via `welcome_email_logs`, logging de status, e retry com backoff

#### 3. `webhook-greenn-creditos` — `sendWelcomeEmail` sem log
**Arquivo:** `supabase/functions/webhook-greenn-creditos/index.ts` (linhas 177-293)
- Mesma função `sendWelcomeEmail` **não insere em `welcome_email_logs`** — impossível auditar se emails foram enviados
- Sem deduplicação
- Sem retry
- **Correção:** Adicionar insert de log + dedup + retry

---

### BUGS MODERADOS

#### 4. `webhook-greenn` — Retry manual com apenas 2 tentativas
**Arquivo:** `supabase/functions/webhook-greenn/index.ts` (linhas 659-669)
- Retry manual: chama `sendWelcomeEmail` no catch e faz retry 1x após 3s
- A função `sendWelcomeEmail` internamente já tem dedup por `dedup_key` e logging, mas se o INSERT do log falhar (não por constraint), o email não é enviado e o erro é silenciado
- Sem exponential backoff
- **Correção:** Adicionar loop de retry (3 tentativas) com backoff dentro do caller

#### 5. `webhook-greenn-artes` — Mesmo padrão frágil de retry
**Arquivo:** `supabase/functions/webhook-greenn-artes/index.ts` (linhas 1118-1122)
- Chama `sendWelcomeEmail` dentro de try/catch mas **sem retry** (apenas loga warning)
- A função interna tem dedup e logging, mas se falhar não tenta de novo
- **Correção:** Adicionar retry com backoff

#### 6. `webhook-greenn-musicos` — Sem retry
**Arquivo:** `supabase/functions/webhook-greenn-musicos/index.ts` (linhas 371-375)
- Chama `sendWelcomeEmail` sem retry algum
- Função interna tem dedup e logging
- **Correção:** Adicionar retry

#### 7. `webhook-hotmart-artes` — Retry manual sem backoff, logging frágil
**Arquivo:** `supabase/functions/webhook-hotmart-artes/index.ts` (linhas 196-472)
- Dedup por transaction funciona, mas o fallback é frágil (apenas 5 minutos de janela)
- Se SendPulse retorna erro temporário, não tem retry
- **Correção:** Adicionar retry com backoff

---

### PLANO DE CORREÇÃO

Vou aplicar um padrão unificado em **todos os webhooks**:

**Padrão "sendEmailWithRetry"** — Toda chamada de envio de email seguirá:
1. **Dedup check** via `welcome_email_logs` (por `dedup_key` único)
2. **Blacklist check** via `blacklisted_emails`
3. **3 tentativas** com exponential backoff (2s, 5s, 10s)
4. **Log de cada tentativa** (status `sent` ou `failed` + error_message)
5. **Token cache** reutilizando `getSendPulseToken()` com refresh automático

#### Arquivos a modificar:

| Webhook | Mudança |
|---|---|
| `webhook-mercadopago/index.ts` | Refatorar `sendPurchaseEmail` com 3 retries, dedup_key por order, parar de deletar logs de falha |
| `webhook-greenn-creditos/index.ts` | Adicionar logging + dedup + retry em `sendWelcomeEmail` e `sendArcanoClonnerEmail` |
| `webhook-greenn/index.ts` | Adicionar retry loop (3x) com backoff no caller de `sendWelcomeEmail` e `sendPlanos2WelcomeEmail` |
| `webhook-greenn-artes/index.ts` | Adicionar retry loop (3x) com backoff no caller |
| `webhook-greenn-musicos/index.ts` | Adicionar retry loop (3x) com backoff no caller |
| `webhook-hotmart-artes/index.ts` | Adicionar retry com backoff dentro de `sendWelcomeEmail` |

#### O que NÃO precisa de mudança:
- `webhook-pagarme` — já está robusto (3 retries, dedup_key, logging completo)
- `resend-purchase-email` — já está robusto
- `send-single-email` — função utilitária independente, funciona corretamente

