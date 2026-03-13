

# Diagnóstico: Atribuição de Vendas no Dashboard de ADS Completamente Quebrada

## Problema encontrado

A atribuição de vendas às campanhas está usando o campo UTM **errado**. Isso faz com que quase nenhuma venda seja corretamente associada às campanhas.

### Evidência concreta (dados de hoje)

- **8 vendas pagas do Pagar.me** com `utm_source: "FB"` — todas pertencendo à campanha "UPSCALLER ARCANO[VENDAS]" (ID: `120238961014270183`)
- **O dashboard mostra 0 vendas** para essa campanha
- **2 vendas** aparecem na campanha errada

### Causa raiz: `utm_content` contém o ID do **anúncio**, não da **campanha**

O código atual em `useAdsCampaigns.ts` (linha 213) tenta usar `utm_content` como campaign_id:

```text
Código atual (ERRADO):
  1º) utm_content → usa como campaign_id
  2º) utm_id → fallback
  3º) utm_campaign → fallback

Dados reais nos UTMs:
  utm_content  = "AD08 ORGANICO|120239632965090183"    ← ID do ANÚNCIO
  utm_campaign = "UPSCALLER ARCANO[VENDAS]|120238961014270183"  ← ID da CAMPANHA
  utm_id       = "120238961014270183"                  ← ID da CAMPANHA
  utm_medium   = "AD08 - ORGANICO|120239632965100183"  ← ID do ADSET
```

Como `utm_content` sempre tem valor (nunca cai no fallback), o código tenta casar um **ad_id** com **campaign_ids** → match nunca acontece → vendas ficam "não identificadas" ou atribuídas errado.

## Impacto

Com a atribuição quebrada, **todas** as colunas derivadas ficam erradas:
- **Vendas**: 0 em vez do valor real
- **CPA**: "—" ou infinito
- **Faturamento**: R$ 0,00
- **Lucro**: Mostra só o gasto negativo
- **ROI**: 0.00x
- **ROAS**: 0.00x

## Solução

### Arquivo: `src/components/admin/ads/useAdsCampaigns.ts` (linhas ~205-228)

Corrigir a ordem de prioridade da extração do campaign_id:

```text
Ordem correta:
  1º) utm_id → contém campaign_id puro (ex: "120238961014270183")
  2º) utm_campaign → extrair ID após "|" (ex: "NOME|120238961014270183" → "120238961014270183")
  3º) NÃO usar utm_content (esse é o ad_id)
```

O código passa a:
1. Tentar `utm_id` primeiro (é o campo mais confiável, contém o campaign_id puro)
2. Fazer fallback para `utm_campaign` extraindo o ID após o `|`
3. **Remover** a tentativa com `utm_content` na atribuição de campanhas (utm_content é para anúncios, que já funciona corretamente em `useAdsHierarchy.ts`)

### Sem mudanças necessárias em `useAdsHierarchy.ts`

A hierarquia de adsets (utm_medium) e ads (utm_content) já usa os campos corretos — o `extractIdFromUtm` extrai o ID após `|` corretamente.

## Resultado esperado

- As 8+ vendas FB de hoje serão corretamente atribuídas a "UPSCALLER ARCANO[VENDAS]"
- CPA, Faturamento, Lucro, ROI e ROAS passarão a mostrar valores reais
- Todas as 3 contas de anúncios terão atribuição funcional

