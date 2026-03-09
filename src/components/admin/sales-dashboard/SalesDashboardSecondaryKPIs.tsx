import { DashboardOrder } from "./useSalesDashboard";
import { Target, AlertTriangle, TrendingDown, RefreshCw, Clock } from "lucide-react";

interface Props {
  orders: DashboardOrder[];
  approved: DashboardOrder[];
  refunded: DashboardOrder[];
  pending: DashboardOrder[];
  revenue: number;
  refundedTotal: number;
  pendingTotal: number;
  adSpend: number;
  isLoading: boolean;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SalesDashboardSecondaryKPIs({
  orders, approved, refunded, pending,
  revenue, refundedTotal, pendingTotal, adSpend, isLoading,
}: Props) {
  const cpa = adSpend > 0 && approved.length > 0 ? adSpend / approved.length : 0;
  const cbRate = orders.length > 0 ? (refunded.length / orders.length) * 100 : 0;
  const margin = revenue > 0 && adSpend > 0 ? ((revenue - adSpend) / revenue) * 100 : 0;

  const items = [
    { label: "CPA", value: adSpend > 0 ? fmt(cpa) : "—", icon: Target, color: "text-sky-400", borderColor: "border-sky-500/20" },
    { label: "Chargeback", value: `${cbRate.toFixed(1)}%`, icon: AlertTriangle, color: "text-rose-400", borderColor: "border-rose-500/20" },
    { label: "Margem", value: adSpend > 0 ? `${margin.toFixed(1)}%` : "—", icon: TrendingDown, color: "text-teal-400", borderColor: "border-teal-500/20" },
    { label: "Reembolsados", value: fmt(refundedTotal), icon: RefreshCw, color: "text-rose-400", borderColor: "border-rose-500/20" },
    { label: "Pendentes", value: fmt(pendingTotal), icon: Clock, color: "text-amber-400", borderColor: "border-amber-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border ${item.borderColor} bg-card/50 p-3 md:p-4 transition-all hover:bg-card/80`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
          </div>
          <p className={`text-lg font-bold ${item.color} ${isLoading ? "animate-pulse" : ""}`}>
            {isLoading ? "—" : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
