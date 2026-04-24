
## Correção: Trigger MovieLed ignora referências a admin_prompts

### Problema
A coluna `movieled_maker_jobs.reference_prompt_id` aponta para `admin_prompts` (templates internos), não para `partner_prompts`. O trigger `trg_register_tool_earning_from_job` tenta gerar earning para todos os jobs com `reference_prompt_id` preenchido, falhando silenciosamente em 115 jobs órfãos.

### Solução

**1. Refinar a função do trigger (migration SQL)**
Atualizar `trg_register_tool_earning_from_job` para verificar se o `reference_prompt_id` existe em `partner_prompts` ANTES de tentar registrar o earning:

```sql
CREATE OR REPLACE FUNCTION public.trg_register_tool_earning_from_job()
RETURNS trigger AS $$
DECLARE
  v_tool_table text := TG_ARGV[0];
  v_is_partner_prompt boolean;
BEGIN
  -- Só processa se o job foi concluído e tem reference_prompt_id
  IF NEW.status != 'completed' OR NEW.reference_prompt_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se o ID pertence a partner_prompts (não admin_prompts/outros)
  SELECT EXISTS (
    SELECT 1 FROM public.partner_prompts 
    WHERE id = NEW.reference_prompt_id AND approved = true
  ) INTO v_is_partner_prompt;

  IF NOT v_is_partner_prompt THEN
    RETURN NEW; -- Sai limpo, é admin_prompts ou outro
  END IF;

  -- Chama a RPC de registro (idempotente)
  PERFORM public.register_collaborator_tool_earning(
    NEW.id, v_tool_table, NEW.reference_prompt_id, NEW.user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**2. Bump APP_BUILD_VERSION**
`src/pages/Index.tsx`: `1.2.0` → `1.2.1`

### Resultado
- Trigger continua funcionando para Arcano Cloner, Pose Changer, Veste AI, Seedance (que apontam para `partner_prompts`)
- MovieLed para de gerar warnings/falhas silenciosas nos 115 jobs que apontam para `admin_prompts`
- Não cria nenhum earning indevido (admin_prompts não tem dono colaborador)
- Idempotente: rodar de novo não quebra nada
