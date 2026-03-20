
Objetivo: corrigir o painel para mostrar faturamento real também nas vendas capturadas via Meta API (sem ticket médio, sem estimativa, sem duplicação), em campanha/adset/criativo, com retroativo de 30 dias.

1) Causa raiz confirmada
- Hoje o faturamento é calculado só por vendas UTM vinculadas (`matchedSales`), então vendas “Meta sem UTM” ficam com receita 0.
- A ingestão de insights salva `meta_purchases` (quantidade), mas não salva valor de compra (`action_values`), então não existe base de valor real da Meta no banco.
- Filtro de origem está rígido (basicamente “FB”), podendo ignorar fontes Meta como `ig/instagram`.

2) Estrutura de dados (migration)
- Adicionar coluna `meta_purchase_value numeric not null default 0` em:
  - `meta_campaign_insights`
  - `meta_adset_insights`
  - `meta_ad_insights`

3) Ingestão da Meta (edge function `fetch-meta-ads`)
- Incluir `action_values` nas queries de insights (campaign/adset/ad).
- Extrair valor real de purchase (`offsite_conversion.fb_pixel_purchase`, fallback `purchase`, `omni_purchase`) com `parseFloat`.
- Persistir `meta_purchase_value` junto com `meta_purchases` nos upserts.

4) Cálculo de faturamento (frontend hooks)
- Em `useAdsCampaigns.ts` e `useAdsHierarchy.ts`:
  - Agregar `meta_purchase_value` por entidade.
  - Padronizar detector de origem Meta (`fb/facebook/ig/instagram/meta`).
  - Manter `utmRevenue` como soma real das vendas vinculadas.
  - Calcular faturamento final sem duplicação:
    - `metaExtra = max(0, metaPurchaseValue - utmRevenue)`
    - `revenue = utmRevenue + metaExtra`
  - Isso implementa “UTM + Meta sem duplicar conversão já contada”.

5) Transparência no painel
- Ajustar tooltip de vendas/faturamento para deixar claro:
  - vendas UTM
  - compras Meta
  - faturamento final deduplicado (sem estimativa).

6) Retroativo 30 dias (correção histórica)
- Reprocessar insights de 30 dias via `fetch-meta-ads` (campanhas + adsets + ads).
- Validar que campanhas com `meta_purchases > 0` não fiquem com faturamento 0 quando houver `meta_purchase_value`.

7) Validação final
- Conferir casos reais onde antes aparecia 0 para Meta.
- Confirmar que não existe ticket médio/fallback inventado.
- Confirmar consistência nos 3 níveis: campanha, conjunto, criativo.
