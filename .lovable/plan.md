

# Plano: Cancelar Jobs Presos e Verificação Global Automática

## Situação Atual

Existe um job preso no status "running" há mais de 7 minutos para o usuário Vinicius (vinnynunesrio@gmail.com):

| ID Job | User ID | Status | Créditos | Tempo |
|--------|---------|--------|----------|-------|
| `11d174d4-7deb-452e-a10b-62a7cdb9abb8` | `858e37be-1c69-4655-a972-5c873df9d522` | running | 60 | ~7 min |

O sistema atual só cancela jobs em **fila** (`queued`), não jobs que estão **processando** (`running`) eternamente.

---

## Solução em 3 Partes

### Parte 1: Botão "Cancelar e Estornar" no Painel Admin

Adicionar uma coluna de **Ações** na tabela de histórico com um botão para cancelar manualmente jobs com status `running` ou `queued`, devolvendo os créditos automaticamente.

### Parte 2: Função SQL para Limpeza Global Automática

Criar uma função `cleanup_all_stale_ai_jobs()` que:
1. Identifica jobs `running` ou `queued` há mais de 10 minutos em **todas as 4 tabelas**
2. Para cada um, chama `refund_upscaler_credits()` para devolver os créditos
3. Atualiza o status para `failed` com mensagem explicativa

### Parte 3: Cron Job (Opcional - Execução Automática)

Configurar um cron job no PostgreSQL para executar a limpeza a cada 5 minutos automaticamente.

---

## Mudanças Técnicas

### Arquivo 1: Nova Migração SQL

Criar função `cleanup_all_stale_ai_jobs()` que limpa todas as tabelas:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name TEXT, cancelled_count INTEGER, refunded_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  job RECORD;
  total_cancelled INTEGER := 0;
  total_refunded INTEGER := 0;
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- Limpar upscaler_jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued') 
    AND created_at < NOW() - stale_threshold
  LOOP
    -- Estornar créditos
    IF job.user_credit_cost > 0 AND job.user_id IS NOT NULL THEN
      PERFORM refund_upscaler_credits(job.user_id, job.user_credit_cost, 
        'Refund: job timeout after 10 minutes');
      total_refunded := total_refunded + job.user_credit_cost;
    END IF;
    
    -- Marcar como failed
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = 'Trabalho cancelado automaticamente após 10 minutos. Créditos estornados.',
      completed_at = NOW()
    WHERE id = job.id;
    
    total_cancelled := total_cancelled + 1;
  END LOOP;
  
  table_name := 'upscaler_jobs';
  cancelled_count := total_cancelled;
  refunded_credits := total_refunded;
  RETURN NEXT;
  
  -- Repetir para pose_changer_jobs, veste_ai_jobs, video_upscaler_jobs...
  -- (código completo para todas as 4 tabelas)
END;
$$;
```

### Arquivo 2: Nova Edge Function `admin-cancel-job`

Endpoint para cancelar um job específico manualmente:

```typescript
// supabase/functions/admin-cancel-job/index.ts

// POST { table: 'upscaler_jobs', jobId: 'uuid' }
// 1. Verifica se usuário é admin
// 2. Busca o job e seu user_credit_cost
// 3. Chama refund_upscaler_credits()
// 4. Atualiza status para 'cancelled'
// 5. Retorna sucesso
```

### Arquivo 3: Atualizar `AdminAIToolsUsageTab.tsx`

Adicionar coluna de ações na tabela:

```tsx
// Nova coluna na tabela
<TableHead className="whitespace-nowrap">Ações</TableHead>

// Célula com botão de cancelar (apenas para running/queued)
<TableCell>
  {(record.status === 'running' || record.status === 'queued') && (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => handleCancelJob(record)}
    >
      <XCircle className="w-4 h-4 mr-1" />
      Cancelar
    </Button>
  )}
</TableCell>
```

---

## Fluxo de Cancelamento Manual

```text
┌─────────────────────────────────────────────────────────────────┐
│ Admin clica em "Cancelar" em um job preso                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend chama Edge Function admin-cancel-job                    │
│ { table: "upscaler_jobs", jobId: "11d174d4-..." }               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Edge Function:                                                   │
│ 1. Verifica se chamador é admin                                 │
│ 2. Busca job e user_credit_cost (60 créditos)                   │
│ 3. Chama refund_upscaler_credits(user_id, 60)                   │
│ 4. Atualiza job: status='cancelled', error_message='...'        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Usuário recebe 60 créditos de volta automaticamente             │
│ Job aparece como "Cancelado" no painel                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Limpeza Automática (a cada 5 min)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Cron job executa cleanup_all_stale_ai_jobs() a cada 5 minutos   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Função SQL percorre as 4 tabelas:                               │
│ - upscaler_jobs                                                 │
│ - pose_changer_jobs                                             │
│ - veste_ai_jobs                                                 │
│ - video_upscaler_jobs                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Para cada job com status running/queued > 10 minutos:           │
│ 1. refund_upscaler_credits(user_id, user_credit_cost)           │
│ 2. UPDATE status = 'failed'                                     │
│ 3. UPDATE error_message = 'Timeout após 10 minutos'             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `Nova migração SQL` | **CRIAR** - Função `cleanup_all_stale_ai_jobs()` |
| `supabase/functions/admin-cancel-job/index.ts` | **CRIAR** - Endpoint para cancelar job manual |
| `src/components/admin/AdminAIToolsUsageTab.tsx` | **MODIFICAR** - Adicionar botão de cancelar |

---

## Ação Imediata

Após implementar, você poderá:

1. **Cancelar manualmente** o job preso do Vinicius clicando no botão "Cancelar"
2. **Os 60 créditos serão devolvidos** automaticamente
3. **Jobs futuros** que ficarem presos mais de 10 minutos serão cancelados e estornados automaticamente

---

## Resultado Esperado

- Botão **vermelho "Cancelar"** aparece apenas em jobs `running` ou `queued`
- Ao clicar, o job é cancelado e créditos são devolvidos
- Toast de confirmação: "Job cancelado e 60 créditos estornados"
- Limpeza automática a cada 5 minutos remove jobs abandonados

