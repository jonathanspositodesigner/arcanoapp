import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SaleOrder } from "./useAdsCampaigns";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface UntrackedSalesDialogProps {
  sales: SaleOrder[];
}

export function UntrackedSalesDialog({ sales }: UntrackedSalesDialogProps) {
  if (sales.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors cursor-pointer">
          <AlertTriangle className="h-3 w-3" />
          {sales.length} vendas sem UTM
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            {sales.length} Vendas sem UTM do Facebook
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0">
                  <th className="text-left p-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Plataforma</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">UTM Source</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">UTM Medium</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">UTM Campaign</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const utmSource = s.utm_data?.utm_source || s.utm_data?.source || "—";
                  const utmMedium = s.utm_data?.utm_medium || s.utm_data?.medium || "—";
                  const utmCampaign = s.utm_data?.utm_campaign || s.utm_data?.campaign || "—";
                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/20">
                      <td className="p-2 whitespace-nowrap text-muted-foreground">{formatDate(s.paid_at || s.created_at)}</td>
                      <td className="p-2 truncate max-w-[180px]" title={s.user_email}>{s.user_email || "—"}</td>
                      <td className="p-2 truncate max-w-[150px]" title={s.product_title}>{s.product_title || "—"}</td>
                      <td className="p-2 text-right font-medium whitespace-nowrap">{formatCurrency(s.amount)}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{s.source_platform || "—"}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{utmSource}</td>
                      <td className="p-2 text-muted-foreground">{utmMedium}</td>
                      <td className="p-2 text-muted-foreground">{utmCampaign}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
