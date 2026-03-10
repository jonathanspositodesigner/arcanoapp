

## Plano: Ordenação por Colunas + Ativar/Desativar via API

### 1. Ordenação por Colunas (Sortable Headers)

**Arquivo:** `src/components/admin/AdsManagementContent.tsx`

- Adicionar estado `sortColumn` e `sortDirection` (`asc` | `desc`)
- Transformar `MetricsTableHeader` para receber props de sort e disparar clique nos headers
- Cada `<th>` vira clicável com ícone de seta (▲/▼) indicando a direção atual
- Antes de renderizar as rows (campaigns, adsets, ads), aplicar `sort()` baseado na coluna selecionada
- Colunas ordenáveis: Status, Nome, Orçamento, Gastos, Vendas, CPA, Faturamento, Lucro, ROI, ROAS, CPI, IC, Vis. Pág., CTR, CPC, Cliques, CPM, Impressões

A lógica de sort será uma função utilitária que recebe o array + coluna + direção e retorna o array ordenado. Funciona para todos os 3 níveis (campaigns, adsets, ads) pois ambos os tipos têm os mesmos campos numéricos.

### 2. Ativar/Desativar Campanhas, Conjuntos e Anúncios via Meta API

**Arquivo:** `supabase/functions/fetch-meta-ads/index.ts`
- Adicionar nova action `"update-status"` que recebe `{ object_id, object_type, new_status }` 
- Faz POST para `https://graph.facebook.com/v21.0/{object_id}` com `{ status: "ACTIVE" | "PAUSED" }`
- O mesmo endpoint funciona para campaigns, adsets e ads na Graph API

**Arquivo:** `src/components/admin/AdsManagementContent.tsx`
- Transformar o `StatusBadge` em um botão toggle clicável
- Ao clicar, abre um confirm dialog ou simplesmente alterna entre ACTIVE/PAUSED
- Chama `supabase.functions.invoke("fetch-meta-ads", { body: { action: "update-status", object_id, new_status } })`
- Atualiza o status localmente após sucesso
- Mostrar loading spinner no badge durante a operação

### Resumo das Mudanças

| Arquivo | Mudança |
|---|---|
| `AdsManagementContent.tsx` | Headers clicáveis com sort + StatusBadge toggle |
| `fetch-meta-ads/index.ts` | Nova action `update-status` para Meta Graph API |

