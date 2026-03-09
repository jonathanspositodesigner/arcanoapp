import { DashboardOrder } from "./useSalesDashboard";
import { CheckCircle } from "lucide-react";

interface Props {
  orders: DashboardOrder[];
  isLoading: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  account_money: "Saldo MP",
  ticket: "Boleto",
};

export default function SalesApprovalRate({ orders, isLoading }: Props) {
  const byMethod: Record<string, { total: number; approved: number }> = {};

  orders.forEach((o) => {
    const method = o.payment_method || "N/A";
    if (!byMethod[method]) byMethod[method] = { total: 0, approved: 0 };
    byMethod[method].total++;
    if (o.status === "paid") byMethod[method].approved++;
  });

  const data = Object.entries(byMethod)
    .map(([method, stats]) => ({
      label: PAYMENT_LABELS[method] || method,
      rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
      approved: stats.approved,
      total: stats.total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Taxa de Aprovação</h3>
      </div>
      {isLoading || data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{d.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/60 tabular-nums">
                  {d.approved}/{d.total}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    d.rate >= 80 ? "text-emerald-400" : d.rate >= 50 ? "text-amber-400" : "text-rose-400"
                  }`}
                >
                  {d.total >= 3 ? `${d.rate.toFixed(0)}%` : "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
