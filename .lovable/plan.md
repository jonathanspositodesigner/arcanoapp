

## Problema Real

O timer de 10 minutos no frontend ja existe e funciona (`useJobStatusSync.ts`), mas **so funciona se o usuario ficar com a aba aberta**. Se fechar a aba, o timer morre e o job fica preso para sempre.

A funcao `cleanup_all_stale_ai_jobs` no banco tambem ja existe, mas so roda "oportunisticamente" quando alguem aciona os endpoints `/check`, `/process-next` ou `/check-user-active` do queue manager. Se ninguem estiver usando o sistema naquele momento, ninguem limpa.

## Solucao (Sem Cron, Sem Custo Extra)

Garantir que a limpeza rode em **TODOS** os endpoints do queue manager, nao so em 3 deles. Assim, qualquer interacao de qualquer usuario limpa jobs presos de todos.

### Endpoints que ja limpam:
- `/check` - ja chama `cleanupStaleJobs()`
- `/process-next` - ja chama `cleanupStaleJobs()`
- `/check-user-active` - ja chama `cleanupStaleJobs()`

### Endpoints que NAO limpam (vao passar a limpar):
- `/enqueue` - quando qualquer usuario enfileira um job novo
- `/finish` - quando qualquer job termina (sucesso ou falha)
- `/webhook` - quando RunningHub envia resultado

Isso significa que **toda vez que qualquer usuario fizer qualquer acao** (iniciar job, receber resultado, verificar status), o sistema automaticamente varre e cancela jobs presos de todos os usuarios.

### Reforco adicional: verificacao no mount da pagina

Alem disso, vamos adicionar uma chamada ao `cleanup_all_stale_ai_jobs` quando o usuario abrir qualquer ferramenta de IA. Isso garante que mesmo que o usuario feche e reabra a pagina, os jobs presos sao limpos imediatamente.

## Detalhes Tecnicos

**Arquivo:** `supabase/functions/runninghub-queue-manager/index.ts`

Mudancas:
1. Adicionar `await cleanupStaleJobs()` no inicio de `handleEnqueue()`
2. Adicionar `await cleanupStaleJobs()` no inicio de `handleFinish()`
3. Adicionar `await cleanupStaleJobs()` no handler de webhook (se existir endpoint separado, ou no inicio do processamento de webhook)

**Arquivo:** `src/hooks/useJobStatusSync.ts`

Mudancas:
4. No mount do hook (quando `enabled` vira true), chamar o endpoint `/check` do queue manager uma vez. Isso dispara `cleanupStaleJobs()` no servidor e garante que jobs antigos daquele usuario sejam limpos antes de iniciar um novo.

Isso cria uma rede de limpeza "automatica" sem nenhum cron job, sem custo extra. A limpeza acontece naturalmente durante o uso normal do sistema. O unico cenario onde um job ficaria preso seria se NINGUEM usar o sistema por mais de 10 minutos (o que e aceitavel, pois nao ha urgencia se nao ha usuarios ativos).

