-- 1) Drop the unused 7-arg overload of register_collaborator_tool_earning to remove ambiguity.
--    All callers (seedance-poll, seedance-recovery, runninghub-queue-manager) use the 4-arg version.
DROP FUNCTION IF EXISTS public.register_collaborator_tool_earning(
  uuid, uuid, text, text, text, text, text
);

-- 2) Rewrite reconcile_collaborator_balances to sum from ALL 3 sources of truth
--    (unlocks + tool earnings + bonuses). Previously only summed unlocks, which
--    caused tool earnings to be wiped from the balance after reconciliation.
CREATE OR REPLACE FUNCTION public.reconcile_collaborator_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _fixed INT := 0;
  _rec RECORD;
BEGIN
  -- Only admins can run this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  -- For each collaborator, recalculate from ALL sources of truth:
  --   total_earned = SUM(unlock_earnings) + SUM(tool_earnings) + SUM(bonus_payments)
  --   total_unlocks = COUNT(unlock_earnings)  [keeps semantic meaning: prompts copiados]
  FOR _rec IN
    WITH all_collabs AS (
      SELECT collaborator_id FROM collaborator_unlock_earnings
      UNION
      SELECT collaborator_id FROM collaborator_tool_earnings
      UNION
      SELECT partner_id AS collaborator_id FROM partner_bonus_payments
    ),
    unlock_agg AS (
      SELECT collaborator_id,
             COALESCE(SUM(amount), 0) AS s,
             COUNT(*) AS c
      FROM collaborator_unlock_earnings
      GROUP BY collaborator_id
    ),
    tool_agg AS (
      SELECT collaborator_id,
             COALESCE(SUM(amount), 0) AS s
      FROM collaborator_tool_earnings
      GROUP BY collaborator_id
    ),
    bonus_agg AS (
      SELECT partner_id AS collaborator_id,
             COALESCE(SUM(amount), 0) AS s
      FROM partner_bonus_payments
      GROUP BY partner_id
    )
    SELECT
      ac.collaborator_id,
      COALESCE(u.s, 0) + COALESCE(t.s, 0) + COALESCE(b.s, 0) AS real_earned,
      COALESCE(u.c, 0) AS real_unlocks
    FROM all_collabs ac
    LEFT JOIN unlock_agg u ON u.collaborator_id = ac.collaborator_id
    LEFT JOIN tool_agg t ON t.collaborator_id = ac.collaborator_id
    LEFT JOIN bonus_agg b ON b.collaborator_id = ac.collaborator_id
  LOOP
    INSERT INTO collaborator_balances (collaborator_id, total_earned, total_unlocks, updated_at)
    VALUES (_rec.collaborator_id, _rec.real_earned, _rec.real_unlocks, now())
    ON CONFLICT (collaborator_id) DO UPDATE
    SET total_earned = _rec.real_earned,
        total_unlocks = _rec.real_unlocks,
        updated_at = now()
    WHERE collaborator_balances.total_earned != _rec.real_earned
       OR collaborator_balances.total_unlocks != _rec.real_unlocks;

    IF FOUND THEN
      _fixed := _fixed + 1;
    END IF;
  END LOOP;

  -- Remove orphaned balances (no earnings of any kind exist for that collaborator)
  DELETE FROM collaborator_balances
  WHERE collaborator_id NOT IN (
    SELECT collaborator_id FROM collaborator_unlock_earnings
    UNION
    SELECT collaborator_id FROM collaborator_tool_earnings
    UNION
    SELECT partner_id FROM partner_bonus_payments
  );

  RETURN jsonb_build_object('success', true, 'fixed', _fixed);
END;
$function$;