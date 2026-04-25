CREATE OR REPLACE FUNCTION public.update_partner_streak(_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _today date := CURRENT_DATE;
  -- streak_protection_used_month é integer; use mês numérico para evitar integer <> text
  _current_month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
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
$function$;