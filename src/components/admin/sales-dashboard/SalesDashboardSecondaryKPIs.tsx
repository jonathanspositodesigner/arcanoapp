import { DashboardOrder } from "./useSalesDashboard";
import { Info } from "lucide-react";

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
    { label: "CPA", value: adSpend > 0 ? fmt(cpa) : "—", color: "text-blue-400" },
    { label: "Chargeback", value: `${cbRate.toFixed(1)}%`, color: "text-rose-400" },
    { label: "Margem", value: adSpend > 0 ? `${margin.toFixed(1)}%` : "—", color: "text-emerald-400" },
    { label: "Reembolsados", value: fmt(refundedTotal), color: "text-rose-400" },
    { label: "Pendentes", value: fmt(pendingTotal), color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-3 md:p-4"
        >
          <Info className="absolute top-2.5 right-2.5 h-3 w-3 text-muted-foreground/40" />
          <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
          <p className={`text-lg font-bold mt-1 ${item.color} ${isLoading ? "animate-pulse" : ""}`}>
            {isLoading ? "—" : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
