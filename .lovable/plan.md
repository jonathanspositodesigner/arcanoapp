
# Plano: Evitar Duplicação de Emails de Boas-vindas

## Situação Atual

Analisando os dados de hoje, encontrei **duplicações significativas**:
- 1 pessoa recebeu **4 emails** (hellyelclaudinofotografia@gmail.com)  
- 1 pessoa recebeu **3 emails** (arquivosprivwill@gmail.com)
- 12 pessoas receberam **2 emails** cada

As duplicações acontecem em **milissegundos** de diferença (ex: `01:39:45.436` e `01:39:45.830`), indicando que múltiplas requisições de webhook chegam quase simultaneamente.

### Por que acontece?

Plataformas de pagamento (Greenn, Hotmart) frequentemente reenviam webhooks quando não recebem confirmação rápida, ou disparam múltiplas vezes durante o processamento de uma mesma compra.

### Status das Proteções por Webhook

| Webhook | Proteção Anti-Duplicação |
|---------|:------------------------:|
| `webhook-greenn` (PromptClub) | ❌ Não tem |
| `webhook-greenn-artes` | ✅ Já tem |
| `webhook-greenn-musicos` | ❌ Não tem |
| `webhook-hotmart-artes` | ✅ Já tem |

---

## Solução Proposta

Adicionar a **mesma proteção simples** que já funciona nos webhooks que têm, nos que faltam:

### Lógica de Deduplicação (já testada e funcionando)

Antes de enviar qualquer email, verificar se já existe um registro `sent` para o mesmo `email + product_info` nos **últimos 5 minutos**:

```text
Se enviou email para (email + produto) nos últimos 5 minutos:
  → Ignorar (não envia duplicado)
Senão:
  → Envia normalmente
```

### O que NÃO muda (garantia de funcionamento)

1. **Todo o fluxo de processamento** continua igual
2. **Criação de usuário** não é afetada
3. **Liberação de acesso** não é afetada
4. **Primeiro email sempre é enviado** normalmente
5. Apenas duplicatas dentro de 5 minutos são ignoradas

---

## Arquivos a Modificar

### 1. `supabase/functions/webhook-greenn/index.ts`
Na função `sendWelcomeEmail` (linhas ~49-113), adicionar verificação antes de enviar.

### 2. `supabase/functions/webhook-greenn-musicos/index.ts`  
Na função `sendWelcomeEmail` (linhas ~52-114), adicionar a mesma verificação.

---

## Código a Adicionar (em cada webhook)

Dentro da função `sendWelcomeEmail`, logo no início do `try`:

```typescript
// Verificar se já enviou email para este email+produto nos últimos 5 minutos
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
const { data: recentEmail } = await supabase
  .from('welcome_email_logs')
  .select('id, sent_at')
  .eq('email', email)
  .eq('product_info', planDisplayName)  // ou planInfo
  .eq('status', 'sent')
  .gte('sent_at', fiveMinutesAgo)
  .maybeSingle()

if (recentEmail) {
  console.log(`   ├─ [${requestId}] ⏭️ Email já enviado - IGNORANDO duplicata`)
  return
}
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Pessoa compra → recebe 2-4 emails | Pessoa compra → recebe **1 email** |
| Custo de envio multiplicado | Custo de envio normal |
| Logs de email duplicados | Logs limpos, sem duplicatas |

---

## Testes

Após implementar:
1. Fazer uma compra teste
2. Verificar na tabela `welcome_email_logs` que só tem 1 registro
3. Verificar que o email chegou normalmente

## Observação Importante

Esta é uma solução **segura e conservadora** - se por algum motivo a verificação falhar, o email é enviado normalmente (fail-open). O funcionamento atual nunca será prejudicado.
