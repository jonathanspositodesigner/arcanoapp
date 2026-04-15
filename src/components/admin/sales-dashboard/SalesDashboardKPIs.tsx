import { DollarSign, TrendingUp, BarChart3, Wallet, Receipt, Cpu } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { DashboardOrder } from "./useSalesDashboard";
import { useMemo } from "react";

interface Props {
  revenue: number;
  adSpend: number;
  platformFees: number;
  apiCosts: number;
  isLoading: boolean;
  approved?: DashboardOrder[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PlatformBreakdown {
  label: string;
  count: number;
  fees: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  greenn: "Greenn",
  hotmart: "Hotmart",
  pagarme: "Pagar.me",
  stripe: "Stripe",
};

function usePlatformBreakdown(approved?: DashboardOrder[]): PlatformBreakdown[] {
  return useMemo(() => {
    if (!approved?.length) return [];
    const map: Record<string, { count: number; fees: number }> = {};
    for (const o of approved) {
      const platform = (o.source_platform || "unknown").toLowerCase();
      if (!map[platform]) map[platform] = { count: 0, fees: 0 };
      map[platform].count++;
      if (platform === "greenn") {
        map[platform].fees += o.amount * 0.0499 + 1.0;
      } else if (platform === "hotmart") {
        map[platform].fees += o.amount * 0.099 + 1.0;
      } else if (platform === "stripe") {
        map[platform].fees += o.amount - (o.net_amount ?? o.amount);
      } else {
        map[platform].fees += o.amount - (o.net_amount ?? o.amount);
      }
    }
    return Object.entries(map)
      .map(([key, val]) => ({
        label: PLATFORM_LABELS[key] || key,
        count: val.count,
        fees: val.fees,
      }))
      .sort((a, b) => b.fees - a.fees);
  }, [approved]);
}

const cards = [
  { key: "revenue", label: "Faturamento Líquido", icon: DollarSign, gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", valueColor: "text-emerald-400" },
  { key: "adSpend", label: "Gastos com Anúncios", icon: Wallet, gradient: "from-orange-500/20 to-orange-500/5", iconBg: "bg-orange-500/20", iconColor: "text-orange-400", valueColor: "text-orange-400" },
  { key: "platformFees", label: "Taxas de Plataformas", icon: Receipt, gradient: "from-rose-500/20 to-rose-500/5", iconBg: "bg-rose-500/20", iconColor: "text-rose-400", valueColor: "text-rose-400" },
  { key: "apiCosts", label: "Custos de API (IA)", icon: Cpu, gradient: "from-violet-500/20 to-violet-500/5", iconBg: "bg-violet-500/20", iconColor: "text-violet-400", valueColor: "text-violet-400" },
  { key: "roi", label: "ROI", icon: TrendingUp, gradient: "from-blue-500/20 to-blue-500/5", iconBg: "bg-blue-500/20", iconColor: "text-blue-400", valueColor: "text-blue-400" },
  { key: "profit", label: "Lucro Real", icon: BarChart3, gradient: "from-slate-500/20 to-slate-400/5", iconBg: "bg-accent0/20", iconColor: "text-muted-foreground", valueColor: "text-muted-foreground" },
];

export default function SalesDashboardKPIs({ revenue, adSpend, platformFees, apiCosts, isLoading, approved }: Props) {
  const totalCosts = adSpend + platformFees + apiCosts;
  const profit = revenue - totalCosts;
  const roi = totalCosts > 0 ? (revenue / totalCosts) : 0;
  const breakdown = usePlatformBreakdown(approved);

  const values: Record<string, string> = {
    revenue: formatCurrency(revenue),
    adSpend: adSpend > 0 ? formatCurrency(adSpend) : "—",
    platformFees: platformFees > 0 ? formatCurrency(platformFees) : "—",
    apiCosts: apiCosts > 0 ? formatCurrency(apiCosts) : "—",
    roi: totalCosts > 0 ? `${roi.toFixed(2)}x` : "—",
    profit: totalCosts > 0 ? formatCurrency(profit) : "—",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const cardContent = (
          <div
            className={`relative rounded-xl border border-border bg-gradient-to-br ${c.gradient} backdrop-blur-sm p-4 md:p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-1.5 rounded-lg ${c.iconBg}`}>
                <c.icon className={`h-4 w-4 ${c.iconColor}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold ${c.valueColor} ${isLoading ? "animate-pulse" : ""}`}>
              {isLoading ? "—" : values[c.key]}
            </p>
          </div>
        );

        if (c.key === "platformFees" && breakdown.length > 0 && !isLoading) {
          return (
            <HoverCard key={c.key} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                {cardContent}
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-0" side="bottom" align="center">
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Taxas por plataforma</p>
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{b.label}</span>
                        <span className="text-[11px] text-muted-foreground">({b.count} vendas)</span>
                      </div>
                      <span className="font-semibold text-rose-400">{formatCurrency(b.fees)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-rose-400">{formatCurrency(platformFees)}</span>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        }

        return <div key={c.key}>{cardContent}</div>;
      })}
    </div>
  );
}
