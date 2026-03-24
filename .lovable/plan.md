# Varredura Final: O que cada plano ativa e problemas encontrados

## Dados reais da tabela `mp_products`


| Slug                         | Tipo    | Créditos | Pack Slug          | Preço   |
| ---------------------------- | ------- | -------- | ------------------ | ------- |
| `upscaler-arcano-starter`    | credits | 1.500    | null               | R$24,90 |
| `upscaler-arcano-pro`        | credits | 4.200    | null               | R$37,00 |
| `upscaler-arcano-ultimate`   | credits | 14.000   | null               | R$79,90 |
| `upscaller-arcano-vitalicio` | pack    | 0        | `upscaller-arcano` | R$99,90 |


## O que cada plano ativa HOJE no webhook

### Starter / Pro / Ultimate (type = `credits`)

- Cria/busca usuário via auth
- Upsert no profile
- Chama RPC `add_lifetime_credits` → adiciona créditos vitalícios ao saldo
- **NÃO** cria `user_pack_purchases` (correto, são avulsos)
- **NÃO** cria `planos2_subscriptions` (ver bug abaixo)

### Vitalício (type = `pack`, pack_slug = `upscaller-arcano`)

- Cria/busca usuário
- Insere em `user_pack_purchases` com `access_type: vitalicio`, `has_bonus_access: true`, `expires_at: null`
- **NÃO** adiciona créditos (correto — acesso é ilimitado via pack)
- **NÃO** cria `planos2_subscriptions`

### Email de compra

- Starter/Pro/Ultimate → template "X Créditos Adicionados!" (correto)
- Vitalício → template "Acesso Vitalício Ativado!" (correto)
- Senha no email = email do cliente (funciona mas expõe a senha)

---

## 🔴 BUG CRÍTICO 1: Créditos comprados SEM acesso às ferramentas

A página 69 promete para Starter/Pro/Ultimate:

- "Acesso às Ferramentas de IA"
- "Prompts premium ilimitados"
- Pro/Ultimate: "Geração de Imagem com NanoBanana Pro" e "Geração de Vídeo com Veo 3"

Porém o webhook **só adiciona créditos** via `add_lifetime_credits`. Ele **não cria** nenhuma entrada em `planos2_subscriptions`. O sistema de acesso (`is_premium()`, `useUnifiedAuth`) verifica:

1. `premium_users` → nada inserido
2. `planos2_subscriptions` com `plan_slug != 'free'` → nada inserido

**Resultado**: O cliente compra Starter (R$24,90), recebe 1.500 créditos, mas quando tenta acessar `/ferramentas-ia` ou usar o Upscaler, o sistema diz que ele **não é premium** e bloqueia o acesso. Os créditos ficam lá parados sem poder usar.

O plano Vitalício funciona porque o sistema verifica `user_pack_purchases` com `pack_slug = 'upscaller-arcano'` separadamente.

**Correção**: Ao processar planos de créditos (Starter/Pro/Ultimate), o webhook precisa também criar/atualizar uma entrada em `planos2_subscriptions` para dar acesso premium. Sugestão:

- Starter → plan_slug `starter`, credits_per_month 0 (já tem lifetime), expires_at null
- Pro → plan_slug `pro`, mesma lógica
- Ultimate → plan_slug `ultimate`, mesma lógica

Ou, alternativamente, inserir em `user_pack_purchases` com `pack_slug: 'upscaller-arcano'` para todos os planos de créditos também.

---

## 🔴 BUG CRÍTICO 2: RPC `add_lifetime_credits` bloqueia chamadas do webhook

A RPC tem esta validação:

```sql
IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
  RAISE EXCEPTION 'Access denied: admin role required';
END IF;
```

O webhook usa `SUPABASE_SERVICE_ROLE_KEY`, que faz `auth.uid()` retornar **NULL**. Nesse caso a condição é `NULL IS NOT NULL` = false, então **passa**. Isso funciona, mas é frágil — se alguém mudar a lógica para exigir admin explicitamente, quebra.

**Status**: Funciona hoje. Monitorar.

---

## 🟡 BUG MÉDIO 3: Página promete features que créditos não dão

A UI da página 69 lista para o plano **Pro** e **Ultimate**:

- "Geração de Imagem com NanoBanana Pro" ✅ (incluído)
- "Geração de Vídeo com Veo 3" ✅ (incluído)

Mas para o **Starter**:

- "Geração de Imagem com NanoBanana Pro" ❌ (marcado como `included: false`)
- "Geração de Vídeo com Veo 3" ❌ (marcado como `included: false`)

Se o Bug 1 for corrigido dando acesso premium a todos, o Starter com acesso premium **teria** acesso a geração de imagem/vídeo, contradizendo o UI que mostra ❌. Precisa decidir: ou o Starter não dá acesso a essas features (plan_slug diferenciado), ou o UI está errado.

---

---

## ✅ O que está correto


| Item                                                   | Status |
| ------------------------------------------------------ | ------ |
| Vitalício ativa `user_pack_purchases` corretamente     | ✅      |
| Créditos são adicionados via RPC com lock (FOR UPDATE) | ✅      |
| Dedup de email usa `order.id`                          | ✅      |
| Idempotência via `webhook_logs.transaction_id`         | ✅      |
| Reembolso revoga pack E créditos                       | ✅      |
| Meta CAPI Purchase enviado                             | ✅      |
| Admin notificado com nome do cliente                   | ✅      |
| `check-purchase-exists` verifica `mp_orders`           | ✅      |
| UTMify recebe dados de venda                           | ✅      |
| Back URLs redirecionam para `/sucesso-compra`          | ✅      |


---

## Plano de Correção

### 1. Corrigir ativação de acesso premium para planos de créditos (BUG 1)

No webhook-mercadopago, após adicionar créditos via `add_lifetime_credits`, também inserir em `user_pack_purchases`:

```
pack_slug: 'upscaller-arcano'
access_type: 'credits'
has_bonus_access: true
expires_at: null
```

Isso garante que o `hasAccessToPack('upscaller-arcano')` retorne true e o usuário consiga usar as ferramentas. A lógica de consumo de créditos continua funcionando via `consume_upscaler_credits`.

### 2. Revisar features do Starter vs Pro/Ultimate (BUG 3)

Se Starter NÃO deve ter geração de imagem/vídeo, o acesso precisa ser diferenciado (plan_slug diferente em `planos2_subscriptions`). Se deve ter, corrigir o UI.

**Recomendação**: Manter simples — todos os planos de créditos dão acesso ao pack `upscaller-arcano`. A diferença é só a quantidade de créditos. Geração de imagem/vídeo consome créditos, então o Starter com poucos créditos naturalmente usará menos. Corrigir o UI do Starter para mostrar ✅ em todas as features.

## Arquivos a alterar


| Arquivo                                           | Alteração                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/functions/webhook-mercadopago/index.ts` | Adicionar `user_pack_purchases` para planos de créditos             |
| `src/pages/PlanosUpscalerArcano69v2.tsx`          | Corrigir features do Starter (mostrar ✅ em geração de imagem/vídeo) |
