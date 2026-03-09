import { DashboardOrder } from "./useSalesDashboard";
import { ShoppingBag } from "lucide-react";

interface Props {
  orders: DashboardOrder[];
  approved: DashboardOrder[];
  isLoading: boolean;
}

const COLORS = ["hsl(142, 71%, 45%)", "hsl(199, 89%, 48%)", "hsl(45, 93%, 47%)", "hsl(330, 81%, 60%)", "hsl(263, 70%, 50%)", "hsl(174, 72%, 46%)"];

export default function SalesByProduct({ orders, approved, isLoading }: Props) {
  // Group ALL orders by product name
  const grouped: Record<string, { total: number; paid: number }> = {};
  orders.forEach((o) => {
    const name = o.product_title || "Desconhecido";
    if (!grouped[name]) grouped[name] = { total: 0, paid: 0 };
    grouped[name].total += 1;
  });
  approved.forEach((o) => {
    const name = o.product_title || "Desconhecido";
    if (!grouped[name]) grouped[name] = { total: 0, paid: 0 };
    grouped[name].paid += 1;
  });

  const data = Object.entries(grouped)
    .map(([name, { total, paid }]) => ({ name, total, paid }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Vendas por Produto</h3>
      </div>
      {isLoading || data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background"
                style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}40` }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{d.name}</p>
              </div>
              <span className="text-xs text-emerald-400 tabular-nums">{d.paid} apr.</span>
              <span className="text-sm font-bold text-foreground w-8 text-right tabular-nums">{d.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
