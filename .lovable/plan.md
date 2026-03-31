

# Plano de Correção — Gerador de Avatar (Auditoria Completa)

## Problemas Identificados

1. **Otimização dupla de imagens**: `AngleUploadCard` comprime via `optimizeForAI()` no upload, e `handleProcess` comprime novamente os mesmos arquivos — degradação de qualidade + lentidão desnecessária.

2. **Auth frágil na Edge Function**: Tanto `/run` quanto `/refine` usam `getUser(jwtToken)` (lookup remoto) que falha com `session_not_found`. Deve usar validação local de JWT.

3. **Upload sem retry**: `uploadToStorage()` no client faz uma tentativa única — qualquer falha temporária de rede mata o processo inteiro.

4. **Upload sem revalidação de sessão**: Não chama `supabase.auth.getUser()` antes dos uploads para garantir token fresco.

5. **`fetchWithRetry` incompleta**: Falta status codes 500, 520-525 (Cloudflare) na lista de retryable, e não trata erros de rede no catch.

6. **Downloads sem timeout**: `downloadAndUploadToRH()` faz `fetch(imageUrl)` sem `AbortController` — pode travar indefinidamente.

---

## Correções Planejadas

### 1. Remover otimização dupla (AngleUploadCard.tsx → sem mudança, GeradorPersonagemTool.tsx → remover)
- Remover as chamadas `optimizeForAI()` em `handleProcess()` (linhas 274-276) — as imagens já vêm otimizadas do `AngleUploadCard`
- Usar `frontFile, profileFile, semiProfileFile, lowAngleFile` diretamente no upload

### 2. Upload com retry e revalidação de sessão (GeradorPersonagemTool.tsx)
- Antes de iniciar uploads, chamar `supabase.auth.getUser()` para forçar refresh do token
- Criar helper `uploadWithRetry()` que tenta 3x com backoff (1s, 3s, 5s), e tenta `refreshSession()` no primeiro erro 401/403

### 3. Auth local na Edge Function (runninghub-character-generator/index.ts)
- Em `/run` e `/refine`: trocar `anonClient.auth.getUser(jwtToken)` por decodificação local do JWT (extrair `sub` do payload base64)
- Manter validação de expiração (`exp`)

### 4. Expandir `fetchWithRetry` na Edge Function
- Adicionar status 500, 520, 521, 522, 523, 524, 525 à lista de retryable
- Adicionar try/catch no fetch interno para capturar erros de socket (http2 stream error, connection reset) e fazer retry

### 5. Timeout nos downloads de imagem (Edge Function)
- Adicionar `AbortController` com timeout de 30s em `downloadAndUploadToRH()`

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/GeradorPersonagemTool.tsx` | Remover `optimizeForAI` duplo em `handleProcess`; adicionar `getUser()` antes de uploads; retry 3x no `uploadToStorage` |
| `supabase/functions/runninghub-character-generator/index.ts` | JWT local em `/run` e `/refine`; expandir `fetchWithRetry`; AbortController 30s nos downloads |

