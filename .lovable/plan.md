

# Plano: Token Temporário para Recuperação de Job via Notificação

## Entendimento do Requisito

Você quer que a URL de recuperação do job (usada na notificação push) seja **temporária** e **expire após 15 minutos**. Isso evita salvar dados desnecessários e garante que a URL só funcione logo após a notificação.

---

## Solução: Token Temporário com Expiração

Em vez de usar `?jobId=xxx` permanente, vou usar um **token temporário** que:
1. É gerado quando o job completa
2. Expira após 15 minutos
3. Permite recuperar o job apenas 1 vez (ou até expirar)
4. É armazenado numa tabela simples e leve

---

## Estrutura Técnica

### Nova Tabela: `job_notification_tokens`

```sql
CREATE TABLE job_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para busca rápida por token
CREATE INDEX idx_job_notification_tokens_token ON job_notification_tokens(token);

-- Auto-limpar tokens expirados (job scheduled diário)
-- Ou limpar na hora de criar novo token
```

### Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO: JOB COMPLETA → NOTIFICAÇÃO → ACESSO           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. JOB COMPLETA (runninghub-queue-manager /finish)                     │
│     ├── status = 'completed'                                            │
│     ├── Gerar token temporário (UUID aleatório)                         │
│     ├── Salvar em job_notification_tokens:                              │
│     │     token: "abc123..."                                            │
│     │     table_name: "upscaler_jobs"                                   │
│     │     job_id: "uuid-do-job"                                         │
│     │     user_id: "uuid-do-usuario"                                    │
│     │     expires_at: NOW() + 15 minutos                                │
│     └── Enviar push:                                                    │
│           url: "/upscaler-arcano-tool?nt=abc123..."                     │
│                                                                         │
│  2. USUÁRIO CLICA NA NOTIFICAÇÃO                                        │
│     └── Abre: /upscaler-arcano-tool?nt=abc123...                        │
│                                                                         │
│  3. PÁGINA CARREGA COM nt= NA URL                                       │
│     ├── Chamar Edge Function /verify-notification-token                 │
│     │     ├── Verificar token existe                                    │
│     │     ├── Verificar não expirou (expires_at > NOW())                │
│     │     ├── Verificar user_id corresponde                             │
│     │     ├── Marcar como consumido (consumed_at = NOW())               │
│     │     └── Retornar: { table, job_id, valid: true }                  │
│     ├── Buscar job no banco: input_url + output_url                     │
│     ├── Restaurar estado: setInputImage, setOutputImage                 │
│     └── Limpar URL (remover ?nt=)                                       │
│                                                                         │
│  4. APÓS 15 MINUTOS                                                     │
│     └── Token expirado - não funciona mais                              │
│                                                                         │
│  5. LIMPEZA AUTOMÁTICA                                                  │
│     └── Tokens expirados deletados automaticamente                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Migration SQL** | CRIAR | Tabela `job_notification_tokens` |
| `supabase/functions/runninghub-queue-manager/index.ts` | MODIFICAR | Gerar token + enviar notificação no /finish |
| `supabase/functions/verify-notification-token/index.ts` | CRIAR | Validar e consumir token |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR | Verificar `?nt=` na URL e restaurar job |
| `src/pages/PoseChangerTool.tsx` | MODIFICAR | Mesma lógica |
| `src/pages/VesteAITool.tsx` | MODIFICAR | Mesma lógica |
| `src/pages/VideoUpscalerTool.tsx` | MODIFICAR | Mesma lógica |
| `src/hooks/usePushNotifications.ts` | MODIFICAR | Incluir user_id na inscrição |

---

## Detalhes de Implementação

### 1. Migration SQL

```sql
-- Tabela para tokens temporários de notificação
CREATE TABLE job_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_job_notification_tokens_token ON job_notification_tokens(token);
CREATE INDEX idx_job_notification_tokens_expires ON job_notification_tokens(expires_at);

-- RLS: Apenas service role pode acessar
ALTER TABLE job_notification_tokens ENABLE ROW LEVEL SECURITY;
-- Sem policies = apenas service role via Edge Functions
```

### 2. Modificação no Queue Manager (/finish)

```typescript
// Após status === 'completed' e gerar thumbnail:
if (status === 'completed' && jobData?.user_id) {
  // Verificar se usuário tem push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', jobData.user_id);
  
  if (subscriptions && subscriptions.length > 0) {
    // Gerar token temporário
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    
    // Salvar token
    await supabase.from('job_notification_tokens').insert({
      token,
      table_name: table,
      job_id: jobId,
      user_id: jobData.user_id,
      expires_at: expiresAt.toISOString()
    });
    
    // Limpar tokens expirados do mesmo usuário (housekeeping)
    await supabase
      .from('job_notification_tokens')
      .delete()
      .eq('user_id', jobData.user_id)
      .lt('expires_at', new Date().toISOString());
    
    // Enviar notificação
    const toolUrl = getToolUrl(table);  // /upscaler-arcano-tool
    const notifUrl = `${toolUrl}?nt=${token}`;
    
    // Usar Edge Function existente send-push-notification modificada
    // ou enviar diretamente para cada subscription
    // ...
  }
}
```

### 3. Edge Function: verify-notification-token

```typescript
serve(async (req) => {
  const { token, userId } = await req.json();
  
  // Buscar token
  const { data: tokenData } = await supabase
    .from('job_notification_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  
  if (!tokenData) {
    return { valid: false, error: 'Token not found' };
  }
  
  // Verificar expiração
  if (new Date(tokenData.expires_at) < new Date()) {
    // Limpar token expirado
    await supabase.from('job_notification_tokens').delete().eq('id', tokenData.id);
    return { valid: false, error: 'Token expired' };
  }
  
  // Verificar usuário
  if (tokenData.user_id !== userId) {
    return { valid: false, error: 'User mismatch' };
  }
  
  // Marcar como consumido (mas não deletar ainda - permitir múltiplos dispositivos)
  await supabase
    .from('job_notification_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', tokenData.id);
  
  return {
    valid: true,
    table: tokenData.table_name,
    jobId: tokenData.job_id
  };
});
```

### 4. Modificação no Frontend (UpscalerArcanoTool)

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const notificationToken = searchParams.get('nt');

useEffect(() => {
  if (!notificationToken || !user?.id) return;
  
  const loadFromNotification = async () => {
    // Verificar token
    const { data } = await supabase.functions.invoke('verify-notification-token', {
      body: { token: notificationToken, userId: user.id }
    });
    
    if (!data?.valid) {
      console.log('[Upscaler] Invalid or expired notification token');
      // Limpar URL sem recarregar
      searchParams.delete('nt');
      setSearchParams(searchParams, { replace: true });
      return;
    }
    
    // Buscar job
    const { data: job } = await supabase
      .from(data.table)
      .select('id, status, input_url, output_url')
      .eq('id', data.jobId)
      .eq('user_id', user.id)
      .single();
    
    if (job && job.output_url) {
      setInputImage(job.input_url);
      setOutputImage(job.output_url);
      setJobId(job.id);
      setStatus('completed');
      setProgress(100);
    }
    
    // Limpar URL
    searchParams.delete('nt');
    setSearchParams(searchParams, { replace: true });
  };
  
  loadFromNotification();
}, [notificationToken, user?.id]);
```

---

## Adicionar user_id ao push_subscriptions

Para que o Queue Manager saiba para quem enviar a notificação, preciso adicionar `user_id` à tabela de subscriptions:

### Migration

```sql
ALTER TABLE push_subscriptions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

### Modificar usePushNotifications.ts

```typescript
// No subscribe():
const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase
  .from('push_subscriptions')
  .insert({
    // ... existing fields ...
    user_id: user?.id || null  // NOVO
  });
```

---

## Vantagens desta Solução

| Aspecto | Benefício |
|---------|-----------|
| **Temporário** | Tokens expiram em 15 minutos automaticamente |
| **Seguro** | Apenas o dono do job pode acessar (verificação de user_id) |
| **Limpo** | Auto-limpeza de tokens expirados |
| **Leve** | Tabela simples, sem dados pesados |
| **Privacidade** | jobId não fica exposto na URL |

---

## Toast de Notificação (Parte Original)

Além do sistema de tokens, também vou implementar o toast discreto pedindo para ativar notificações:

### NotificationPromptToast.tsx

- Aparece no canto inferior direito
- Só para quem não ativou notificações
- "Não obrigado" salva no localStorage para nunca mais mostrar
- Design não intrusivo, não bloqueia a página

---

## Ordem de Execução

1. **Migration**: Criar tabela `job_notification_tokens`
2. **Migration**: Adicionar `user_id` em `push_subscriptions`
3. **usePushNotifications.ts**: Incluir user_id ao inscrever
4. **verify-notification-token**: Criar Edge Function
5. **runninghub-queue-manager**: Gerar token + enviar notificação
6. **UpscalerArcanoTool.tsx**: Salvar input_url + verificar `?nt=`
7. **Outras tools**: Replicar lógica
8. **NotificationPromptToast.tsx**: Criar componente

