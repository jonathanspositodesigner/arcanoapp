import { DollarSign, TrendingUp, BarChart3, Wallet, Info } from "lucide-react";

interface Props {
  revenue: number;
  adSpend: number;
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const cards = [
  { key: "revenue", label: "Faturamento Líquido", icon: DollarSign, color: "text-emerald-400" },
  { key: "adSpend", label: "Gastos com Anúncios", icon: Wallet, color: "text-orange-400" },
  { key: "roi", label: "ROI", icon: TrendingUp, color: "text-emerald-400" },
  { key: "profit", label: "Lucro", icon: BarChart3, color: "text-emerald-400" },
];

export default function SalesDashboardKPIs({ revenue, adSpend, isLoading }: Props) {
  const profit = revenue - adSpend;
  const roi = adSpend > 0 ? ((profit / adSpend) * 100) : 0;

  const values: Record<string, string> = {
    revenue: formatCurrency(revenue),
    adSpend: adSpend > 0 ? formatCurrency(adSpend) : "—",
    roi: adSpend > 0 ? `${roi.toFixed(1)}%` : "—",
    profit: adSpend > 0 ? formatCurrency(profit) : "—",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className="relative rounded-xl border border-[hsl(220,40%,16%)] bg-[hsl(220,50%,6%)] p-4 md:p-5"
        >
          <Info className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/40" />
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
          </div>
          <p className={`text-xl md:text-2xl font-bold ${c.color} ${isLoading ? "animate-pulse" : ""}`}>
            {isLoading ? "—" : values[c.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
