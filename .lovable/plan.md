

# Fix: Atribuição de vendas Hotmart no dashboard ADS

## Problema identificado

A venda de `zomilazii106@gmail.com` veio da Hotmart com estes UTMs:
- `utm_source`: FB
- `utm_campaign`: `[ES][UPSCALER ARCANO] $7,90` (nome, sem ID)
- `utm_content`: `120238937998350575` ← **este é o campaign_id real!**
- `utm_id`: `120238937998430575` ← este é outro ID (ad ou adset)
- `utm_term`: `AD3.2 VIDEO ANTES DPS ST`

O código de atribuição de campanhas (linha 211-230 de `useAdsCampaigns.ts`) tenta:
1. `utm_id` → pega `120238937998430575` (não bate com nenhuma campanha)
2. `utm_campaign` → pega o nome sem ID (não extrai nada)
3. **Ignora `utm_content`** com o comentário "contém ad_id, não campaign_id"

Mas neste caso, `utm_content` TEM o campaign_id. O mesmo provavelmente acontece com outras vendas dessa conta ES.

## Solução

Tornar a atribuição mais inteligente: depois de tentar `utm_id` e `utm_campaign`, verificar se o valor extraído realmente existe como `campaign_id` no mapa de campanhas. Se não existir, tentar `utm_content` como fallback.

### Arquivo: `src/components/admin/ads/useAdsCampaigns.ts`

Modificar o bloco de atribuição de campanhas (linhas 206-238) para:

1. Extrair todos os IDs candidatos dos UTMs (`utm_id`, `utm_campaign` parte final, `utm_content`)
2. Verificar qual desses IDs realmente existe no `campaignMap` (campanhas conhecidas)
3. Usar o primeiro match válido

```text
Lógica atual:
  utm_id → resolvedCampaignId (sem validar se existe)
  utm_campaign "Name|ID" → resolvedCampaignId
  utm_content → IGNORADO

Lógica nova:
  Coletar candidatos: [utm_id, utm_campaign_part, utm_content]
  Para cada candidato, verificar se existe em campaignMap
  Usar o primeiro que bater
  Se nenhum bater, usar o primeiro candidato não-vazio (comportamento atual)
```

### Arquivo: `src/components/admin/ads/useAdsHierarchy.ts`

Aplicar a mesma lógica flexível na atribuição de adsets e ads:
- Para adsets: além de `utm_medium`, verificar `utm_id` e `utm_content` contra os adset_ids conhecidos
- Para ads: além de `utm_content`, verificar `utm_id` e `utm_term` contra os ad_ids conhecidos

## Impacto

Corrige a atribuição para campanhas/contas que usam mapeamento UTM diferente do padrão, sem quebrar as que já funcionam.

