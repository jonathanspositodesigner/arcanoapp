
-- CORREÇÃO 1: RLS policies for service_role on gamification tables

CREATE POLICY "Service role manages gamification"
  ON public.partner_gamification FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role inserts badges"
  ON public.partner_badges FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role inserts xp log"
  ON public.partner_xp_log FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role manages challenge progress"
  ON public.partner_challenge_progress FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- CORREÇÃO 2: award_partner_badge using ROW_COUNT instead of FOUND

CREATE OR REPLACE FUNCTION public.award_partner_badge(_partner_id uuid, _badge_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows INT;
BEGIN
  INSERT INTO partner_badges (partner_id, badge_slug)
  VALUES (_partner_id, _badge_slug)
  ON CONFLICT (partner_id, badge_slug) DO NOTHING;
  
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;

-- CORREÇÃO 3: update_partner_streak - protection covers any absence (not just 1 day)

CREATE OR REPLACE FUNCTION public.update_partner_streak(_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _today date := CURRENT_DATE;
  _current_month text := to_char(CURRENT_DATE, 'YYYY-MM');
  _new_streak int;
  _protection_used boolean := false;
  _xp_awarded int := 0;
BEGIN
  SELECT * INTO _rec FROM partner_gamification WHERE partner_id = _partner_id;
  
  IF NOT FOUND THEN
    INSERT INTO partner_gamification (partner_id, current_streak, best_streak, streak_last_date)
    VALUES (_partner_id, 1, 1, _today);
    RETURN jsonb_build_object('streak', 1, 'changed', true, 'protection_used', false, 'xp_awarded', 0);
  END IF;

  IF _rec.streak_last_date IS NULL THEN
    _new_streak := 1;
  ELSIF _rec.streak_last_date = _today THEN
    RETURN jsonb_build_object('streak', _rec.current_streak, 'changed', false, 'protection_used', false, 'xp_awarded', 0);
  ELSIF _rec.streak_last_date = _today - 1 THEN
    _new_streak := _rec.current_streak + 1;
  ELSIF _rec.streak_protection_available AND (_rec.streak_protection_used_month IS NULL OR _rec.streak_protection_used_month != _current_month) THEN
    _new_streak := _rec.current_streak + 1;
    _protection_used := true;
    UPDATE partner_gamification
    SET streak_protection_available = false,
        streak_protection_used_month = _current_month
    WHERE partner_id = _partner_id;
  ELSE
    _new_streak := 1;
  END IF;

  UPDATE partner_gamification
  SET current_streak = _new_streak,
      best_streak = GREATEST(best_streak, _new_streak),
      streak_last_date = _today
  WHERE partner_id = _partner_id;

  -- Award XP for streak milestones
  IF _new_streak = 3 THEN
    PERFORM add_partner_xp(_partner_id, 20, 'streak_3_dias');
    _xp_awarded := 20;
  ELSIF _new_streak = 7 THEN
    PERFORM add_partner_xp(_partner_id, 50, 'streak_7_dias');
    _xp_awarded := 50;
  ELSIF _new_streak = 14 THEN
    PERFORM add_partner_xp(_partner_id, 100, 'streak_14_dias');
    _xp_awarded := 100;
  ELSIF _new_streak = 30 THEN
    PERFORM add_partner_xp(_partner_id, 200, 'streak_30_dias');
    _xp_awarded := 200;
  END IF;

  RETURN jsonb_build_object('streak', _new_streak, 'changed', true, 'protection_used', _protection_used, 'xp_awarded', _xp_awarded);
END;
$$;

-- CORREÇÃO 4: get_weekly_ranking RPC

CREATE OR REPLACE FUNCTION public.get_weekly_ranking()
RETURNS TABLE(partner_id uuid, partner_name text, week_total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_start AS (
    SELECT (date_trunc('week', CURRENT_DATE))::date AS ws
  ),
  unlock_totals AS (
    SELECT collaborator_id, SUM(amount) AS total
    FROM collaborator_unlock_earnings
    WHERE unlocked_at >= (SELECT ws FROM week_start)::timestamptz
    GROUP BY collaborator_id
  ),
  tool_totals AS (
    SELECT collaborator_id, SUM(amount) AS total
    FROM collaborator_tool_earnings
    WHERE created_at >= (SELECT ws FROM week_start)::timestamptz
    GROUP BY collaborator_id
  ),
  combined AS (
    SELECT COALESCE(u.collaborator_id, t.collaborator_id) AS cid,
           COALESCE(u.total, 0) + COALESCE(t.total, 0) AS total
    FROM unlock_totals u
    FULL OUTER JOIN tool_totals t ON t.collaborator_id = u.collaborator_id
  )
  SELECT c.cid, COALESCE(p.name, 'Colaborador')::text, c.total
  FROM combined c
  LEFT JOIN partners p ON p.id = c.cid
  ORDER BY c.total DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_ranking() TO authenticated;
