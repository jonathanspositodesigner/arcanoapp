import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardOrder } from "./useSalesDashboard";

interface Props {
  approved: DashboardOrder[];
  isLoading: boolean;
}

export default function SalesByHour({ approved, isLoading }: Props) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}:00`, count: 0 }));

  approved.forEach((o) => {
    const d = new Date(o.paid_at || o.created_at);
    hours[d.getHours()].count++;
  });

  return (
    <div className="rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Horário</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hours}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
