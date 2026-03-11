

## Diagnóstico: Job do Remover Fundo fica preso como "running" eternamente

### Causa raiz confirmada

A edge function `runninghub-webhook` **não foi redeployada** depois que `bg_remover_jobs` foi adicionado ao array `IMAGE_JOB_TABLES`. 

Prova nos logs:
- 20:49:21 — Edge function bg-remover iniciou job com task_id `2031834884829483010`
- 20:49:26 — Webhook recebeu `TASK_END` com `SUCCESS` para esse task_id
- 20:49:27 — Webhook logou **"Job not found"** — a versão deployada NÃO procura em `bg_remover_jobs`

A versão no código fonte ESTÁ correta (linha 29 do webhook inclui `bg_remover_jobs`), mas a versão **rodando no servidor** é antiga e não tem essa tabela no loop de busca.

Resultado: webhook nunca atualiza o status → job fica `running` para sempre → polling vê `running` e não faz nada → usuário fica preso.

### Existem 2 jobs travados agora

| Job ID | Task ID | Criado em |
|--------|---------|-----------|
| `c3d126c5-...` | `2031834884829483010` | 20:49 |
| `609a53f9-...` | `2031836876675096578` | 20:57 |

### Correções necessárias

#### 1. Redeployar `runninghub-webhook`
A versão no código já está correta. Só precisa fazer deploy para que a versão no servidor inclua `bg_remover_jobs` no loop de busca.

#### 2. Redeployar `runninghub-queue-manager`
Mesmo caso — o código já inclui `bg_remover_jobs` mas precisa garantir que a versão deployada está atualizada.

#### 3. Corrigir os 2 jobs travados
Marcar como `failed` com estorno de créditos via query direta, já que os webhooks de sucesso foram perdidos e as URLs de output da RunningHub são temporárias.

#### 4. Nenhuma mudança de código necessária
O código fonte já está correto. O problema é puramente de deploy.

