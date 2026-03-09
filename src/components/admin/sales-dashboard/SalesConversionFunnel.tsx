import { Filter } from "lucide-react";

interface Props {
  pageViews: number;
  totalOrders: number;
  pendingCount: number;
  approvedCount: number;
  isLoading: boolean;
}

const STEP_COLORS = [
  { bar: "bg-blue-500", text: "text-blue-400" },
  { bar: "bg-cyan-500", text: "text-cyan-400" },
  { bar: "bg-amber-500", text: "text-amber-400" },
  { bar: "bg-emerald-500", text: "text-emerald-400" },
];

export default function SalesConversionFunnel({ pageViews, totalOrders, pendingCount, approvedCount, isLoading }: Props) {
  const steps = [
    { label: "Visitas", value: pageViews },
    { label: "Checkouts Iniciados", value: totalOrders },
    { label: "Vendas Pendentes", value: pendingCount },
    { label: "Vendas Aprovadas", value: approvedCount },
  ];

  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Funil de Conversão</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, i) => {
            const pct = max > 0 ? (step.value / max) * 100 : 0;
            const convFromPrev = i > 0 && steps[i - 1].value > 0
              ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
              : null;

            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{step.label}</span>
                  <div className="flex items-center gap-2">
                    {convFromPrev && (
                      <span className="text-[10px] text-muted-foreground/60">{convFromPrev}%</span>
                    )}
                    <span className={`text-sm font-bold ${STEP_COLORS[i].text}`}>{step.value}</span>
                  </div>
                </div>
                <div className="h-7 rounded-lg bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full ${STEP_COLORS[i].bar} rounded-lg transition-all duration-700 opacity-80`}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
