

## Plano: Corrigir duplicata de overload na RPC que impede registro de earnings

### Causa raiz encontrada

A migration anterior criou uma NOVA versão da função `register_collaborator_tool_earning` com parâmetros em ordem diferente, mas **NÃO removeu a versão antiga**. Resultado: existem DUAS funções com o mesmo nome no banco:

```text
Versão antiga: (_job_id text, _tool_table text, _prompt_id text, _user_id uuid)
Versão nova:   (_user_id uuid, _job_id text, _tool_table text, _prompt_id text)
```

Quando o edge function chama via RPC com parâmetros nomeados, o PostgreSQL encontra **ambiguidade** entre as duas assinaturas e falha. O erro é engolido pelo `try/catch` na linha 961 do `runninghub-queue-manager/index.ts`:

```typescript
} catch (e) {
  console.error('[QueueManager] /finish: Error registering tool earning:', e);
}
```

O `/finish` retorna 200 (o job já foi marcado como completed), mas o earning nunca é registrado.

### Evidências

1. Job `dd6af0e3` completou com `reference_prompt_id = 6de0b5de-...` (confirmado no DB)
2. O `/finish` retornou HTTP 200 (confirmado nos analytics)
3. ZERO registros em `collaborator_tool_earnings` para esse job
4. `SELECT count(*) FROM pg_proc WHERE proname = 'register_collaborator_tool_earning'` retorna **2**

### Correção (1 migration SQL)

1. **Dropar a versão antiga** da função (a que tem `_job_id` como primeiro parâmetro)
2. Manter apenas a versão nova (com daily limit check)
3. **Registrar manualmente o earning perdido** do job `dd6af0e3` via INSERT direto

```sql
-- 1) Remover a overload antiga
DROP FUNCTION IF EXISTS public.register_collaborator_tool_earning(text, text, text, uuid);

-- 2) Inserir earning perdido do teste
INSERT INTO collaborator_tool_earnings (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount)
VALUES (
  'f008a899-b57e-4a40-819c-578cf9434040',
  '61597c56-6d48-44d3-b236-5cb9cffcf995',
  'dd6af0e3-d822-47aa-9b7c-ede1244bb6f9',
  'arcano_cloner_jobs',
  '6de0b5de-a771-4556-aa14-9472ba43f640',
  'Ensaio mulher',
  0.16
) ON CONFLICT (job_id, tool_table) DO NOTHING;
```

### O que NÃO muda

- Nenhum arquivo frontend
- Nenhuma edge function
- A lógica de daily limit permanece intacta
- O fluxo de geração de IA não é alterado
- Os earnings anteriores não são afetados

### Resultado esperado

- Apenas UMA versão da RPC no banco
- Chamadas futuras via edge function resolvem sem ambiguidade
- Collaborador recebe o earning corretamente na primeira geração do dia com seu prompt

