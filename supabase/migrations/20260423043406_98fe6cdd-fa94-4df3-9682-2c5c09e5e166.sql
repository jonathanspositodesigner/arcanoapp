
-- ===== TABELAS =====

-- 1. partner_gamification
CREATE TABLE public.partner_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  xp_total integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  streak_last_date date,
  streak_protection_available boolean NOT NULL DEFAULT true,
  streak_protection_used_month integer DEFAULT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.partner_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own gamification"
  ON public.partner_gamification FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System manages gamification"
  ON public.partner_gamification FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow RPCs (security definer) to insert/update
ALTER TABLE public.partner_gamification FORCE ROW LEVEL SECURITY;

-- 2. partner_badges
CREATE TABLE public.partner_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  badge_slug text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, badge_slug)
);
ALTER TABLE public.partner_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own badges"
  ON public.partner_badges FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 3. partner_xp_log
CREATE TABLE public.partner_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  xp_amount integer NOT NULL,
  reason text NOT NULL,
  reference_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.partner_xp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own xp log"
  ON public.partner_xp_log FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 4. partner_weekly_challenges
CREATE TABLE public.partner_weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  target_value numeric DEFAULT NULL,
  category_target text DEFAULT NULL,
  xp_reward integer NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.partner_weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read challenges"
  ON public.partner_weekly_challenges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manages challenges"
  ON public.partner_weekly_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. partner_challenge_progress
CREATE TABLE public.partner_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.partner_weekly_challenges(id) ON DELETE CASCADE,
  current_count integer NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  xp_awarded boolean NOT NULL DEFAULT false,
  UNIQUE(partner_id, challenge_id)
);
ALTER TABLE public.partner_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own progress"
  ON public.partner_challenge_progress FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 6. partner_bonus_payments
CREATE TABLE public.partner_bonus_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  week_start date NOT NULL,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.partner_bonus_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner reads own bonus"
  ON public.partner_bonus_payments FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin inserts bonus"
  ON public.partner_bonus_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== INDEXES =====
CREATE INDEX idx_partner_xp_log_partner ON public.partner_xp_log(partner_id);
CREATE INDEX idx_partner_xp_log_created ON public.partner_xp_log(created_at DESC);
CREATE INDEX idx_partner_badges_partner ON public.partner_badges(partner_id);
CREATE INDEX idx_partner_challenge_progress_partner ON public.partner_challenge_progress(partner_id);
CREATE INDEX idx_partner_challenge_progress_challenge ON public.partner_challenge_progress(challenge_id);
CREATE INDEX idx_partner_bonus_payments_partner ON public.partner_bonus_payments(partner_id);
CREATE INDEX idx_partner_weekly_challenges_week ON public.partner_weekly_challenges(week_start, week_end);

-- ===== HELPER: award_partner_badge =====
CREATE OR REPLACE FUNCTION public.award_partner_badge(_partner_id uuid, _badge_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO partner_badges (partner_id, badge_slug)
  VALUES (_partner_id, _badge_slug)
  ON CONFLICT (partner_id, badge_slug) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- ===== RPC: add_partner_xp =====
CREATE OR REPLACE FUNCTION public.add_partner_xp(
  _partner_id uuid,
  _xp_amount integer,
  _reason text,
  _reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_xp integer;
  _old_level integer;
  _new_level integer;
  _badges_awarded text[] := '{}';
  _total_earned numeric;
  _tool_job_count integer;
  _seedance_job_count integer;
BEGIN
  -- Upsert gamification record
  INSERT INTO partner_gamification (partner_id, xp_total)
  VALUES (_partner_id, _xp_amount)
  ON CONFLICT (partner_id) DO UPDATE
  SET xp_total = partner_gamification.xp_total + _xp_amount,
      updated_at = now();

  -- Get current state
  SELECT xp_total, level INTO _new_xp, _old_level
  FROM partner_gamification WHERE partner_id = _partner_id;

  -- Calculate new level
  _new_level := CASE
    WHEN _new_xp >= 2000 THEN 5
    WHEN _new_xp >= 900 THEN 4
    WHEN _new_xp >= 400 THEN 3
    WHEN _new_xp >= 150 THEN 2
    ELSE 1
  END;

  -- Update level if changed
  IF _new_level != _old_level THEN
    UPDATE partner_gamification SET level = _new_level WHERE partner_id = _partner_id;
  END IF;

  -- Log XP
  INSERT INTO partner_xp_log (partner_id, xp_amount, reason, reference_id)
  VALUES (_partner_id, _xp_amount, _reason, _reference_id);

  -- Check badges
  -- legendary (level 5)
  IF _new_level >= 5 THEN
    IF (SELECT award_partner_badge(_partner_id, 'legendary')) THEN
      _badges_awarded := array_append(_badges_awarded, 'legendary');
    END IF;
  END IF;

  -- millionaire (total_earned >= 50)
  SELECT total_earned INTO _total_earned FROM collaborator_balances WHERE collaborator_id = _partner_id;
  IF COALESCE(_total_earned, 0) >= 50 THEN
    IF (SELECT award_partner_badge(_partner_id, 'millionaire')) THEN
      _badges_awarded := array_append(_badges_awarded, 'millionaire');
    END IF;
  END IF;

  -- ai_master (10+ tool earnings)
  SELECT COUNT(*) INTO _tool_job_count FROM collaborator_tool_earnings WHERE collaborator_id = _partner_id;
  IF _tool_job_count >= 10 THEN
    IF (SELECT award_partner_badge(_partner_id, 'ai_master')) THEN
      _badges_awarded := array_append(_badges_awarded, 'ai_master');
    END IF;
  END IF;

  -- seedance_star (5+ seedance tool earnings)
  SELECT COUNT(*) INTO _seedance_job_count FROM collaborator_tool_earnings WHERE collaborator_id = _partner_id AND tool_table = 'seedance_jobs';
  IF _seedance_job_count >= 5 THEN
    IF (SELECT award_partner_badge(_partner_id, 'seedance_star')) THEN
      _badges_awarded := array_append(_badges_awarded, 'seedance_star');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'xp_added', _xp_amount,
    'new_xp_total', _new_xp,
    'new_level', _new_level,
    'level_changed', _new_level != _old_level,
    'badges_awarded', _badges_awarded
  );
END;
$$;

-- ===== RPC: update_partner_streak =====
CREATE OR REPLACE FUNCTION public.update_partner_streak(_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _today date := CURRENT_DATE;
  _current_month integer := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  _new_streak integer;
  _protection_used boolean := false;
  _xp_result jsonb;
BEGIN
  -- Ensure record exists
  INSERT INTO partner_gamification (partner_id)
  VALUES (_partner_id)
  ON CONFLICT (partner_id) DO NOTHING;

  SELECT current_streak, best_streak, streak_last_date, 
         streak_protection_available, streak_protection_used_month
  INTO _rec
  FROM partner_gamification WHERE partner_id = _partner_id;

  -- Reset protection monthly
  IF _rec.streak_protection_used_month IS NOT NULL AND _rec.streak_protection_used_month != _current_month THEN
    UPDATE partner_gamification 
    SET streak_protection_available = true, streak_protection_used_month = NULL
    WHERE partner_id = _partner_id;
    _rec.streak_protection_available := true;
  END IF;

  -- Already contributed today
  IF _rec.streak_last_date = _today THEN
    RETURN jsonb_build_object('streak', _rec.current_streak, 'changed', false);
  END IF;

  IF _rec.streak_last_date = _today - 1 THEN
    -- Consecutive day
    _new_streak := _rec.current_streak + 1;
  ELSIF _rec.streak_last_date = _today - 2 AND _rec.streak_protection_available THEN
    -- Missed 1 day, use protection
    _new_streak := _rec.current_streak + 1;
    _protection_used := true;
    UPDATE partner_gamification 
    SET streak_protection_available = false, streak_protection_used_month = _current_month
    WHERE partner_id = _partner_id;
  ELSE
    -- Streak broken
    _new_streak := 1;
  END IF;

  UPDATE partner_gamification
  SET current_streak = _new_streak,
      best_streak = GREATEST(COALESCE(best_streak, 0), _new_streak),
      streak_last_date = _today,
      updated_at = now()
  WHERE partner_id = _partner_id;

  -- Streak milestones
  IF _new_streak = 3 THEN
    PERFORM add_partner_xp(_partner_id, 20, 'streak_3_dias');
  ELSIF _new_streak = 7 THEN
    PERFORM add_partner_xp(_partner_id, 80, 'streak_7_dias');
    PERFORM award_partner_badge(_partner_id, 'on_fire');
  ELSIF _new_streak = 14 THEN
    PERFORM add_partner_xp(_partner_id, 200, 'streak_14_dias');
  ELSIF _new_streak = 30 THEN
    PERFORM add_partner_xp(_partner_id, 500, 'streak_30_dias');
  END IF;

  RETURN jsonb_build_object(
    'streak', _new_streak,
    'changed', true,
    'protection_used', _protection_used
  );
END;
$$;

-- ===== Helper: update challenge progress =====
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
  _partner_id uuid,
  _challenge_type text,
  _increment_count integer DEFAULT 1,
  _increment_value numeric DEFAULT 0,
  _category text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _challenge RECORD;
  _progress RECORD;
BEGIN
  FOR _challenge IN
    SELECT id, target_count, target_value, challenge_type, xp_reward, category_target
    FROM partner_weekly_challenges
    WHERE is_active = true
      AND CURRENT_DATE BETWEEN week_start AND week_end
      AND challenge_type = _challenge_type
      AND (_challenge_type != 'send_category' OR category_target = _category)
  LOOP
    -- Upsert progress
    INSERT INTO partner_challenge_progress (partner_id, challenge_id, current_count, current_value)
    VALUES (_partner_id, _challenge.id, _increment_count, _increment_value)
    ON CONFLICT (partner_id, challenge_id) DO UPDATE
    SET current_count = partner_challenge_progress.current_count + _increment_count,
        current_value = partner_challenge_progress.current_value + _increment_value;

    -- Check completion
    SELECT current_count, current_value, completed, xp_awarded
    INTO _progress
    FROM partner_challenge_progress
    WHERE partner_id = _partner_id AND challenge_id = _challenge.id;

    IF NOT _progress.completed THEN
      IF (_challenge.challenge_type = 'earn_tool_value' AND _progress.current_value >= COALESCE(_challenge.target_value, 0))
         OR (_challenge.challenge_type != 'earn_tool_value' AND _progress.current_count >= _challenge.target_count)
      THEN
        UPDATE partner_challenge_progress
        SET completed = true, completed_at = now()
        WHERE partner_id = _partner_id AND challenge_id = _challenge.id;

        IF NOT _progress.xp_awarded THEN
          PERFORM add_partner_xp(_partner_id, _challenge.xp_reward, 'desafio_semanal', _challenge.id::text);
          UPDATE partner_challenge_progress
          SET xp_awarded = true
          WHERE partner_id = _partner_id AND challenge_id = _challenge.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ===== UPDATE register_collaborator_unlock =====
CREATE OR REPLACE FUNCTION public.register_collaborator_unlock(
  _collaborator_id uuid,
  _prompt_id text,
  _prompt_title text,
  _device_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _device_already_unlocked BOOLEAN;
  _amount NUMERIC;
  _partner_level integer;
  _rows_affected INT;
  _daily_unlock_count INT;
  _max_daily_unlocks INT := 50;
  _collab_daily_count INT;
  _prompt_total_unlocks INT;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  IF _user_id = _collaborator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_unlock_blocked');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM partners WHERE id = _collaborator_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_collaborator');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM partner_prompts 
    WHERE id::text = _prompt_id 
      AND partner_id = _collaborator_id 
      AND approved = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt');
  END IF;
  
  SELECT COUNT(*) INTO _daily_unlock_count
  FROM collaborator_unlock_earnings
  WHERE user_id = _user_id AND unlock_date = CURRENT_DATE;
  
  IF _daily_unlock_count >= _max_daily_unlocks THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM collaborator_unlock_earnings
    WHERE user_id = _user_id AND prompt_id = _prompt_id AND unlock_date = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
  
  IF _device_fingerprint IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM collaborator_unlock_earnings
      WHERE device_fingerprint = _device_fingerprint 
        AND prompt_id = _prompt_id 
        AND unlock_date = CURRENT_DATE
    ) INTO _device_already_unlocked;
    
    IF _device_already_unlocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'device_already_unlocked');
    END IF;
  END IF;

  -- Dynamic amount based on partner level
  SELECT COALESCE(level, 1) INTO _partner_level FROM partner_gamification WHERE partner_id = _collaborator_id;
  _amount := CASE COALESCE(_partner_level, 1)
    WHEN 5 THEN 0.12
    WHEN 4 THEN 0.10
    WHEN 3 THEN 0.07
    WHEN 2 THEN 0.07
    ELSE 0.05
  END;
  
  INSERT INTO collaborator_unlock_earnings (collaborator_id, user_id, prompt_id, prompt_title, amount, device_fingerprint)
  VALUES (_collaborator_id, _user_id, _prompt_id, _prompt_title, _amount, _device_fingerprint)
  ON CONFLICT (user_id, prompt_id, unlock_date) DO NOTHING;
  
  GET DIAGNOSTICS _rows_affected = ROW_COUNT;
  
  IF _rows_affected > 0 THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_collaborator_id, _amount, 1)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        total_unlocks = collaborator_balances.total_unlocks + 1,
        updated_at = now();

    -- XP: +2 per unlock
    PERFORM add_partner_xp(_collaborator_id, 2, 'desbloqueio_recebido', _prompt_id);

    -- Bonus: 10 unlocks same day for this collaborator
    SELECT COUNT(*) INTO _collab_daily_count
    FROM collaborator_unlock_earnings
    WHERE collaborator_id = _collaborator_id AND unlock_date = CURRENT_DATE;
    
    IF _collab_daily_count = 10 THEN
      PERFORM add_partner_xp(_collaborator_id, 25, 'bonus_10_desbloqueios_dia');
    END IF;

    -- Milestone: total unlocks for this prompt
    SELECT COUNT(*) INTO _prompt_total_unlocks
    FROM collaborator_unlock_earnings
    WHERE collaborator_id = _collaborator_id AND prompt_id = _prompt_id;

    IF _prompt_total_unlocks = 50 THEN
      PERFORM add_partner_xp(_collaborator_id, 100, 'prompt_50_desbloqueios', _prompt_id);
    ELSIF _prompt_total_unlocks = 100 THEN
      PERFORM add_partner_xp(_collaborator_id, 150, 'prompt_100_desbloqueios', _prompt_id);
      PERFORM award_partner_badge(_collaborator_id, 'viral');
    END IF;

    -- Update challenge progress
    PERFORM update_challenge_progress(_collaborator_id, 'get_unlocks', 1, 0);
    
    RETURN jsonb_build_object('success', true, 'amount', _amount);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked_today');
  END IF;
END;
$$;

-- ===== UPDATE register_collaborator_tool_earning =====
CREATE OR REPLACE FUNCTION public.register_collaborator_tool_earning(
  _job_id text,
  _tool_table text,
  _prompt_id text,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id UUID;
  _prompt_title TEXT;
  _amount NUMERIC;
  _tool_name TEXT;
  _rows_affected INT;
  _xp_amount INT;
BEGIN
  SELECT earning_per_use, tool_display_name INTO _amount, _tool_name
  FROM collaborator_tool_rates
  WHERE tool_table = _tool_table AND is_active = true;
  
  IF _amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'tool_not_configured');
  END IF;
  
  SELECT pp.partner_id, pp.title INTO _partner_id, _prompt_title
  FROM partner_prompts pp
  JOIN partners p ON p.id = pp.partner_id
  WHERE pp.id::text = _prompt_id
    AND pp.approved = true
    AND p.is_active = true;
  
  IF _partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_prompt_or_partner');
  END IF;
  
  IF _user_id IN (SELECT user_id FROM partners WHERE id = _partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_usage_blocked');
  END IF;
  
  INSERT INTO collaborator_tool_earnings (collaborator_id, user_id, job_id, tool_table, prompt_id, prompt_title, amount)
  VALUES (_partner_id, _user_id, _job_id, _tool_table, _prompt_id, _prompt_title, _amount)
  ON CONFLICT (job_id, tool_table) DO NOTHING;
  
  GET DIAGNOSTICS _rows_affected = ROW_COUNT;
  
  IF _rows_affected > 0 THEN
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (_partner_id, _amount, 0)
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = collaborator_balances.total_earned + _amount,
        updated_at = now();

    -- XP based on tool type
    _xp_amount := CASE _tool_table
      WHEN 'seedance_jobs' THEN 20
      WHEN 'movieled_maker_jobs' THEN 12
      ELSE 8
    END;
    PERFORM add_partner_xp(_partner_id, _xp_amount, 'uso_ferramenta_' || _tool_table, _job_id);

    -- Update challenge progress
    PERFORM update_challenge_progress(_partner_id, 'get_tool_uses', 1, 0);
    PERFORM update_challenge_progress(_partner_id, 'earn_tool_value', 0, _amount);
    
    RETURN jsonb_build_object('success', true, 'amount', _amount, 'tool', _tool_name, 'partner_id', _partner_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END IF;
END;
$$;

-- ===== TRIGGERS =====

-- Trigger: prompt inserted
CREATE OR REPLACE FUNCTION public.trigger_partner_prompt_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update streak
  PERFORM update_partner_streak(NEW.partner_id);
  -- +10 XP for sending prompt
  PERFORM add_partner_xp(NEW.partner_id, 10, 'prompt_enviado', NEW.id::text);
  -- Update challenges
  PERFORM update_challenge_progress(NEW.partner_id, 'send_prompts', 1, 0);
  IF NEW.category IS NOT NULL THEN
    PERFORM update_challenge_progress(NEW.partner_id, 'send_category', 1, 0, NEW.category);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_prompt_inserted
  AFTER INSERT ON public.partner_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_partner_prompt_inserted();

-- Trigger: prompt approved
CREATE OR REPLACE FUNCTION public.trigger_partner_prompt_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _approved_count integer;
BEGIN
  IF OLD.approved IS DISTINCT FROM NEW.approved AND NEW.approved = true THEN
    -- +50 XP for approval
    PERFORM add_partner_xp(NEW.partner_id, 50, 'prompt_aprovado', NEW.id::text);
    
    -- Count approved prompts for badges
    SELECT COUNT(*) INTO _approved_count
    FROM partner_prompts WHERE partner_id = NEW.partner_id AND approved = true;
    
    IF _approved_count = 1 THEN
      PERFORM award_partner_badge(NEW.partner_id, 'first_prompt');
    END IF;
    IF _approved_count >= 50 THEN
      PERFORM award_partner_badge(NEW.partner_id, 'diamond');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_prompt_approved
  AFTER UPDATE ON public.partner_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_partner_prompt_approved();

-- ===== SEED: 5 challenges for current week =====
INSERT INTO public.partner_weekly_challenges (title, description, challenge_type, target_count, target_value, category_target, xp_reward, week_start, week_end)
VALUES
  ('Envie 3 prompts essa semana', 'Contribua com 3 novos prompts para a biblioteca', 'send_prompts', 3, NULL, NULL, 30, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
  ('Tenha 20 desbloqueios essa semana', 'Seus prompts precisam ser desbloqueados 20 vezes', 'get_unlocks', 20, NULL, NULL, 50, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
  ('Envie 1 prompt em qualquer categoria', 'Envie pelo menos 1 prompt novo', 'send_prompts', 1, NULL, NULL, 40, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
  ('Tenha seu prompt usado em 2 ferramentas', 'Seus prompts precisam ser usados como referência em 2 ferramentas de IA', 'get_tool_uses', 2, NULL, NULL, 60, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
  ('Ganhe R$3 em usos de ferramentas', 'Acumule R$3,00 em ganhos por uso nas ferramentas de IA', 'earn_tool_value', 1, 3.00, NULL, 80, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + interval '6 days')::date);
