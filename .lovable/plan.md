

## Plano: Aumentar limite de concorrência da fila de 3 para 20

### O que muda

Apenas **2 constantes** no arquivo central `supabase/functions/runninghub-queue-manager/index.ts`:

```
GLOBAL_MAX_CONCURRENT: 3 → 20
SLOTS_PER_ACCOUNT: 3 → 20
```

### Por que é seguro

- Toda a lógica de concorrência é centralizada no `runninghub-queue-manager`. As funções individuais (upscaler, pose-changer, veste-ai, video-upscaler) delegam 100% ao queue manager via `/check` e `/run-or-queue`.
- Os `MAX_CONCURRENT_JOBS = 3` nas edge functions individuais são constantes legadas/não utilizadas para decisão de fila — a decisão real é do queue manager. Mesmo assim, vou atualizá-las para 20 por consistência.
- O `SLOTS_PER_ACCOUNT = 20` garante que cada conta RunningHub individual pode usar até 20 slots, mas o `GLOBAL_MAX_CONCURRENT = 20` é o teto real que impede que ultrapasse 20 no total.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/runninghub-queue-manager/index.ts` | `GLOBAL_MAX_CONCURRENT = 20`, `SLOTS_PER_ACCOUNT = 20` |
| `supabase/functions/runninghub-upscaler/index.ts` | `MAX_CONCURRENT_JOBS = 20` (consistência) |
| `supabase/functions/runninghub-pose-changer/index.ts` | `MAX_CONCURRENT_JOBS = 20` (consistência) |
| `supabase/functions/runninghub-veste-ai/index.ts` | `MAX_CONCURRENT_JOBS = 20` (consistência) |
| `supabase/functions/runninghub-video-upscaler/index.ts` | `MAX_CONCURRENT_JOBS = 20` (consistência) |

### O que NÃO muda
- Lógica de fila FIFO
- Lógica de 1 job por usuário
- Mecanismo de reembolso
- Webhooks
- Cleanup/timeout de 10 min
- Frontend

