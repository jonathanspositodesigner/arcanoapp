

## Plano: Converter vendas internacionais para BRL no dashboard

### Problema identificado
Vendas da Hotmart LATAM (`hotmart-es`) chegam em moedas locais (ARS, COP, USD, etc.) mas são armazenadas e exibidas como se fossem BRL. Exemplos reais:
- 31.349 COP (deveria ser ~R$ 38) aparece como R$ 31.349
- 9.439 ARS (deveria ser ~R$ 52) aparece como R$ 9.439
- 44 USD (deveria ser ~R$ 250) aparece como R$ 44

### Solução em 3 partes

#### 1. Adicionar coluna `currency` e `amount_brl` na tabela `webhook_logs`
- `currency TEXT` — moeda original (ARS, COP, USD, BRL, etc.)
- `amount_brl NUMERIC` — valor convertido para BRL

#### 2. Corrigir vendas existentes (migration de dados)
- Para registros `hotmart-es` que ainda têm payload: extrair `currency_value` do payload e converter usando taxas fixas atuais
- Para registros sem payload: inferir moeda pelo valor (31k+ = COP, 9k+ = ARS, <100 = USD)
- Taxas aproximadas para correção histórica:
  - USD → BRL: ~5.70
  - COP → BRL: ~0.00122
  - ARS → BRL: ~0.0054
  - MXN → BRL: ~0.28
- Registros de plataformas brasileiras (artes-eventos, prompts, app): `currency = 'BRL'`, `amount_brl = amount`

#### 3. Corrigir para vendas futuras
- **webhook-hotmart-artes**: Capturar `currency_value` do payload e chamar API de câmbio para converter para BRL antes de gravar
- **RPC `get_unified_dashboard_orders`**: Usar `COALESCE(amount_brl, amount)` para exibir sempre o valor em BRL
- Fallback: se API de câmbio falhar, usar tabela de taxas hardcoded

### Detalhes técnicos

**Migration SQL:**
- ALTER TABLE webhook_logs ADD COLUMN currency TEXT DEFAULT 'BRL'
- ALTER TABLE webhook_logs ADD COLUMN amount_brl NUMERIC
- UPDATE existentes com conversão

**Edge Function `webhook-hotmart-artes`:**
- Extrair moeda: `payload.data.purchase.price.currency_value`
- Se não for BRL, converter via API `open.er-api.com` (mesma já usada no frontend)
- Gravar `currency` e `amount_brl` no insert do webhook_logs

**RPC `get_unified_dashboard_orders`:**
- Substituir `COALESCE(wl.amount, 0)` por `COALESCE(wl.amount_brl, wl.amount, 0)` no SELECT

