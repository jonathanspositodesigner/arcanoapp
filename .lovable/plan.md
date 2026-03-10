

## Plano: Nova aba "ADS" no Admin Hub — Dashboard de Campanhas Meta com atribuição de vendas via UTM

### Contexto
Atualmente o `fetch-meta-ads` busca dados no nível **account** (sem campanhas). Para mostrar campanhas individuais como no print, é preciso buscar no nível **campaign** da Meta API e armazenar esses dados. As vendas já têm `utm_data` (com `utm_campaign`, `utm_source`, etc.) que podem ser cruzadas com os nomes das campanhas.

### 1. Nova tabela `meta_campaign_insights`

```sql
CREATE TABLE public.meta_campaign_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  campaign_status text,
  daily_budget numeric,
  date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  landing_page_views integer DEFAULT 0,
  initiated_checkouts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, date)
);
ALTER TABLE public.meta_campaign_insights ENABLE ROW LEVEL SECURITY;
-- Admin-only read policy
CREATE POLICY "Admins can read campaign insights" ON public.meta_campaign_insights
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Atualizar Edge Function `fetch-meta-ads`

Adicionar nova action `"fetch-campaigns"` que busca da Meta API no nível **campaign**:
- URL: `act_{id}/insights?fields=spend,impressions,clicks,cpm,cpc,actions,campaign_id,campaign_name&level=campaign&time_increment=1`
- Também buscar budget: `act_{id}/campaigns?fields=name,status,daily_budget,lifetime_budget`
- Upsert na tabela `meta_campaign_insights`

### 3. Sidebar: Adicionar aba "ADS"

- Novo item no `AdminHubSidebar.tsx` com `id: "ads"`, ícone `Megaphone`, abaixo de "VENDAS"
- Adicionar `"ads"` ao tipo `HubViewType`
- Em `AdminHub.tsx`, renderizar o novo componente `AdsManagementContent`

### 4. Componente `AdsManagementContent`

Interface inspirada no print, com:

**Tabs superiores**: Contas | **Campanhas** | Conjuntos | Anúncios (inicialmente só Campanhas funcional)

**Filtros**:
- Pesquisar por nome de campanha
- Período (Hoje, 7d, 30d, custom)
- Conta de anúncio (select com account IDs)
- Produto (select com produtos distintos das vendas)

**Tabela de campanhas** com colunas:
| Status | Campanha | Orçamento | Gastos | Vendas | CPA | Faturamento | Lucro | ROI | ROAS |

**Lógica de atribuição de vendas**:
- Buscar vendas aprovadas do período via `get_unified_dashboard_orders`
- Cruzar `utm_data.utm_campaign` de cada venda com o `campaign_name` das campanhas
- Para cada campanha: contar vendas, somar faturamento, calcular CPA/Lucro/ROI/ROAS

**Rodapé**: Totais agregados de todas as campanhas visíveis

**Botão "Atualizar"**: Chama `fetch-meta-ads` com action `"fetch-campaigns"`

**Badge "X vendas não trackeadas"**: Vendas sem `utm_campaign` que não podem ser associadas a nenhuma campanha

### 5. Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `meta_campaign_insights` |
| `supabase/functions/fetch-meta-ads/index.ts` | Adicionar action `fetch-campaigns` |
| `src/components/AdminHubSidebar.tsx` | Adicionar item "ADS" |
| `src/pages/AdminHub.tsx` | Importar e renderizar `AdsManagementContent` |
| `src/components/admin/AdsManagementContent.tsx` | **Novo** — componente principal |
| `src/components/admin/ads/useAdsCampaigns.ts` | **Novo** — hook de dados |

