interface Props {
  pageViews: number;
  totalOrders: number;
  pendingCount: number;
  approvedCount: number;
  isLoading: boolean;
}

export default function SalesConversionFunnel({ pageViews, totalOrders, pendingCount, approvedCount, isLoading }: Props) {
  const steps = [
    { label: "Visitas", value: pageViews, color: "bg-blue-500" },
    { label: "Checkouts Iniciados", value: totalOrders, color: "bg-cyan-500" },
    { label: "Vendas Pendentes", value: pendingCount, color: "bg-amber-500" },
    { label: "Vendas Aprovadas", value: approvedCount, color: "bg-emerald-500" },
  ];

  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão</h3>
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
                    <span className="text-sm font-bold text-foreground">{step.value}</span>
                  </div>
                </div>
                <div className="h-6 rounded-md bg-[hsl(220,30%,12%)] overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-md transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
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
