import { Info } from "lucide-react";

interface Props {
  metaClicks: number;
  metaLandingPageViews: number;
  metaInitiatedCheckouts: number;
  allOrdersCount: number;
  approvedCount: number;
  isLoading: boolean;
}

export default function SalesConversionFunnel({
  metaClicks, metaLandingPageViews, metaInitiatedCheckouts, totalOrders, approvedCount, isLoading
}: Props) {
  const steps = [
    { label: "Cliques", value: metaClicks },
    { label: "Vis. Página", value: metaLandingPageViews },
    { label: "ICs", value: metaInitiatedCheckouts },
    { label: "Vendas Inic.", value: totalOrders },
    { label: "Vendas Apr.", value: approvedCount },
  ];

  const max = Math.max(steps[0].value, 1);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground">Funil de Conversão (Meta Ads)</h3>
        <Info className="h-4 w-4 text-muted-foreground/40" />
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="relative">
          {/* Labels */}
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div key={step.label} className="flex-1 text-center">
                <span className="text-xs font-semibold text-muted-foreground">{step.label}</span>
              </div>
            ))}
          </div>

          {/* Funnel SVG */}
          <div className="relative h-28">
            <svg viewBox="0 0 1000 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(230, 80%, 60%)" />
                  <stop offset="40%" stopColor="hsl(250, 70%, 55%)" />
                  <stop offset="60%" stopColor="hsl(280, 60%, 50%)" />
                  <stop offset="80%" stopColor="hsl(320, 70%, 50%)" />
                  <stop offset="100%" stopColor="hsl(340, 80%, 55%)" />
                </linearGradient>
              </defs>
              {/* Funnel shape */}
              <path
                d={(() => {
                  const sectionWidth = 1000 / steps.length;
                  const centerY = 60;
                  const maxHeight = 55;
                  
                  const heights = steps.map(s => {
                    const pct = max > 0 ? s.value / max : 0;
                    return Math.max(pct * maxHeight, 4);
                  });

                  let topPath = `M 0 ${centerY - heights[0]}`;
                  for (let i = 1; i < steps.length; i++) {
                    const x = i * sectionWidth;
                    const prevH = heights[i - 1];
                    const currH = heights[i];
                    const cpX = x - sectionWidth * 0.3;
                    const cp2X = x + sectionWidth * 0.0;
                    topPath += ` C ${cpX} ${centerY - prevH}, ${cp2X} ${centerY - currH}, ${x} ${centerY - currH}`;
                  }
                  topPath += ` L 1000 ${centerY - heights[steps.length - 1]}`;

                  let bottomPath = `L 1000 ${centerY + heights[steps.length - 1]}`;
                  for (let i = steps.length - 2; i >= 0; i--) {
                    const x = (i + 1) * sectionWidth;
                    const nextH = heights[i + 1];
                    const currH = heights[i];
                    const cpX = x + sectionWidth * 0.0;
                    const cp2X = x - sectionWidth * 0.3;
                    bottomPath += ` C ${cpX} ${centerY + nextH}, ${cp2X} ${centerY + currH}, ${i * sectionWidth} ${centerY + currH}`;
                  }
                  bottomPath += ` L 0 ${centerY + heights[0]} Z`;

                  return topPath + " " + bottomPath;
                })()}
                fill="url(#funnelGradient)"
                opacity="0.85"
              />
              {/* Vertical dividers */}
              {steps.slice(1).map((_, i) => {
                const x = ((i + 1) * 1000) / steps.length;
                return (
                  <line
                    key={i}
                    x1={x} y1="0" x2={x} y2="120"
                    stroke="hsl(230, 30%, 30%)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.5"
                  />
                );
              })}
            </svg>

            {/* Percentage overlays */}
            <div className="absolute inset-0 flex">
              {steps.map((step) => {
                const pct = max > 0 ? ((step.value / max) * 100) : 0;
                return (
                  <div key={step.label} className="flex-1 flex items-center justify-center">
                    <span className="text-sm font-bold text-white drop-shadow-lg">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Values */}
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.label} className="flex-1 text-center">
                <span className="text-sm font-bold text-foreground">{step.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
