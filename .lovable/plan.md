
Objetivo: eliminar totalmente a injeção de UTMs “aplicativo” e impedir que qualquer venda com UTM real seja sobrescrita por placeholder, em toda a cadeia (frontend + backend + dados já salvos).

Diagnóstico confirmado no projeto:
- A origem do problema está em `src/hooks/useUtmTracker.ts`: quando não há UTM na URL, ele grava `DEFAULT_UTMS` com todos os campos = `aplicativo`.
- Esses valores são enviados em vários checkouts (`Planos2`, `PlanosArtes`, `PlanosArtesMembro`, `PreCheckoutModal`, `PricingCardsSection`) e persistidos em `asaas_orders.utm_data`.
- Resultado observado em dados reais: grande volume recente de pedidos com `utm_source/utm_campaign/utm_id/utm_content = aplicativo`, afetando o dashboard de Ads.

Plano de implementação

1) Remover a fonte da contaminação (frontend)
- Arquivo: `src/hooks/useUtmTracker.ts`
- Remover `DEFAULT_UTMS` e a lógica que seta UTMs padrão.
- Nova regra: só capturar e salvar quando a URL tiver UTM real.
- Se houver storage legado contendo apenas “aplicativo”, limpar esse storage automaticamente.

2) Centralizar saneamento de UTM e reaproveitar em tudo
- Arquivo: `src/lib/utmUtils.ts`
- Criar helper único para:
  - Ler `captured_utms`
  - Remover valores inválidos (`aplicativo`, vazio, placeholders tipo `{{...}}`)
  - Retornar `null` quando não sobrar UTM válida
- Atualizar `appendUtmToUrl` para usar esse helper:
  - Nunca adicionar `aplicativo`
  - Remover fallback `sckSource = 'app'`
  - Só montar `sck` se houver dados válidos

3) Aplicar o helper em todos os checkouts que hoje fazem `JSON.parse` direto
- Arquivos:
  - `src/pages/Planos2.tsx` (2 pontos)
  - `src/pages/PlanosArtes.tsx`
  - `src/pages/PlanosArtesMembro.tsx`
  - `src/components/upscaler/PreCheckoutModal.tsx` (2 pontos)
  - `src/components/combo-artes/PricingCardsSection.tsx`
- Trocar leitura manual de sessionStorage por helper sanitizado.
- Enviar `utm_data: null` quando não houver UTM válida (em vez de “aplicativo”).

4) Blindagem server-side para nunca persistir placeholder
- Arquivos:
  - `supabase/functions/create-pagarme-checkout/index.ts`
  - `supabase/functions/create-pagarme-subscription/index.ts`
  - `supabase/functions/pagarme-one-click/index.ts`
  - (opcional consistência) `supabase/functions/create-mp-checkout/index.ts`
- Antes de salvar `utm_data`, sanitizar payload recebido com a mesma regra.
- Mesmo que algum cliente antigo envie “aplicativo”, backend descarta e grava `null`.

5) Limpeza retroativa para corrigir dashboard atual
- Via migration SQL (com condição segura), limpar registros contaminados:
  - `asaas_orders`: `utm_data` com todos os valores “aplicativo” -> `null`
  - `mp_orders`: mesma regra
  - `webhook_logs`: `utm_data` totalmente “aplicativo” -> `null`; `utm_source='aplicativo'` -> `null`
- Isso melhora leitura atual da dashboard e remove ruído histórico criado pelo placeholder.

Detalhes técnicos (resumo de fluxo)

```text
Antes:
sem UTM na URL -> useUtmTracker grava "aplicativo" -> checkout envia utm_data "aplicativo" -> DB salva -> Ads dashboard fica distorcido

Depois:
sem UTM na URL -> nada é gravado
com UTM real -> captura e mantém original
qualquer payload com "aplicativo" -> sanitizado no frontend e no backend
DB passa a receber UTM real ou null (nunca placeholder)
```

Validação pós-implementação
- Teste 1 (sem UTM na URL): criar checkout e confirmar `utm_data = null` no pedido.
- Teste 2 (com UTM FB real): criar checkout e confirmar que `utm_source`, `utm_campaign`, `utm_id`, `utm_content` permanecem os originais.
- Teste 3 (dashboard Ads): conferir que novas vendas FB entram na campanha correta.
- Teste 4 (sanidade DB): query de monitoramento para garantir que novos pedidos não entram mais com `utm_source='aplicativo'`.

Resultado esperado
- Cessa definitivamente a sobrescrita por “aplicativo”.
- Atribuição de vendas em Ads fica confiável para novas vendas.
- Histórico contaminado deixa de poluir os indicadores principais.
