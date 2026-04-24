-- 1) Admins precisam ler ganhos de ferramentas de todos os colaboradores
CREATE POLICY "Admins can view all tool earnings"
ON public.collaborator_tool_earnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Trigger para manter collaborator_balances em sincronia quando bônus são lançados
CREATE OR REPLACE FUNCTION public.trg_sync_balance_on_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.collaborator_balances (collaborator_id, total_earned, total_unlocks)
    VALUES (NEW.partner_id, NEW.amount, 0)
    ON CONFLICT (collaborator_id) DO UPDATE
      SET total_earned = public.collaborator_balances.total_earned + NEW.amount,
          updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collaborator_balances
       SET total_earned = GREATEST(0, total_earned - OLD.amount),
           updated_at = now()
     WHERE collaborator_id = OLD.partner_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_balance_on_bonus_ins ON public.partner_bonus_payments;
CREATE TRIGGER trg_sync_balance_on_bonus_ins
AFTER INSERT ON public.partner_bonus_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_balance_on_bonus();

DROP TRIGGER IF EXISTS trg_sync_balance_on_bonus_del ON public.partner_bonus_payments;
CREATE TRIGGER trg_sync_balance_on_bonus_del
AFTER DELETE ON public.partner_bonus_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_balance_on_bonus();

-- 3) Reconciliar saldos atuais com a soma real dos lançamentos
SELECT public.reconcile_collaborator_balances();