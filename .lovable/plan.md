

# Integração Meta Marketing API — Plano de Implementação

## Resumo

Armazenar credenciais do Meta Ads, criar tabela `meta_ad_spend` para cache diário, criar Edge Function `fetch-meta-ads` que puxa gastos das 3 contas e conectar dados reais na dashboard.

## Contas de anúncio confirmadas

- `1415481408767657`
- `588010967298556`
- `578228448304621`

## Passo 1 — Secrets (4 valores)

Usar `add_secret` para solicitar ao usuário que confirme/salve:

| Secret | Valor |
|--------|-------|
| `META_APP_ID` | `1553221255754033` |
| `META_APP_SECRET` | `470719dd6ff93a419c482fb8d9ff149b` |
| `META_ACCESS_TOKEN` | (token fornecido — será trocado por long-lived automaticamente) |
| `META_AD_ACCOUNT_IDS` | `1415481408767657,588010967298556,578228448304621` |

## Passo 2 — Migration: tabela `meta_ad_spend`

```sql
CREATE TABLE meta_ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  date date NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

ALTER TABLE meta_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read meta_ad_spend"
  ON meta_ad_spend FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert meta_ad_spend"
  ON meta_ad_spend FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update meta_ad_spend"
  ON meta_ad_spend FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## Passo 3 — Edge Function `fetch-meta-ads`

Cria `supabase/functions/fetch-meta-ads/index.ts`:

- **Endpoint `POST /`**: recebe `{ action, since?, until? }`
- **action = "fetch"**: para cada conta em `META_AD_ACCOUNT_IDS`, chama `GET /act_{id}/insights?fields=spend,impressions,clicks,cpm,cpc&time_range=...&level=account&time_increment=1` e faz upsert em `meta_ad_spend`
- **action = "exchange-token"**: troca token curto por long-lived usando `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...`, e o novo token precisa ser salvo manualmente depois
- Registrar `[functions.fetch-meta-ads] verify_jwt = false` em config.toml

## Passo 4 — Atualizar `useSalesDashboard.ts`

- Adicionar state `adSpend` e fetch da tabela `meta_ad_spend` somando `spend` de todas as contas no período selecionado
- Retornar `adSpend` no hook

## Passo 5 — Atualizar `SalesDashboard.tsx`

- Substituir `const adSpend = 0` pelo valor real vindo do hook
- KPIs de ROI, Lucro, CPA e Margem passam a funcionar com dados reais

## Passo 6 — Cron job diário

Usar `supabase--read_query` (insert tool) para agendar `pg_cron` que chama a Edge Function todo dia às 06:00 UTC buscando gastos do dia anterior.

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/fetch-meta-ads/index.ts` |
| Editar | `supabase/config.toml` (add entry) |
| Migration | Criar tabela `meta_ad_spend` |
| Editar | `src/components/admin/sales-dashboard/useSalesDashboard.ts` |
| Editar | `src/components/admin/sales-dashboard/SalesDashboard.tsx` |
| SQL insert | Cron job diário |

## Nota sobre o token

O token fornecido provavelmente é de curta duração (1h). A Edge Function terá um endpoint para trocar por long-lived (60 dias). Após a implementação, será necessário chamar esse endpoint uma vez para gerar o token de longa duração.

