import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardOrder } from "./useSalesDashboard";

interface Props {
  approved: DashboardOrder[];
  isLoading: boolean;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function SalesByWeekday({ approved, isLoading }: Props) {
  const weekdays = DAYS.map((day) => ({ day, count: 0 }));

  approved.forEach((o) => {
    const d = new Date(o.paid_at || o.created_at);
    weekdays[d.getDay()].count++;
  });

  return (
    <div className="rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Dia da Semana</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekdays}>
            <XAxis
              dataKey="day"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
