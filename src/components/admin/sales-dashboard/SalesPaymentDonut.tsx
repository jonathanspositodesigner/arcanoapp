import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardOrder } from "./useSalesDashboard";
import { CreditCard } from "lucide-react";

interface Props {
  approved: DashboardOrder[];
  isLoading: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  account_money: "Saldo MP",
  ticket: "Boleto",
};

const COLORS = ["hsl(142, 71%, 45%)", "hsl(199, 89%, 48%)", "hsl(45, 93%, 47%)", "hsl(330, 81%, 60%)", "hsl(263, 70%, 50%)"];

function getLabel(method: string | null) {
  if (!method) return "N/A";
  return PAYMENT_LABELS[method] || method;
}

export default function SalesPaymentDonut({ approved, isLoading }: Props) {
  const grouped: Record<string, number> = {};
  approved.forEach((o) => {
    const label = getLabel(o.payment_method);
    grouped[label] = (grouped[label] || 0) + 1;
  });

  const data = Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = approved.length;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Vendas por Pagamento</h3>
      </div>
      {isLoading || data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <span className="text-[10px] text-muted-foreground">vendas</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name} ({((d.value / total) * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
