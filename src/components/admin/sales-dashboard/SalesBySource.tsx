import { DashboardOrder } from "./useSalesDashboard";

interface Props {
  approved: DashboardOrder[];
  isLoading: boolean;
}

function getSource(order: DashboardOrder): string {
  const utm = order.utm_data;
  if (utm?.utm_source) return utm.utm_source;
  if (utm?.referrer) return utm.referrer;
  return "N/A";
}

const COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];

export default function SalesBySource({ approved, isLoading }: Props) {
  const grouped: Record<string, number> = {};
  approved.forEach((o) => {
    const src = getSource(o);
    grouped[src] = (grouped[src] || 0) + 1;
  });

  const data = Object.entries(grouped)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = approved.length || 1;

  return (
    <div className="rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Fonte</h3>
      {isLoading || data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((d, i) => {
            const pct = ((d.count / total) * 100).toFixed(0);
            return (
              <div key={d.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{d.name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{pct}%</span>
                <span className="text-sm font-bold text-foreground w-8 text-right">{d.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
