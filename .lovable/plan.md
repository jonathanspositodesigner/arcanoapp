

## Auditoria de Segurança — APIs de IA (Google + RunningHub)

### Status atual

| Função | Auth | Vulnerabilidade |
|--------|------|-----------------|
| `generate-image` | JWT + getClaims ✅ | Segura |
| `generate-video` | JWT + getClaims ✅ | Segura |
| `poll-video-status` | JWT + getClaims ✅ | Segura |
| `runninghub-upscaler` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-pose-changer` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-veste-ai` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-video-upscaler` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-character-generator` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-flyer-maker` | **NENHUMA** ❌ | userId vem do body |
| `runninghub-bg-remover` | **NENHUMA** ❌ | userId vem do body |

### Problema CRITICO

Todas as 7 funções RunningHub aceitam `userId` diretamente do body da requisição e usam o `SERVICE_ROLE_KEY` para consumir créditos. Isso significa:

1. **Um atacante pode gastar os créditos de QUALQUER usuário** — basta enviar o UUID de outra pessoa
2. **Não há verificação de que o chamador é realmente o dono do userId** — como `verify_jwt = false` e não há validação do header Authorization
3. A função `consume_upscaler_credits` tem proteção `auth.uid() != _user_id`, mas como a Edge Function usa SERVICE_ROLE_KEY, `auth.uid()` é NULL e o check é ignorado

O upscaler tem um modo `trial_mode` que aceita requests totalmente sem auth (para free trial), isso está OK pois usa um UUID fixo de trial. Mas o modo normal precisa de auth.

### Correção proposta

Para **cada uma das 7 funções RunningHub**, adicionar verificação de JWT no início da função `handleRun` (e `handleRefine` onde aplicável):

```typescript
// Extrair e validar o token JWT do header Authorization
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ... });
}

const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ... });
}

// Forçar userId do token, ignorando o que veio no body
const verifiedUserId = user.id;
```

**Exceções:**
- `runninghub-upscaler`: manter o `trial_mode` sem auth (já usa UUID fixo), mas no modo normal validar JWT
- `handleUpload`: manter sem auth (uploads são stateless e não consomem créditos)
- `handleReconcile` e `handleQueueStatus`: manter sem auth (são queries de status)

### Funções a editar (7 arquivos)

1. `supabase/functions/runninghub-upscaler/index.ts` — `handleRun` + `handleFallback`
2. `supabase/functions/runninghub-pose-changer/index.ts` — `handleRun`
3. `supabase/functions/runninghub-veste-ai/index.ts` — `handleRun`
4. `supabase/functions/runninghub-video-upscaler/index.ts` — handler de `/run`
5. `supabase/functions/runninghub-character-generator/index.ts` — `handleRun` + `handleRefine`
6. `supabase/functions/runninghub-flyer-maker/index.ts` — `handleRun`
7. `supabase/functions/runninghub-bg-remover/index.ts` — `handleRun`

### O que NÃO muda
- `handleUpload` continua sem auth (não consome créditos)
- `handleReconcile` e `handleQueueStatus` continuam sem auth
- Nenhuma mudança no frontend (o `supabase.functions.invoke()` já envia o token automaticamente)
- As funções do Google (`generate-image`, `generate-video`, `poll-video-status`) já estão seguras

### Garantia de não quebrar nada
- O frontend já usa `supabase.functions.invoke()` que inclui automaticamente o header `Authorization: Bearer <token>`
- A mudança é puramente aditiva: adiciona uma verificação **antes** do processamento existente
- O `userId` do body será **substituído** pelo do token, não removido — então todo o código downstream continua funcionando

