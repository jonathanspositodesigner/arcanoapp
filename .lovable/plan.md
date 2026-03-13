

# Bug: Timezone incorreto na aba ADS — vendas de ontem contadas como hoje

## Causa raiz

O problema está em `src/components/admin/ads/useAdsCampaigns.ts`, linhas 153-154:

```typescript
const startTs = new Date(dateRange.start).toISOString();  // "2026-03-13" → "2026-03-13T00:00:00.000Z"
const endTs = new Date(new Date(dateRange.end).getTime() + 86400000).toISOString();
```

`dateRange.start` é uma string como `"2026-03-13"`. Quando faz `new Date("2026-03-13")`, JavaScript interpreta como **meia-noite UTC**, não meia-noite São Paulo. Meia-noite UTC = 21:00 de ontem em SP.

Resultado: vendas que aconteceram entre 21:00 e 23:59 de São Paulo no dia 12/03 (que são 00:00-02:59 UTC do dia 13/03) são contadas como "hoje" na aba ADS, mas na Hotmart aparecem como ontem (horário de Brasília).

**Prova concreta:**
- `boterocalle1@gmail.com` — received_at UTC: 02:11 → SP: **23:11 do dia 12** (ontem)
- `chris-galy@hotmail.com` — received_at UTC: 02:18 → SP: **23:18 do dia 12** (ontem)
- `zomilazii106@gmail.com` — received_at UTC: 15:33 → SP: **12:33 do dia 13** (hoje) ✅

O dashboard principal (`useSalesDashboard.ts`) **não tem esse bug** porque usa `startOfDay(now)` do date-fns que respeita o timezone local do navegador e depois converte para ISO corretamente.

## Correção

### Arquivo: `src/components/admin/ads/useAdsCampaigns.ts`

Linhas 153-154 — converter as datas para São Paulo (UTC-3) antes de enviar para a RPC:

```typescript
// Antes (bugado):
const startTs = new Date(dateRange.start).toISOString();
const endTs = new Date(new Date(dateRange.end).getTime() + 86400000).toISOString();

// Depois (correto — meia-noite São Paulo = 03:00 UTC):
const startTs = `${dateRange.start}T03:00:00.000Z`;
const endTs = new Date(new Date(`${dateRange.end}T03:00:00.000Z`).getTime() + 86400000).toISOString();
```

Isso garante que "hoje" na aba ADS = meia-noite a meia-noite em São Paulo, alinhado com a Hotmart e com o dashboard principal.

### Verificação na RPC `get_unified_dashboard_orders`

A RPC compara `wl.received_at >= _start AND wl.received_at < _end` — isso é correto pois os timestamps já estarão ajustados para SP. Nenhuma alteração necessária na RPC.

### Resultado esperado

- "Hoje" na aba ADS mostrará apenas 1 venda Hotmart (zomilazii106 às 12:33 SP) ✅
- boterocalle1 e chris-galy aparecerão em "Ontem" ✅
- Alinhamento total com o que a Hotmart mostra no painel deles

