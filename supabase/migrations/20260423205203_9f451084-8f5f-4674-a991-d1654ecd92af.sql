-- Remove o constraint atual que é por dia
ALTER TABLE public.collaborator_unlock_earnings
  DROP CONSTRAINT IF EXISTS collaborator_unlock_earnings_user_id_prompt_id_unlock_date_key;

-- Adiciona o constraint correto: 1 unlock por usuário por prompt para sempre
ALTER TABLE public.collaborator_unlock_earnings
  ADD CONSTRAINT collaborator_unlock_earnings_user_prompt_unique
  UNIQUE (user_id, prompt_id);

-- Ajusta a RPC para usar o novo alvo de conflito sem alterar assinatura ou fluxo
CREATE OR REPLACE FUNCTION public.register_collaborator_unlock(p_user_id uuid, p_prompt_id uuid, p_device_fingerprint text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prompt RECORD;
  v_rate NUMERIC;
  v_inserted BOOLEAN := false;
BEGIN
  -- Buscar prompt e colaborador
  SELECT pp.id, pp.title, pp.partner_id, p.is_active
  INTO v_prompt
  FROM partner_prompts pp
  JOIN partners p ON pp.partner_id = p.id
  WHERE pp.id = p_prompt_id
    AND pp.approved = true
    AND p.is_active = true;
  
  -- Se não encontrou prompt válido, não registra
  IF v_prompt IS NULL THEN
    RETURN false;
  END IF;
  
  -- Não registrar se o próprio colaborador está desbloqueando
  IF v_prompt.partner_id = p_user_id THEN
    RETURN false;
  END IF;
  
  -- Buscar taxa ativa
  SELECT earning_per_unlock INTO v_rate
  FROM collaborator_rates
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_rate IS NULL THEN
    v_rate := 0.05;
  END IF;
  
  -- Inserir ganho apenas se ainda não existe para este usuário + prompt
  INSERT INTO collaborator_unlock_earnings (
    collaborator_id,
    user_id,
    prompt_id,
    prompt_title,
    amount,
    unlock_date,
    device_fingerprint
  ) VALUES (
    v_prompt.partner_id,
    p_user_id,
    p_prompt_id,
    v_prompt.title,
    v_rate,
    CURRENT_DATE,
    p_device_fingerprint
  )
  ON CONFLICT (user_id, prompt_id) DO NOTHING
  RETURNING true INTO v_inserted;
  
  -- Se inseriu, atualizar saldo e stats do parceiro
  IF v_inserted THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (v_prompt.partner_id, v_rate, 1)
    ON CONFLICT (collaborator_id) DO UPDATE SET
      total_earned = collaborator_balances.total_earned + v_rate,
      total_unlocks = collaborator_balances.total_unlocks + 1,
      updated_at = now();
    
    UPDATE partners
    SET total_earnings = total_earnings + v_rate,
        total_unlocks = total_unlocks + 1,
        updated_at = now()
    WHERE id = v_prompt.partner_id;
  END IF;
  
  RETURN COALESCE(v_inserted, false);
END;
$function$;