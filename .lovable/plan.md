

## Resumo
1. **Estornar 320 créditos** para o usuário Douglas (4 jobs falhos × 80 créditos)
2. **Corrigir o bug** na função `cleanup_all_stale_ai_jobs` para usar a RPC `refund_upscaler_credits` corretamente

---

## O que aconteceu com o Douglas

O usuário usou o Upscaler 5 vezes:
1. ✅ **Upscaler Standard** (60 créditos) - **Sucesso**
2. ❌ **Upscaler Pro** (80 créditos) - Timeout após 10 min
3. ❌ **Upscaler Pro** (80 créditos) - Timeout após 10 min  
4. ❌ **Upscaler Pro** (80 créditos) - Timeout após 10 min
5. ❌ **Upscaler Pro** (80 créditos) - Timeout após 10 min

**Todos os 4 jobs falhados mostram `credits_refunded: true` no banco, mas NÃO houve transação de estorno criada!**

---

## Bug Identificado

A função `cleanup_all_stale_ai_jobs` faz UPDATE direto na tabela `upscaler_credits` sem:
- Criar registro de transação em `upscaler_credit_transactions`
- Atualizar o `monthly_balance` ou `lifetime_balance` (sistema dual)
- Usar a RPC `refund_upscaler_credits` que faz tudo isso corretamente

```text
ATUAL (bugado):
┌─────────────────────────────────────┐
│  UPDATE upscaler_credits            │
│  SET balance = balance + X          │  ← Só atualiza 'balance'
│  ...                                │  ← NÃO cria transação
│  UPDATE jobs SET refunded = true    │  ← Marca como feito mas não foi
└─────────────────────────────────────┘

CORRETO:
┌─────────────────────────────────────┐
│  PERFORM refund_upscaler_credits()  │  ← Atualiza balance + lifetime
│                                     │  ← Cria transação
│                                     │  ← Retorna sucesso/erro
│  IF success THEN                    │
│    UPDATE jobs SET refunded = true  │  ← Só marca se funcionou
│  END IF                             │
└─────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| **Migration SQL** | Corrigir `cleanup_all_stale_ai_jobs` para usar RPC |
| **Insert SQL** | Estornar 320 créditos para Douglas |

---

## 1. Estorno Manual para Douglas

Usando a RPC correta para criar transação e atualizar os saldos:

```sql
-- Estornar 320 créditos (4 x 80) 
SELECT refund_upscaler_credits(
  '235c97ff-f3f1-4d59-961a-76cad3693672'::UUID,
  320,
  'Estorno manual: 4 jobs de Upscaler Pro falharam por timeout sem webhook'
);
```

---

## 2. Correção da Função cleanup_all_stale_ai_jobs

A correção substituirá os UPDATEs diretos por chamadas à RPC:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_all_stale_ai_jobs()
RETURNS TABLE(table_name text, cancelled_count integer, refunded_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job RECORD;
  refund_result RECORD;
  upscaler_cancelled INTEGER := 0;
  upscaler_refunded INTEGER := 0;
  -- ... outras variáveis ...
  stale_threshold INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- Clean up stale upscaler jobs
  FOR job IN 
    SELECT id, user_id, user_credit_cost, credits_charged, credits_refunded 
    FROM upscaler_jobs 
    WHERE status IN ('running', 'queued', 'starting', 'pending')
    AND created_at < NOW() - stale_threshold
  LOOP
    -- Mark as failed
    UPDATE upscaler_jobs SET 
      status = 'failed',
      error_message = 'Job timed out - cancelled automatically after 10 minutes',
      completed_at = NOW()
    WHERE id = job.id;
    
    upscaler_cancelled := upscaler_cancelled + 1;
    
    -- Refund credits usando a RPC correta
    IF job.credits_charged = TRUE 
       AND job.credits_refunded IS NOT TRUE 
       AND job.user_id IS NOT NULL 
       AND job.user_credit_cost > 0 THEN
      
      -- Usar RPC que cria transação corretamente
      SELECT * INTO refund_result 
      FROM refund_upscaler_credits(
        job.user_id, 
        job.user_credit_cost, 
        'Estorno automático: timeout após 10 minutos'
      );
      
      -- Só marca como reembolsado se a RPC retornou sucesso
      IF refund_result.success THEN
        UPDATE upscaler_jobs SET credits_refunded = TRUE WHERE id = job.id;
        upscaler_refunded := upscaler_refunded + job.user_credit_cost;
      END IF;
    END IF;
  END LOOP;

  -- Repetir para pose_changer_jobs, veste_ai_jobs, video_upscaler_jobs, 
  -- e arcano_cloner_jobs (que foi adicionado recentemente)
  
  -- ... resto da função ...
END;
$$;
```

A migração também incluirá o `arcano_cloner_jobs` que foi adicionado recentemente.

