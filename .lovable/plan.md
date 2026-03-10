

## Plano: Corrigir dashboard de ADS -- campanhas vazias e atribuição de vendas

### Problemas identificados

1. **Tabela `meta_campaign_insights` está vazia** -- o `fetch-campaigns` nunca executou com sucesso. A edge function `fetch-meta-ads` não está no `config.toml`, o que pode causar problemas de JWT.

2. **Atribuição de vendas impossível via `utm_campaign`** -- a tabela `webhook_logs` NÃO tem coluna `utm_campaign`. Só tem `utm_source` (ex: `'FB'`, `'FBjLj...'`). O hook tenta casar `utm_data.utm_campaign` que é sempre `null`. Resultado: 0 vendas atribuídas, todas aparecem como "sem UTM".

3. **Dados reais**: 1.156 vendas aprovadas têm `utm_source = 'FB'` (vindas do Facebook). Sem `utm_campaign` granular, a melhor abordagem é **atribuição proporcional por gasto** -- distribuir as vendas FB entre as campanhas proporcionalmente ao spend de cada uma.

### Solução

**1. `config.toml`** -- Adicionar `[functions.fetch-meta-ads]` com `verify_jwt = false`

**2. `useAdsCampaigns.ts`** -- Mudar a lógica de atribuição:
- Identificar vendas do Meta: `utm_source` começa com `'FB'` ou `'fb'`
- Como não há `utm_campaign`, distribuir vendas FB **proporcionalmente ao gasto** de cada campanha
- Vendas sem `utm_source` com `'FB'` = "sem UTM" (não trackeáveis)
- Fórmula: `campanha_vendas = total_vendas_fb * (spend_campanha / spend_total)`
- Revenue também proporcional: `campanha_revenue = total_revenue_fb * (spend_campanha / spend_total)`

**3. Nenhuma mudança no edge function** -- o código do `fetch-campaigns` já está correto, só precisa conseguir executar.

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | Adicionar entry para `fetch-meta-ads` |
| `src/components/admin/ads/useAdsCampaigns.ts` | Trocar matching por `utm_campaign` para atribuição proporcional via `utm_source = FB` |

