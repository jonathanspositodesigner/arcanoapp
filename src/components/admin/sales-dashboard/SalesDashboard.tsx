import { useState, useCallback } from "react";
import { useSalesDashboard, PeriodPreset, getDateRange } from "./useSalesDashboard";
import SalesDashboardKPIs from "./SalesDashboardKPIs";
import SalesDashboardSecondaryKPIs from "./SalesDashboardSecondaryKPIs";
import SalesPaymentDonut from "./SalesPaymentDonut";
import SalesConversionFunnel from "./SalesConversionFunnel";
import SalesByProduct from "./SalesByProduct";
import SalesBySource from "./SalesBySource";
import SalesByHour from "./SalesByHour";
import SalesByWeekday from "./SalesByWeekday";
import SalesApprovalRate from "./SalesApprovalRate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, BarChart3, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "1y", label: "Último 1 ano" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Todo o período" },
  { value: "custom", label: "Personalizado" },
];

export default function SalesDashboard() {
  const {
    preset, setPreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    orders, approved, pending, refunded,
    revenue, refundedTotal, pendingTotal,
    platformFees, pageViews, adSpend, metaClicks, metaLandingPageViews, metaInitiatedCheckouts, abandonedCheckouts, isLoading, refetch,
  } = useSalesDashboard();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Calculate the date range to sync only what's needed
      const pad = (n: number) => String(n).padStart(2, "0");
      const { start, end } = getDateRange(preset, customStart, customEnd);
      const since = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const until = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      
      // Sync only the visible period from Meta Ads
      await supabase.functions.invoke("fetch-meta-ads", { 
        body: { action: "fetch", since, until } 
      });
      // Wait for all dashboard data to reload
      await refetch();
      toast.success("Dados atualizados!");
    } catch (e) {
      console.error("Error refreshing:", e);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, preset, customStart, customEnd]);

  const loading = isLoading || isRefreshing;

  return (
    <div className="space-y-5">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Dashboard de Vendas</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-card border-border"
            title="Atualizar dados"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="w-[180px] bg-card border-border text-card-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customStart ? format(customStart, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customEnd ? format(customEnd, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Primary KPIs */}
      <SalesDashboardKPIs revenue={revenue} adSpend={adSpend} isLoading={isLoading} />

      {/* Secondary KPIs */}
      <SalesDashboardSecondaryKPIs
        orders={orders} approved={approved} refunded={refunded} pending={pending}
        revenue={revenue} refundedTotal={refundedTotal} pendingTotal={pendingTotal}
        adSpend={adSpend} isLoading={isLoading}
      />

      {/* Donut + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesPaymentDonut approved={approved} isLoading={isLoading} />
        <SalesConversionFunnel
          metaClicks={metaClicks}
          metaLandingPageViews={metaLandingPageViews}
          metaInitiatedCheckouts={metaInitiatedCheckouts}
          allOrdersCount={orders.length}
          approvedCount={approved.length}
          isLoading={isLoading}
        />
      </div>

      {/* Product + Hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesByProduct approved={approved} isLoading={isLoading} />
        <SalesByHour approved={approved} isLoading={isLoading} />
      </div>

      {/* Source + Weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesBySource approved={approved} isLoading={isLoading} />
        <SalesByWeekday approved={approved} isLoading={isLoading} />
      </div>

      {/* Approval Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesApprovalRate orders={orders} isLoading={isLoading} />
      </div>
    </div>
  );
}
