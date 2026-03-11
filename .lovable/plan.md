

## Plano: Corrigir filtro padrão do Meta Ads + Linkagem de vendas Hotmart

### Problemas Encontrados

**1. Filtro padrão do Meta Ads**
`AdsManagementContent.tsx` inicia com `period = "7d"` ao invés de `"today"`.

**2. Atribuição de vendas Hotmart está usando o campo ERRADO como campaign_id**

Investiguei as vendas recentes e os dados do Meta:

- Venda `andresmechor`: `utm_content = 120238937998350575`, `utm_id = 120238937998320575`
- Na tabela `meta_campaign_insights`: campaign_id = `120238937998350575` (= **utm_content**)

**O `utm_content` contém o campaign_id, NÃO o `utm_id`!** O template Meta Ads do usuário está assim:
- `utm_source` = FB
- `utm_campaign` = `{{campaign.name}}`
- `utm_content` = `{{campaign.id}}` ← **ESTE é o campaign_id**
- `utm_id` = `{{adset.id}}` ← isto é o adset_id
- `utm_term` = `{{ad.name}}`

O código de atribuição em `useAdsCampaigns.ts` (linha 212) usa `utm_id` como campaign_id → nunca match!

**3. Vendas via xcod têm parsing incorreto**

A venda `matuchi67` veio com sck/xcod contendo `hQwK21wXxR` DENTRO dos valores separados por `|`. O parser SOURCE 1 (sck) dividiu por `|` mas os valores ainda contêm o delimitador xcod, resultando em utm_data corrompida.

No webhook, o sck é:
```text
FBtoken hQwK21wXxR campaign_name | campaign_id hQwK21wXxR ad_label | adset_id hQwK21wXxR ad_name | ad_id hQwK21wXxR placement
```

A solução: ao fazer parse do sck, detectar se os valores contêm `hQwK21wXxR` e re-parsear corretamente.

### Alterações

**Arquivo 1: `src/components/admin/AdsManagementContent.tsx`**
- Mudar `useState<AdsPeriod>("7d")` para `useState<AdsPeriod>("today")` (linha 391)

**Arquivo 2: `src/components/admin/ads/useAdsCampaigns.ts`**
- Na atribuição (linha 206-222), trocar a lógica: usar `utm_content` como campaign_id (não `utm_id`)
- `utm_content` deve ser tentado primeiro como resolvedCampaignId
- Manter `utm_id` como fallback (para compatibilidade)
- Manter o parse de `utm_campaign` com `|` como segundo fallback

**Arquivo 3: `supabase/functions/webhook-hotmart-artes/index.ts`**
- No SOURCE 1 (sck parsing, linha 836-845): após dividir por `|`, verificar se algum valor contém `hQwK21wXxR`
- Se sim, PRIMEIRO dividir a string inteira por `hQwK21wXxR` e depois remover `|` dos valores intermediários para extrair IDs puros
- Mapear corretamente:
  - [0] → utm_source (ex: `FBtoken`)
  - [1] → utm_campaign (ex: `campaign_name`)
  - Extrair IDs numéricos dos segmentos `|` como: utm_content (campaign_id), utm_id (adset_id)
- Adicionar novo SOURCE entre 1 e 2: se `origin.sck` contém `hQwK21wXxR`, tratar como xcod-encoded sck
  - Dividir por `hQwK21wXxR` e parsear os 5+ segmentos
  - Segmentos que contêm `|` devem ser tratados como `name|id` pares

### Lógica de parsing xcod no sck (detalhada)

Quando sck contém `hQwK21wXxR`:
1. Split inteiro por `hQwK21wXxR` → partes limpas
2. Mapeamento:
   - [0] = utm_source (FB token)
   - [1] = nome da campanha (contem `|` com campaign_id no próximo segmento)
3. Recomposição dos pipes: juntar tudo, split por `|`, extrair IDs numéricos
4. Resultado final: utm_source, utm_campaign (nome), utm_content (campaign_id), utm_id (adset_id), utm_term (ad_name/placement)

