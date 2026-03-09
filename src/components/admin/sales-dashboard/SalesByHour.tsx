import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardOrder } from "./useSalesDashboard";
import { Clock } from "lucide-react";

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
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Vendas por Horário</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hours}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
