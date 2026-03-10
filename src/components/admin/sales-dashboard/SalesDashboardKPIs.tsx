import { DollarSign, TrendingUp, BarChart3, Wallet } from "lucide-react";

interface Props {
  revenue: number;
  adSpend: number;
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const cards = [
  { key: "revenue", label: "Faturamento Líquido", icon: DollarSign, gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", valueColor: "text-emerald-400" },
  { key: "adSpend", label: "Gastos com Anúncios", icon: Wallet, gradient: "from-orange-500/20 to-orange-500/5", iconBg: "bg-orange-500/20", iconColor: "text-orange-400", valueColor: "text-orange-400" },
  { key: "roi", label: "ROI", icon: TrendingUp, gradient: "from-blue-500/20 to-blue-500/5", iconBg: "bg-blue-500/20", iconColor: "text-blue-400", valueColor: "text-blue-400" },
  { key: "profit", label: "Lucro", icon: BarChart3, gradient: "from-violet-500/20 to-violet-500/5", iconBg: "bg-violet-500/20", iconColor: "text-violet-400", valueColor: "text-violet-400" },
];

export default function SalesDashboardKPIs({ revenue, adSpend, isLoading }: Props) {
  const profit = revenue - adSpend;
  const roi = adSpend > 0 ? (revenue / adSpend) : 0;

  const values: Record<string, string> = {
    revenue: formatCurrency(revenue),
    adSpend: adSpend > 0 ? formatCurrency(adSpend) : "—",
    roi: adSpend > 0 ? `${roi.toFixed(2)}x` : "—",
    profit: adSpend > 0 ? formatCurrency(profit) : "—",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.key}
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
      ))}
    </div>
  );
}
