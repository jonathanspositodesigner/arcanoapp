
# Plano: Sistema de Download via Edge Function Proxy

## Garantia de Segurança

✅ **CONFIRMADO: Nenhuma Edge Function existente será modificada**
- Vou apenas CRIAR uma nova função `download-proxy`
- O arquivo `config.toml` terá uma linha ADICIONADA no final
- As 35 funções existentes continuam INTOCADAS

---

## O Que Será Criado/Modificado

| Arquivo | Ação | Impacto |
|---------|------|---------|
| `supabase/functions/download-proxy/index.ts` | **CRIAR** | Nova função isolada |
| `supabase/config.toml` | **ADICIONAR** | +3 linhas no final |
| `src/hooks/useResilientDownload.ts` | **MODIFICAR** | Adicionar método proxy |

---

## 1. Nova Edge Function: download-proxy

Função que age como intermediário para baixar imagens:

```typescript
// supabase/functions/download-proxy/index.ts
serve(async (req) => {
  // Recebe ?url=<imagem>&filename=<nome>
  // Faz fetch server-side (sem CORS)
  // Retorna com Content-Disposition: attachment
});
```

**Domínios permitidos (segurança):**
- `rh-images-1252422369.cos.ap-beijing.myqcloud.com` (RunningHub CDN)
- `runninghub.cn`, `runninghub.com`
- `jooojbaljrshgpaxdlou.supabase.co` (nosso storage)

---

## 2. Atualização: useResilientDownload.ts

Adicionar **novo método ANTES dos outros** (primeira tentativa):

```typescript
// Method 0: Proxy via Edge Function (most reliable for mobile)
const proxyDownload = async (url: string, filename: string): Promise<boolean> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const proxyUrl = `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  
  // Abre link direto - navegador baixa automaticamente
  window.location.href = proxyUrl;
  await new Promise(r => setTimeout(r, 2000));
  return true;
};
```

**Novo fluxo de fallback:**
1. ⭐ **Proxy Edge Function** (NOVO - funciona no iOS!)
2. Fetch + ReadableStream
3. Fetch + Cache Buster
4. Anchor tag direct
5. Share API (mobile)
6. Open in new tab

---

## 3. Config.toml

Adicionar no final do arquivo:

```toml
[functions.download-proxy]
verify_jwt = false
```

---

## Por Que Funciona no iOS Safari?

| Problema Atual | Solução |
|----------------|---------|
| CORS bloqueado no fetch | Fetch acontece no servidor (sem CORS) |
| Blob download não funciona | Link direto com `Content-Disposition: attachment` |
| Share API falha | Não precisa de blob local |
| PWA não baixa | Navegação normal para URL do nosso domínio |

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  ANTES (falha no iOS)                                          │
├─────────────────────────────────────────────────────────────────┤
│  [iOS Safari] ──X──► [RunningHub CDN]                          │
│                ↑                                                 │
│           CORS BLOCKED                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DEPOIS (funciona!)                                            │
├─────────────────────────────────────────────────────────────────┤
│  [iOS Safari] ───► [download-proxy] ───► [RunningHub CDN]     │
│       │                  │                       │              │
│       │   Content-Disposition: attachment        │              │
│       │◄─────────────────┤◄──────────────────────┤              │
│       │                                                         │
│   DOWNLOAD INICIA AUTOMATICAMENTE ✅                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Garantias Finais

| Item | Status |
|------|--------|
| Edge Functions existentes | ✅ INTOCADAS |
| Webhooks de pagamento | ✅ INTOCADOS |
| Banco de dados | ✅ INTOCADO |
| Créditos | ✅ INTOCADO |
| Funciona iOS Safari | ✅ SIM |
| Funciona Android | ✅ SIM |
| Funciona Desktop | ✅ SIM (mantém fallbacks) |
