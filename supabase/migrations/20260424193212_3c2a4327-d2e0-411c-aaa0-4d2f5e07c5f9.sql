CREATE OR REPLACE FUNCTION public.trg_register_tool_earning_from_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tool_table TEXT := TG_ARGV[0];
  v_ref_prompt_id TEXT;
  v_user_id UUID;
  v_is_partner_prompt BOOLEAN;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed')
     OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN

    v_ref_prompt_id := NEW.reference_prompt_id::text;
    v_user_id := NEW.user_id;

    IF v_ref_prompt_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      -- Verifica se o reference_prompt_id pertence a partner_prompts.
      -- MovieLed (e outras tools) podem referenciar admin_prompts (templates internos),
      -- nesses casos NÃO há colaborador dono, então sai limpo sem tentar registrar.
      SELECT EXISTS (
        SELECT 1 FROM public.partner_prompts
        WHERE id::text = v_ref_prompt_id
      ) INTO v_is_partner_prompt;

      IF NOT v_is_partner_prompt THEN
        RETURN NEW; -- ID aponta para admin_prompts ou outra origem; sem earning, sem ruído.
      END IF;

      PERFORM public.register_collaborator_tool_earning(
        _user_id := v_user_id,
        _job_id := NEW.id::text,
        _tool_table := v_tool_table,
        _prompt_id := v_ref_prompt_id
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_register_tool_earning_from_job (%): %', v_tool_table, SQLERRM;
  RETURN NEW;
END;
$function$;