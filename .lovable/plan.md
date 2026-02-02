
# Plano de Limpeza: Edge Functions Não Usadas + Código Morto de Email Marketing

## Resumo Executivo

Este plano remove **6 Edge Functions não utilizadas** e **todo o código morto relacionado a Email Marketing e Importação CSV**, resultando em eliminação total de custos desnecessários do Cloud.

---

## Parte 1: Edge Functions a Deletar

| Edge Function | Motivo da Remoção |
|--------------|-------------------|
| `runpod-upscaler/` | Substituída pelo RunningHub - nunca é chamada |
| `sendpulse-webhook/` | Email marketing - você não usa |
| `process-import-job/` | Importação CSV - você não usa |
| `send-email-campaign/` | Email marketing - você não usa |
| `resend-failed-welcome-emails/` | Recovery de welcome emails - você não usa |
| `process-scheduled-emails/` | Campanhas agendadas - você não usa |

**Pasta a deletar de cada:**
- `supabase/functions/runpod-upscaler/index.ts`
- `supabase/functions/sendpulse-webhook/index.ts`
- `supabase/functions/process-import-job/index.ts`
- `supabase/functions/send-email-campaign/index.ts`
- `supabase/functions/resend-failed-welcome-emails/index.ts`
- `supabase/functions/process-scheduled-emails/index.ts`

---

## Parte 2: Atualizar `supabase/config.toml`

Remover as entradas de configuração das Edge Functions deletadas:
- `[functions.runpod-upscaler]`
- `[functions.sendpulse-webhook]`
- `[functions.process-import-job]`
- `[functions.send-email-campaign]`
- `[functions.process-scheduled-emails]`

---

## Parte 3: Páginas a Deletar

| Arquivo | Linhas | Motivo |
|---------|--------|--------|
| `src/pages/AdminEmailMarketing.tsx` | 17 linhas | Página de email marketing |
| `src/pages/UpscalerRunpod.tsx` | 91 linhas | Página desativada do runpod |
| `src/pages/AdminImportClients.tsx` | 799 linhas | Página de importação CSV |

---

## Parte 4: Componentes a Deletar

| Arquivo | Linhas | Motivo |
|---------|--------|--------|
| `src/components/EmailMarketingContent.tsx` | 1069 linhas | Componente principal de email |
| `src/components/GlobalImportProgress.tsx` | 120 linhas | Barra de progresso de importação |
| `src/components/email-marketing/CampaignHistory.tsx` | ~350 linhas | Histórico de campanhas |
| `src/components/email-marketing/EmailEditor.tsx` | ~300 linhas | Editor de email |
| `src/components/email-marketing/EmojiPicker.tsx` | 68 linhas | Seletor de emoji |
| `src/components/email-marketing/RecipientSelector.tsx` | ~250 linhas | Seletor de destinatários |
| `src/components/email-marketing/SendingProgress.tsx` | ~200 linhas | Progresso de envio |
| `src/components/email-marketing/WelcomeEmailTemplates.tsx` | ~400 linhas | Templates de welcome email |

**Pasta inteira a deletar:**
- `src/components/email-marketing/`

---

## Parte 5: Hooks a Deletar

| Arquivo | Linhas | Motivo |
|---------|--------|--------|
| `src/hooks/useEmailCampaignProgress.ts` | ~100 linhas | Hook de progresso (já simplificado) |
| `src/hooks/useEmailMarketingAnalytics.ts` | ~500 linhas | Analytics de email marketing |
| `src/hooks/useImportProgress.ts` | ~250 linhas | Hook de importação CSV |

---

## Parte 6: Atualizar `src/App.tsx`

Remover referências:

**Imports a remover:**
- Linha 41: `const AdminEmailMarketing = lazy(...)`
- Linha 98: `const AdminImportClients = lazy(...)`
- Linha 119: `const UpscalerRunpod = lazy(...)`
- Linha 124: `const GlobalImportProgress = lazy(...)`

**Rotas a remover:**
- Linha 189: `<Route path="/admin-email-marketing" ...>`
- Linha 258: `<Route path="/admin-import-clients" ...>`
- Linha 280: `<Route path="/upscaler-runpod" ...>`

**Lógica a remover:**
- Linhas 152-161: Renderização do `GlobalImportProgress`

---

## Parte 7: Atualizar Páginas de Marketing (Remover Referências Email)

Arquivos que importam `useEmailMarketingAnalytics`:
- `src/pages/AdminMarketing.tsx`
- `src/pages/admin/PromptsMarketing.tsx`
- `src/components/HubGeneralMarketing.tsx`

**Ação:** Remover imports e referências às estatísticas de email (manter apenas push notifications)

---

## Resumo de Arquivos

### Deletar Completamente (23 arquivos)
```
supabase/functions/runpod-upscaler/index.ts
supabase/functions/sendpulse-webhook/index.ts
supabase/functions/process-import-job/index.ts
supabase/functions/send-email-campaign/index.ts
supabase/functions/resend-failed-welcome-emails/index.ts
supabase/functions/process-scheduled-emails/index.ts
src/pages/AdminEmailMarketing.tsx
src/pages/AdminImportClients.tsx
src/pages/UpscalerRunpod.tsx
src/components/EmailMarketingContent.tsx
src/components/GlobalImportProgress.tsx
src/components/email-marketing/CampaignHistory.tsx
src/components/email-marketing/EmailEditor.tsx
src/components/email-marketing/EmojiPicker.tsx
src/components/email-marketing/RecipientSelector.tsx
src/components/email-marketing/SendingProgress.tsx
src/components/email-marketing/WelcomeEmailTemplates.tsx
src/hooks/useEmailCampaignProgress.ts
src/hooks/useEmailMarketingAnalytics.ts
src/hooks/useImportProgress.ts
```

### Modificar (4 arquivos)
```
supabase/config.toml (remover 5 entries)
src/App.tsx (remover imports e rotas)
src/pages/AdminMarketing.tsx (remover stats de email)
src/components/HubGeneralMarketing.tsx (remover stats de email)
src/pages/admin/PromptsMarketing.tsx (remover stats de email)
```

---

## Economia Estimada

| Componente Removido | Economia |
|---------------------|----------|
| 6 Edge Functions inativas | Elimina risco de invocações acidentais |
| ~3500 linhas de código morto | Build mais rápido |
| Watchdogs e polling removidos | $0 em invocações desnecessárias |

**Total de linhas removidas:** ~5.000+ linhas de código morto
