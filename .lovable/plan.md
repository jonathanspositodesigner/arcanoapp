

## Unificar planos2 dentro do webhook-greenn existente

Em vez de manter um webhook separado (`webhook-greenn-planos2`), vamos adicionar a logica dos novos planos diretamente no `webhook-greenn` que ja esta configurado na Greenn.

---

### Como vai funcionar

Quando o `webhook-greenn` receber um pagamento, ele vai verificar o `product.id`:

- Se for **148926, 148936, 148937** (Arcano Premium legado) --> segue o fluxo atual (premium_users), nada muda
- Se for **160732, 160735, 160738, 160742** (Planos v2) --> redireciona para a logica do planos2 (planos2_subscriptions)

Ou seja, um unico webhook, dois fluxos internos separados por product ID.

---

### Detalhes tecnicos

**Arquivo editado:** `supabase/functions/webhook-greenn/index.ts`

1. Adicionar o mapeamento `PLANOS2_PRODUCTS` (igual ao que ja existe no webhook-planos2) no topo do arquivo, logo apos o `PRODUCT_ID_TO_PLAN`:

```text
160732 -> starter (1800 creditos, 5 prompts/dia, sem imagem/video, cost_multiplier 1.0)
160735 -> pro (4200 creditos, 10 prompts/dia, com imagem/video, cost_multiplier 1.0)
160738 -> ultimate (10800 creditos, 24 prompts/dia, com imagem/video, cost_multiplier 1.0)
160742 -> unlimited (99999 creditos, sem limite prompts, com imagem/video, cost_multiplier 0.5)
```

2. Dentro da funcao `processGreennWebhook`, logo apos o check de blacklist (linha ~208), adicionar:

```text
Se productId esta em PLANOS2_PRODUCTS:
  -> Chamar processPlanos2Webhook(supabase, payload, logId, requestId, userId, planConfig)
  -> return (nao continua no fluxo legado)
```

3. Criar funcao `processPlanos2Webhook` que faz:
   - Calcular expiracao: se `offerName` contem "anual" OU `productPeriod >= 365` -> 365 dias, senao -> 30 dias
   - Upsert em `planos2_subscriptions` com todos os campos (slug, creditos, limites, cost_multiplier, expires_at)
   - Resetar creditos via `reset_upscaler_credits`
   - Marcar webhook_logs como success

4. No bloco de desativacao (canceled/unpaid/refunded/chargeback, linhas 319-349), adicionar:
   - Verificar se o usuario tem `planos2_subscriptions` com plan_slug != 'free'
   - Se sim, resetar para Free (plan_slug='free', credits=300, sem imagem/video, cost_multiplier=1.0, expires_at=null)
   - Zerar creditos via `reset_upscaler_credits` com 0
   - Manter o blacklist em caso de chargeback (ja existe)

**Arquivo deletado:** `supabase/functions/webhook-greenn-planos2/index.ts` (nao sera mais necessario)

**config.toml:** Remover a entrada `[functions.webhook-greenn-planos2]`

---

### Resumo

- **1 arquivo editado:** `supabase/functions/webhook-greenn/index.ts`
- **1 arquivo/funcao deletado:** `webhook-greenn-planos2`
- **Nenhuma migracao SQL** -- tudo ja existe no banco
- O fluxo legado (Arcano Premium) continua 100% intacto
- Os planos v2 passam a ser processados pelo mesmo webhook, diferenciados apenas pelo product ID

