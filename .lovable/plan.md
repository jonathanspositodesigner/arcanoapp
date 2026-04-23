

## Plano: Limitar ganho do colaborador a 1x por usuário/prompt/dia

### Problema atual

A constraint de unicidade na tabela `collaborator_tool_earnings` é `UNIQUE(job_id, tool_table)` — impede duplicata por job, mas permite que o mesmo usuário gere 20 jobs com o mesmo prompt no mesmo dia e o colaborador receba por todas as 20.

### Solução

Modificar a RPC `register_collaborator_tool_earning` para verificar se já existe um registro para a combinação `user_id + prompt_id + data(hoje)` antes de inserir. Se já existir, retorna sucesso mas sem creditar.

### Mudança (1 migration SQL)

**Atualizar a função `register_collaborator_tool_earning`** — adicionar check no início:

```sql
-- Verificar se já foi creditado hoje para este user_id + prompt_id
IF EXISTS (
  SELECT 1 FROM collaborator_tool_earnings
  WHERE user_id = _user_id
    AND prompt_id = _prompt_id
    AND created_at::date = CURRENT_DATE
) THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'daily_user_prompt_limit_reached',
    'message', 'Already credited for this user+prompt today'
  );
END IF;
```

Essa verificação é inserida DEPOIS do check de `self_usage_blocked` e ANTES do `INSERT INTO collaborator_tool_earnings`.

### O que NÃO muda

- O fluxo de geração de IA continua idêntico (jobs rodam normalmente)
- O INSERT com `ON CONFLICT (job_id, tool_table) DO NOTHING` continua como proteção extra
- Ganhos de unlock (clique para liberar prompt) não são afetados
- Nenhum arquivo frontend é modificado
- Nenhuma edge function é modificada

### Escopo de cobertura

Todas as ferramentas passam pela mesma RPC `register_collaborator_tool_earning`:
- Arcano Cloner (via `runninghub-queue-manager/finish`)
- MovieLED Maker (via `runninghub-queue-manager/finish`)
- Pose Changer (via `runninghub-queue-manager/finish`)
- Veste AI (via `runninghub-queue-manager/finish`)
- Seedance 2 (via `seedance-poll` e `seedance-recovery`)

A correção na RPC cobre automaticamente todas as ferramentas.

