

## Diagnóstico

A função `cleanup_all_stale_ai_jobs()` existe no banco, mas nunca é chamada porque não existe um cron configurado. Você quer uma solução sem serviços externos - e a solução é simples:

**Usar `EdgeRuntime.waitUntil()` para disparar uma verificação após 10 minutos no momento que o job é iniciado.**

## Solução Proposta

Quando um job é iniciado com sucesso (status `running`), a Edge Function dispara uma "tarefa de fundo" que:
1. Espera 10 minutos (`setTimeout` de 600.000ms)
2. Verifica se o job ainda está com status `running` ou `queued`
3. Se sim, marca como `failed` e estorna os créditos

### Mudança Técnica

Adicionar em cada função de IA (upscaler, pose-changer, veste-ai, video-upscaler) um bloco após iniciar o job:

```typescript
// TIMEOUT SAFETY: Cancel job if no response in 10 minutes
EdgeRuntime.waitUntil((async () => {
  await new Promise(r => setTimeout(r, 10 * 60 * 1000)); // 10 minutes
  
  // Check if job is still pending
  const { data: job } = await supabase
    .from('upscaler_jobs')
    .select('status')
    .eq('id', jobId)
    .single();
  
  if (job && (job.status === 'running' || job.status === 'queued')) {
    console.log(`[Timeout] Job ${jobId} stuck for 10min, cancelling...`);
    
    // Cancel and refund
    await supabase.rpc('user_cancel_ai_job', {
      p_table_name: 'upscaler_jobs',
      p_job_id: jobId
    });
  }
})());
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `runninghub-upscaler/index.ts` | Adicionar waitUntil após iniciar job |
| `runninghub-pose-changer/index.ts` | Adicionar waitUntil após iniciar job |
| `runninghub-veste-ai/index.ts` | Adicionar waitUntil após iniciar job |
| `runninghub-video-upscaler/index.ts` | Adicionar waitUntil após iniciar job |

## Como Funciona

```text
[Job Iniciado] ──► EdgeRuntime.waitUntil() dispara timer
                           │
                     [10 minutos]
                           │
                           ▼
                  Verifica status do job
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        [completed/failed]         [running/queued]
              │                         │
              ▼                         ▼
         Nada a fazer            Cancela + Estorna
```

## Resultado Esperado

- Jobs que não recebem callback em 10 minutos são automaticamente cancelados
- Créditos são estornados ao usuário
- Zero custos de cloud/cron externo
- Funciona dentro da própria requisição que inicia o job

