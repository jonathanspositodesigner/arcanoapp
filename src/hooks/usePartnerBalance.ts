/**
 * usePartnerBalance — fonte ÚNICA da verdade para o saldo do colaborador.
 *
 * Antes desta unificação havia divergência: o Dashboard exibia
 * `collaborator_balances.total_earned` (cache que ficava desatualizado quando
 * earnings eram estornados/ajustados), enquanto o Extrato somava os registros
 * reais. Resultado: telas mostravam valores diferentes (ex.: R$1,60 x R$1,44).
 *
 * Política agora: TODA UI voltada para o colaborador (Dashboard, Extrato,
 * Modal de Saque, etc.) deve consumir este hook. Os totais são derivados a
 * partir das tabelas de earnings reais:
 *   - collaborator_unlock_earnings  (desbloqueios diários)
 *   - collaborator_tool_earnings    (uso de ferramentas)
 *   - partner_bonus_payments        (bônus manuais do admin)
 * E os saques pagos vêm de `partner_withdrawals` (status = 'pago').
 *
 * `collaborator_balances` continua existindo como cache para queries admin
 * agregadas, mas NÃO é mais usado para mostrar saldo ao próprio colaborador.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerBalance {
  /** Soma real de TODOS os ganhos (unlocks + tools + bônus). */
  totalEarned: number;
  /** Soma de saques já pagos. */
  totalPaid: number;
  /** Saldo disponível para saque = totalEarned - totalPaid. Nunca negativo. */
  saldoDisponivel: number;
  /** Quantidade de prompts copiados (unlocks). */
  totalUnlocks: number;
  /** Quantidade de usos em ferramentas. */
  totalToolUses: number;
  /** Existe um saque pendente? */
  hasPendingWithdrawal: boolean;
  isLoading: boolean;
  refresh: () => void;
}

export const usePartnerBalance = (partnerId: string | null): PartnerBalance => {
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnlocks, setTotalUnlocks] = useState(0);
  const [totalToolUses, setTotalToolUses] = useState(0);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [unlocksRes, toolsRes, bonusRes, withdrawalsRes] = await Promise.all([
      supabase
        .from("collaborator_unlock_earnings")
        .select("amount")
        .eq("collaborator_id", partnerId),
      supabase
        .from("collaborator_tool_earnings")
        .select("amount")
        .eq("collaborator_id", partnerId),
      supabase
        .from("partner_bonus_payments" as any)
        .select("amount")
        .eq("partner_id", partnerId),
      supabase
        .from("partner_withdrawals")
        .select("valor_solicitado, status")
        .eq("partner_id", partnerId),
    ]);

    const sumUnlocks = (unlocksRes.data || []).reduce(
      (s, r: any) => s + Number(r.amount || 0),
      0
    );
    const sumTools = (toolsRes.data || []).reduce(
      (s, r: any) => s + Number(r.amount || 0),
      0
    );
    const sumBonus = ((bonusRes.data as any[]) || []).reduce(
      (s, r: any) => s + Number(r.amount || 0),
      0
    );
    const earned = sumUnlocks + sumTools + sumBonus;

    const withdrawals = withdrawalsRes.data || [];
    const paid = withdrawals
      .filter((w: any) => w.status === "pago")
      .reduce((s: number, w: any) => s + Number(w.valor_solicitado || 0), 0);
    const pending = withdrawals.some((w: any) => w.status === "pendente");

    setTotalEarned(earned);
    setTotalPaid(paid);
    setTotalUnlocks(unlocksRes.data?.length || 0);
    setTotalToolUses(toolsRes.data?.length || 0);
    setHasPendingWithdrawal(pending);
    setIsLoading(false);
  }, [partnerId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    totalEarned,
    totalPaid,
    saldoDisponivel: Math.max(0, totalEarned - totalPaid),
    totalUnlocks,
    totalToolUses,
    hasPendingWithdrawal,
    isLoading,
    refresh: fetchBalance,
  };
};