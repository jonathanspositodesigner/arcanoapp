import { useState } from "react";
import { DashboardOrder } from "./useSalesDashboard";
import { Target, AlertTriangle, TrendingDown, RefreshCw, Clock, ExternalLink } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  orders: DashboardOrder[];
  approved: DashboardOrder[];
  refunded: DashboardOrder[];
  pending: DashboardOrder[];
  revenue: number;
  refundedTotal: number;
  pendingTotal: number;
  adSpend: number;
  platformFees: number;
  isLoading: boolean;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR });
}

function getPlatformLabel(order: DashboardOrder) {
  const sp = order.source_platform?.toLowerCase();
  if (sp === "greenn") return "Greenn";
  if (sp === "hotmart") return "Hotmart";
  if (sp === "pagarme" || sp === "asaas") return "Pagar.me";
  if (sp === "mercadopago") return "Mercado Pago";
  return sp || "—";
}

function RefundedPreviewRow({ order }: { order: DashboardOrder }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{order.user_email}</p>
        <p className="text-[10px] text-muted-foreground truncate">{order.product_title}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-rose-400">{fmt(order.amount)}</p>
        <p className="text-[10px] text-muted-foreground">{fmtDate(order.created_at)}</p>
      </div>
    </div>
  );
}

export default function SalesDashboardSecondaryKPIs({
  orders, approved, refunded, pending,
  revenue, refundedTotal, pendingTotal, adSpend, platformFees, isLoading,
}: Props) {
  const [showRefundedModal, setShowRefundedModal] = useState(false);

  const cpa = adSpend > 0 && approved.length > 0 ? adSpend / approved.length : 0;
  const cbRate = orders.length > 0 ? (refunded.length / orders.length) * 100 : 0;
  const totalCosts = adSpend + platformFees;
  const margin = revenue > 0 && totalCosts > 0 ? ((revenue - totalCosts) / revenue) * 100 : 0;

  const sortedRefunded = [...refunded].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latest5 = sortedRefunded.slice(0, 5);

  const items = [
    { key: "cpa", label: "CPA", value: adSpend > 0 ? fmt(cpa) : "—", icon: Target, color: "text-sky-400", borderColor: "border-sky-500/20" },
    { key: "cb", label: "Chargeback", value: `${cbRate.toFixed(1)}%`, icon: AlertTriangle, color: "text-rose-400", borderColor: "border-rose-500/20" },
    { key: "margin", label: "Margem", value: adSpend > 0 ? `${margin.toFixed(1)}%` : "—", icon: TrendingDown, color: "text-teal-400", borderColor: "border-teal-500/20" },
    { key: "refunded", label: "Reembolsados", value: fmt(refundedTotal), icon: RefreshCw, color: "text-rose-400", borderColor: "border-rose-500/20" },
    { key: "pending", label: "Pendentes", value: fmt(pendingTotal), icon: Clock, color: "text-amber-400", borderColor: "border-amber-500/20" },
  ];

  const renderCard = (item: typeof items[0]) => (
    <div
      className={`rounded-xl border ${item.borderColor} bg-card/50 p-3 md:p-4 transition-all hover:bg-card/80`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
        <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
      </div>
      <p className={`text-lg font-bold ${item.color} ${isLoading ? "animate-pulse" : ""}`}>
        {isLoading ? "—" : item.value}
      </p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) =>
          item.key === "refunded" ? (
            <HoverCard key={item.key} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="cursor-pointer">{renderCard(item)}</div>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                align="center"
                className="w-80 p-3 bg-card border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">
                    Últimos reembolsos ({refunded.length} total)
                  </p>
                </div>
                {latest5.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Nenhum reembolso no período
                  </p>
                ) : (
                  <div className="space-y-0">
                    {latest5.map((order) => (
                      <RefundedPreviewRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
                {refunded.length > 0 && (
                  <button
                    onClick={() => setShowRefundedModal(true)}
                    className="flex items-center gap-1 mt-2 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors w-full justify-center"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver todas ({refunded.length})
                  </button>
                )}
              </HoverCardContent>
            </HoverCard>
          ) : (
            <div key={item.key}>{renderCard(item)}</div>
          )
        )}
      </div>

      <Dialog open={showRefundedModal} onOpenChange={setShowRefundedModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <RefreshCw className="h-4 w-4" />
              Vendas Reembolsadas ({refunded.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">Produto</th>
                    <th className="text-left py-2 px-2 font-medium">Valor</th>
                    <th className="text-left py-2 px-2 font-medium">Data Compra</th>
                    <th className="text-left py-2 px-2 font-medium">Data Reembolso</th>
                    <th className="text-left py-2 px-2 font-medium">Plataforma</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRefunded.map((order) => (
                    <tr key={order.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 text-foreground max-w-[160px] truncate">{order.user_email}</td>
                      <td className="py-2 px-2 text-foreground max-w-[140px] truncate">{order.product_title}</td>
                      <td className="py-2 px-2 text-rose-400 font-semibold whitespace-nowrap">{fmt(order.amount)}</td>
                      <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{fmtDate(order.paid_at || order.created_at)}</td>
                      <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{fmtDate(order.created_at)}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          {getPlatformLabel(order)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedRefunded.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum reembolso no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
