import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Search, CalendarIcon, Megaphone, TrendingUp, TrendingDown, Info, ChevronRight, ArrowLeft, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Power } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdsCampaigns, AdsPeriod, CampaignWithSales } from "./ads/useAdsCampaigns";
import { useAdsHierarchy, AggregatedItem, AdsLevel } from "./ads/useAdsHierarchy";
import { UntrackedSalesDialog } from "./ads/UntrackedSalesDialog";

const PERIOD_OPTIONS: { value: AdsPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "custom", label: "Personalizado" },
];

type SortColumn = 
  | "status" | "name" | "daily_budget" | "total_spend" | "sales_count"
  | "cpa" | "revenue" | "profit" | "roi" | "roas"
  | "cpi" | "total_initiated_checkouts" | "total_landing_page_views"
  | "ctr" | "avg_cpc" | "total_clicks" | "avg_cpm" | "total_impressions";

type SortDirection = "asc" | "desc";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getItemValues(item: AggregatedItem | CampaignWithSales) {
  const isCampaign = "campaign_name" in item;
  const c = item as CampaignWithSales;
  const a = item as AggregatedItem;
  const name = isCampaign ? c.campaign_name : a.name;
  const status = isCampaign ? c.campaign_status : a.status;
  const spend = isCampaign ? c.total_spend : a.total_spend;
  const impressions = isCampaign ? c.total_impressions : a.total_impressions;
  const clicks = isCampaign ? c.total_clicks : a.total_clicks;
  const ic = isCampaign ? c.total_initiated_checkouts : a.total_initiated_checkouts;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpi = ic > 0 ? spend / ic : 0;
  return {
    name, status,
    daily_budget: isCampaign ? c.daily_budget : a.daily_budget,
    total_spend: spend,
    sales_count: isCampaign ? c.sales_count : a.sales_count,
    cpa: isCampaign ? c.cpa : a.cpa,
    revenue: isCampaign ? c.revenue : a.revenue,
    profit: isCampaign ? c.profit : a.profit,
    roi: isCampaign ? c.roi : a.roi,
    roas: isCampaign ? c.roas : a.roas,
    cpi, ctr,
    total_initiated_checkouts: ic,
    total_landing_page_views: isCampaign ? c.total_landing_page_views : a.total_landing_page_views,
    avg_cpc: isCampaign ? c.avg_cpc : a.avg_cpc,
    total_clicks: clicks,
    avg_cpm: isCampaign ? c.avg_cpm : a.avg_cpm,
    total_impressions: impressions,
  };
}

function sortItems<T extends AggregatedItem | CampaignWithSales>(items: T[], column: SortColumn | null, direction: SortDirection): T[] {
  if (!column) return items;
  return [...items].sort((a, b) => {
    const va = getItemValues(a);
    const vb = getItemValues(b);
    let cmp = 0;
    if (column === "name" || column === "status") {
      cmp = (va[column] || "").localeCompare(vb[column] || "");
    } else {
      cmp = (va[column] as number) - (vb[column] as number);
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

function StatusBadge({ 
  status, 
  objectId, 
  onToggle 
}: { 
  status: string; 
  objectId: string;
  onToggle?: (objectId: string, newStatus: string) => void;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const isActive = status === "ACTIVE";
  const isPaused = status === "PAUSED";
  const canToggle = (isActive || isPaused) && onToggle;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canToggle || isToggling) return;
    
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    setIsToggling(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-meta-ads", {
        body: { action: "update-status", object_id: objectId, new_status: newStatus },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      onToggle!(objectId, newStatus);
      toast.success(`Status alterado para ${newStatus === "ACTIVE" ? "Ativo" : "Pausado"}`);
    } catch (err: any) {
      console.error("Error toggling status:", err);
      toast.error("Erro ao alterar status: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Badge
      variant="outline"
      onClick={handleToggle}
      className={cn(
        "text-xs font-medium transition-all",
        isActive && "border-green-500/50 bg-green-500/10 text-green-400",
        isPaused && "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
        !isActive && !isPaused && "border-muted-foreground/30 text-muted-foreground",
        canToggle && "cursor-pointer hover:opacity-80",
        isToggling && "opacity-50"
      )}
    >
      {isToggling ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          {canToggle && <Power className="h-3 w-3 mr-1" />}
          {isActive ? "Ativo" : isPaused ? "Pausado" : status}
        </>
      )}
    </Badge>
  );
}

function SortableHeader({ 
  label, 
  tooltip, 
  column, 
  currentSort, 
  currentDirection, 
  onSort, 
  align = "right" 
}: { 
  label: string; 
  tooltip?: string; 
  column: SortColumn; 
  currentSort: SortColumn | null; 
  currentDirection: SortDirection; 
  onSort: (col: SortColumn) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSort === column;
  const SortIcon = isActive ? (currentDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors",
        isActive && "text-foreground"
      )}
      onClick={() => onSort(column)}
    >
      {label}
      <SortIcon className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-30")} />
      {tooltip && <Info className="h-3 w-3 opacity-50" />}
    </span>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MetricsTableHeader({ sortColumn, sortDirection, onSort }: { sortColumn: SortColumn | null; sortDirection: SortDirection; onSort: (col: SortColumn) => void }) {
  const sp = { currentSort: sortColumn, currentDirection: sortDirection, onSort };
  return (
    <tr className="border-b border-border bg-muted/30">
      <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10">
        <SortableHeader label="Status" column="status" align="left" {...sp} />
      </th>
      <th className="text-left p-3 font-medium text-muted-foreground sticky left-[72px] bg-muted/30 z-10">
        <SortableHeader label="Nome" column="name" align="left" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Orçamento" column="daily_budget" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Gastos" column="total_spend" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Vendas" column="sales_count" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="CPA" tooltip="Custo por aquisição (Gasto / Vendas)" column="cpa" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Faturamento" column="revenue" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Lucro" column="profit" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="ROI" column="roi" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="ROAS" column="roas" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="CPI" tooltip="Custo por checkout iniciado" column="cpi" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="IC" tooltip="Checkouts iniciados" column="total_initiated_checkouts" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Vis. de Pág." tooltip="Visualizações da página de destino" column="total_landing_page_views" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="CTR" tooltip="Taxa de cliques (Cliques / Impressões)" column="ctr" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="CPC" tooltip="Custo por clique" column="avg_cpc" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Cliques" column="total_clicks" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="CPM" tooltip="Custo por mil impressões" column="avg_cpm" {...sp} />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <SortableHeader label="Impressões" column="total_impressions" {...sp} />
      </th>
    </tr>
  );
}

function MetricsRow({ item, onClick, clickable = false, onStatusToggle }: { item: AggregatedItem | CampaignWithSales; onClick?: () => void; clickable?: boolean; onStatusToggle?: (objectId: string, newStatus: string) => void }) {
  const isCampaign = "campaign_name" in item;
  const name = isCampaign ? (item as CampaignWithSales).campaign_name : (item as AggregatedItem).name;
  const status = isCampaign ? (item as CampaignWithSales).campaign_status : (item as AggregatedItem).status;
  const accountId = isCampaign ? (item as CampaignWithSales).account_id : (item as AggregatedItem).account_id;
  const dailyBudget = isCampaign ? (item as CampaignWithSales).daily_budget : (item as AggregatedItem).daily_budget;
  const salesCount = isCampaign ? (item as CampaignWithSales).sales_count : (item as AggregatedItem).sales_count;
  const revenue = isCampaign ? (item as CampaignWithSales).revenue : (item as AggregatedItem).revenue;
  const profit = isCampaign ? (item as CampaignWithSales).profit : (item as AggregatedItem).profit;
  const roi = isCampaign ? (item as CampaignWithSales).roi : (item as AggregatedItem).roi;
  const roas = isCampaign ? (item as CampaignWithSales).roas : (item as AggregatedItem).roas;
  const cpa = isCampaign ? (item as CampaignWithSales).cpa : (item as AggregatedItem).cpa;
  const spend = isCampaign ? (item as CampaignWithSales).total_spend : (item as AggregatedItem).total_spend;
  const impressions = isCampaign ? (item as CampaignWithSales).total_impressions : (item as AggregatedItem).total_impressions;
  const clicks = isCampaign ? (item as CampaignWithSales).total_clicks : (item as AggregatedItem).total_clicks;
  const lpv = isCampaign ? (item as CampaignWithSales).total_landing_page_views : (item as AggregatedItem).total_landing_page_views;
  const ic = isCampaign ? (item as CampaignWithSales).total_initiated_checkouts : (item as AggregatedItem).total_initiated_checkouts;
  const avgCpc = isCampaign ? (item as CampaignWithSales).avg_cpc : (item as AggregatedItem).avg_cpc;
  const avgCpm = isCampaign ? (item as CampaignWithSales).avg_cpm : (item as AggregatedItem).avg_cpm;

  const objectId = isCampaign ? (item as CampaignWithSales).campaign_id : (item as AggregatedItem).id;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpi = ic > 0 ? spend / ic : 0;

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-muted/20 transition-colors",
        clickable && "cursor-pointer hover:bg-muted/40"
      )}
      onClick={onClick}
    >
      <td className="p-3 sticky left-0 bg-background z-10">
        <StatusBadge status={status} objectId={objectId} onToggle={onStatusToggle} />
      </td>
      <td className="p-3 sticky left-[72px] bg-background z-10">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate max-w-[280px]" title={name}>{name}</p>
            <p className="text-xs text-muted-foreground">Conta: {accountId}</p>
          </div>
          {clickable && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </div>
      </td>
      <td className="p-3 text-right text-muted-foreground">
        {dailyBudget > 0 ? formatCurrency(dailyBudget) + "/dia" : "—"}
      </td>
      <td className="p-3 text-right font-medium">{formatCurrency(spend)}</td>
      <td className="p-3 text-right">
        {salesCount > 0 ? (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{salesCount}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="p-3 text-right text-muted-foreground">{salesCount > 0 ? formatCurrency(cpa) : "—"}</td>
      <td className="p-3 text-right font-medium">{formatCurrency(revenue)}</td>
      <td className={cn("p-3 text-right font-medium", profit >= 0 ? "text-green-400" : "text-red-400")}>
        <span className="inline-flex items-center gap-1">
          {profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatCurrency(profit)}
        </span>
      </td>
      <td className={cn("p-3 text-right", roi >= 1 ? "text-green-400" : "text-red-400")}>
        {spend > 0 ? `${roi.toFixed(2)}x` : "—"}
      </td>
      <td className="p-3 text-right">{spend > 0 ? `${roas.toFixed(2)}x` : "—"}</td>
      <td className="p-3 text-right text-muted-foreground">{cpi > 0 ? formatCurrency(cpi) : "N/A"}</td>
      <td className="p-3 text-right">{formatNumber(ic)}</td>
      <td className="p-3 text-right">{formatNumber(lpv)}</td>
      <td className="p-3 text-right">{ctr > 0 ? `${ctr.toFixed(2)}%` : "—"}</td>
      <td className="p-3 text-right text-muted-foreground">{avgCpc > 0 ? formatCurrency(avgCpc) : "—"}</td>
      <td className="p-3 text-right">{formatNumber(clicks)}</td>
      <td className="p-3 text-right text-muted-foreground">{avgCpm > 0 ? formatCurrency(avgCpm) : "—"}</td>
      <td className="p-3 text-right">{formatNumber(impressions)}</td>
    </tr>
  );
}

function TotalsRow({ items, label }: { items: Array<{ total_spend: number; sales_count: number; revenue: number; total_impressions: number; total_clicks: number; total_landing_page_views: number; total_initiated_checkouts: number }>; label: string }) {
  const t = items.reduce(
    (acc, c) => ({
      spend: acc.spend + c.total_spend,
      sales: acc.sales + c.sales_count,
      revenue: acc.revenue + c.revenue,
      impressions: acc.impressions + c.total_impressions,
      clicks: acc.clicks + c.total_clicks,
      lpv: acc.lpv + c.total_landing_page_views,
      ic: acc.ic + c.total_initiated_checkouts,
    }),
    { spend: 0, sales: 0, revenue: 0, impressions: 0, clicks: 0, lpv: 0, ic: 0 }
  );
  const profit = t.revenue - t.spend;
  const roi = t.spend > 0 ? t.revenue / t.spend : 0;
  const roas = t.spend > 0 ? t.revenue / t.spend : 0;
  const cpa = t.sales > 0 ? t.spend / t.sales : 0;

  return (
    <tfoot>
      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
        <td className="p-3 sticky left-0 bg-muted/50 z-10"></td>
        <td className="p-3 sticky left-[72px] bg-muted/50 z-10">{label} ({items.length})</td>
        <td className="p-3 text-right">—</td>
        <td className="p-3 text-right">{formatCurrency(t.spend)}</td>
        <td className="p-3 text-right">{t.sales}</td>
        <td className="p-3 text-right">{formatCurrency(cpa)}</td>
        <td className="p-3 text-right">{formatCurrency(t.revenue)}</td>
        <td className={cn("p-3 text-right", profit >= 0 ? "text-green-400" : "text-red-400")}>
          {formatCurrency(profit)}
        </td>
        <td className={cn("p-3 text-right", roi >= 1 ? "text-green-400" : "text-red-400")}>
          {roi.toFixed(2)}x
        </td>
        <td className="p-3 text-right">{roas.toFixed(2)}x</td>
        <td className="p-3 text-right">—</td>
        <td className="p-3 text-right">{formatNumber(t.ic)}</td>
        <td className="p-3 text-right">{formatNumber(t.lpv)}</td>
        <td className="p-3 text-right">
          {t.impressions > 0 ? `${((t.clicks / t.impressions) * 100).toFixed(2)}%` : "—"}
        </td>
        <td className="p-3 text-right">{t.clicks > 0 ? formatCurrency(t.spend / t.clicks) : "—"}</td>
        <td className="p-3 text-right">{formatNumber(t.clicks)}</td>
        <td className="p-3 text-right">{t.impressions > 0 ? formatCurrency((t.spend / t.impressions) * 1000) : "—"}</td>
        <td className="p-3 text-right">{formatNumber(t.impressions)}</td>
      </tr>
    </tfoot>
  );
}

const AdsManagementContent = () => {
  const [period, setPeriod] = useState<AdsPeriod>("7d");
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Local status overrides for toggled items
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const {
    campaignsWithSales,
    accounts,
    isLoading,
    isRefreshing,
    refreshCampaigns,
    untrackedSales,
    dateRange,
    sales,
  } = useAdsCampaigns(period, customStart, customEnd, accountFilter || undefined, searchQuery || undefined);

  const {
    adsets,
    ads,
    isLoadingAdsets,
    isLoadingAds,
    currentLevel,
    breadcrumbs,
    fetchAdsets,
    fetchAds,
    navigateToLevel,
  } = useAdsHierarchy(dateRange, sales);

  const handleSort = useCallback((col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  }, [sortColumn]);

  // Apply status overrides to data
  const campaignsWithOverrides = useMemo(() => campaignsWithSales.map(c => {
    const override = statusOverrides[c.campaign_id];
    return override ? { ...c, campaign_status: override } : c;
  }), [campaignsWithSales, statusOverrides]);

  const adsetsWithOverrides = useMemo(() => adsets.map(a => {
    const override = statusOverrides[a.id];
    return override ? { ...a, status: override } : a;
  }), [adsets, statusOverrides]);

  const adsWithOverrides = useMemo(() => ads.map(a => {
    const override = statusOverrides[a.id];
    return override ? { ...a, status: override } : a;
  }), [ads, statusOverrides]);

  const sortedCampaigns = useMemo(() => sortItems(campaignsWithOverrides, sortColumn, sortDirection), [campaignsWithOverrides, sortColumn, sortDirection]);
  const sortedAdsets = useMemo(() => sortItems(adsetsWithOverrides, sortColumn, sortDirection), [adsetsWithOverrides, sortColumn, sortDirection]);
  const sortedAds = useMemo(() => sortItems(adsWithOverrides, sortColumn, sortDirection), [adsWithOverrides, sortColumn, sortDirection]);

  const handleStatusToggle = useCallback((objectId: string, newStatus: string) => {
    setStatusOverrides(prev => ({ ...prev, [objectId]: newStatus }));
  }, []);

  const handleCampaignClick = (c: CampaignWithSales) => {
    fetchAdsets([c.campaign_id], c.campaign_name);
  };

  const handleAdsetClick = (a: AggregatedItem) => {
    fetchAds([a.id], a.name);
  };

  const levelLabels: Record<AdsLevel, string> = {
    campaigns: "Campanhas",
    adsets: "Conjuntos",
    ads: "Anúncios",
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Meta Ads</h2>
            <p className="text-sm text-muted-foreground">Campanhas e atribuição de vendas</p>
          </div>
        </div>
        <Button onClick={refreshCampaigns} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Tabs for level switching */}
      <Tabs value={currentLevel} onValueChange={(v) => navigateToLevel(v as AdsLevel)}>
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="adsets" disabled={currentLevel === "campaigns"}>
            Conjuntos
          </TabsTrigger>
          <TabsTrigger value="ads" disabled={currentLevel !== "ads"}>
            Anúncios
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigateToLevel("campaigns")}
          >
            <ArrowLeft className="h-3 w-3" />
            Campanhas
          </Button>
          {breadcrumbs.slice(1).map((bc, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {i < breadcrumbs.length - 2 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigateToLevel(bc.level)}
                >
                  {bc.label}
                </Button>
              ) : (
                <span className="font-medium text-foreground truncate max-w-[300px]" title={bc.label}>
                  {bc.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Pesquisar ${levelLabels[currentLevel].toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={period} onValueChange={(v) => setPeriod(v as AdsPeriod)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {customStart ? format(customStart, "dd/MM", { locale: ptBR }) : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={customStart} onSelect={setCustomStart} locale={ptBR} /></PopoverContent>
            </Popover>
            <span className="text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {customEnd ? format(customEnd, "dd/MM", { locale: ptBR }) : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} locale={ptBR} /></PopoverContent>
            </Popover>
          </div>
        )}

        {accounts.length > 1 && (
          <Select value={accountFilter || "all"} onValueChange={(v) => setAccountFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a} value={a}>Conta {a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <UntrackedSalesDialog sales={untrackedSales} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <MetricsTableHeader sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </thead>
            <tbody>
              {/* Campaigns Level */}
              {currentLevel === "campaigns" && (
                <>
                  {isLoading ? (
                    <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Carregando...</td></tr>
                  ) : campaignsWithSales.length === 0 ? (
                    <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Nenhuma campanha encontrada. Clique em "Atualizar" para sincronizar.</td></tr>
                  ) : (
                    sortedCampaigns.map((c) => (
                      <MetricsRow
                        key={c.campaign_id}
                        item={c}
                        clickable
                        onClick={() => handleCampaignClick(c)}
                        onStatusToggle={handleStatusToggle}
                      />
                    ))
                  )}
                </>
              )}

              {/* Adsets Level */}
              {currentLevel === "adsets" && (
                <>
                  {isLoadingAdsets ? (
                    <tr><td colSpan={18} className="text-center p-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando conjuntos de anúncios...
                      </div>
                    </td></tr>
                  ) : adsets.length === 0 ? (
                    <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Nenhum conjunto encontrado para esta campanha.</td></tr>
                  ) : (
                    sortedAdsets.map((a) => (
                      <MetricsRow
                        key={a.id}
                        item={a}
                        clickable
                        onClick={() => handleAdsetClick(a)}
                        onStatusToggle={handleStatusToggle}
                      />
                    ))
                  )}
                </>
              )}

              {/* Ads Level */}
              {currentLevel === "ads" && (
                <>
                  {isLoadingAds ? (
                    <tr><td colSpan={18} className="text-center p-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando anúncios...
                      </div>
                    </td></tr>
                  ) : ads.length === 0 ? (
                    <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Nenhum anúncio encontrado para este conjunto.</td></tr>
                  ) : (
                    sortedAds.map((a) => (
                      <MetricsRow
                        key={a.id}
                        item={a}
                        onStatusToggle={handleStatusToggle}
                      />
                    ))
                  )}
                </>
              )}
            </tbody>
            {/* Totals Footer */}
            {currentLevel === "campaigns" && !isLoading && campaignsWithSales.length > 0 && (
              <TotalsRow items={campaignsWithSales} label="Total" />
            )}
            {currentLevel === "adsets" && !isLoadingAdsets && adsets.length > 0 && (
              <TotalsRow items={adsets} label="Total" />
            )}
            {currentLevel === "ads" && !isLoadingAds && ads.length > 0 && (
              <TotalsRow items={ads} label="Total" />
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdsManagementContent;
