

## Plano: Atribuição Híbrida UTM + Meta Purchases

### Problema
O Meta atribui vendas que o UTM não pega (view-through, UTM perdida). Mas quando a venda tem UTM, o Meta também conta ela. Precisamos do número mais completo sem duplicar.

### Lógica Central
`Math.max(vendas_utm, vendas_meta)` — nunca soma, sempre pega o maior. O Meta já inclui as vendas com UTM na contagem dele.

### Passo 1 — Migração SQL
Adicionar coluna `meta_purchases` (integer, default 0) nas 3 tabelas:
- `meta_campaign_insights`
- `meta_adset_insights`
- `meta_ad_insights`

### Passo 2 — Edge Function `fetch-meta-ads`
Preciso ler o código atual para ver a estrutura do `extractMetrics` e do upsert. Vou extrair o valor de `actions` do tipo `offsite_conversion.fb_pixel_purchase` ou `purchase` e salvar na coluna `meta_purchases`.

### Passo 3 — Hook `useAdsCampaigns.ts`
- Agregar `meta_purchases` por campanha/conjunto/anúncio
- No merge com vendas UTM, usar `Math.max(salesCount, metaPurchases)` como número exibido
- Tooltip: "X vendas (Meta) · Y confirmadas via UTM" quando Meta > UTM

### Passo 4 — UI
- Coluna de vendas mostra o valor maior
- Indicador visual quando existem vendas atribuídas pelo Meta que UTM não pegou
- ROAS calculado com o valor maior

### Arquivos a editar
1. Migração SQL (3 colunas novas)
2. `supabase/functions/fetch-meta-ads/index.ts`
3. `src/hooks/useAdsCampaigns.ts`
4. Componente da tabela de campanhas (UI do tooltip)

