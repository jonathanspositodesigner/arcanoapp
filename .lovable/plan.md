
## Problema

A atribuição de vendas está usando **distribuição proporcional por gasto**, o que faz TODAS as campanhas receberem vendas/faturamento/lucro proporcionalmente -- mesmo campanhas que nunca geraram nenhuma venda. Isso é completamente errado.

**Descoberta importante**: Os dados de vendas do Mercado Pago JÁ TÊM `utm_campaign` com o `campaign_id` real (ex: `"UPSCALLER ARCANO[VENDAS]|120238961014270183"`). O ID `120238961014270183` bate exatamente com o `campaign_id` da tabela de campanhas. Então é possível fazer matching direto!

## Solução

### 1. Atribuição direta por `campaign_id` (em `useAdsCampaigns.ts`)

Trocar a lógica proporcional por matching direto:

1. Para cada venda com `utm_source = "FB"`:
   - Extrair o `campaign_id` do campo `utm_campaign` (formato: `"NOME|campaign_id"` -- pegar a parte depois do último `|`)
   - Também checar `utm_id` que já contém o campaign_id puro
   - Associar diretamente à campanha correspondente
2. Vendas com `utm_source = "FB"` mas sem campaign_id resolvível (ex: `{{campaign.id}}` template não resolvido) → ficam como "FB sem campanha identificada"
3. Vendas sem `utm_source = "FB"` → "sem UTM" (untracked)
4. Campanha sem nenhuma venda atribuída = 0 vendas, 0 faturamento, 0 lucro

### 2. Corrigir exibição do ROI

- ROI como ratio: `2.5x` em vez de `250%` 
- Fórmula: `receita / gasto` (ex: gastou R$100, faturou R$250 = ROI 2.5x)
- ROAS mantém igual: `receita / gasto`

### 3. Garantir que campanhas sem vendas mostrem zeros

- `sales_count = 0`, `revenue = 0`, `profit = -spend`, `roi = 0`, `roas = 0`

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/components/admin/ads/useAdsCampaigns.ts` | Trocar atribuição proporcional por matching direto via campaign_id extraído do utm_campaign/utm_id |
| `src/components/admin/AdsManagementContent.tsx` | ROI exibido como `2.5x` em vez de `250%` |
