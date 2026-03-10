import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Search, CalendarIcon, Megaphone, TrendingUp, TrendingDown, Info, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  const isPaused = status === "PAUSED";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        isActive && "border-green-500/50 bg-green-500/10 text-green-400",
        isPaused && "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
        !isActive && !isPaused && "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      {isActive ? "Ativo" : isPaused ? "Pausado" : status}
    </Badge>
  );
}

function ColumnHeader({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {label} <Info className="h-3 w-3 opacity-50" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MetricsTableHeader() {
  return (
    <tr className="border-b border-border bg-muted/30">
      <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10">Status</th>
      <th className="text-left p-3 font-medium text-muted-foreground sticky left-[72px] bg-muted/30 z-10">Nome</th>
      <th className="text-right p-3 font-medium text-muted-foreground">Orçamento</th>
      <th className="text-right p-3 font-medium text-muted-foreground">Gastos</th>
      <th className="text-right p-3 font-medium text-muted-foreground">Vendas</th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="CPA" tooltip="Custo por aquisição (Gasto / Vendas)" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">Faturamento</th>
      <th className="text-right p-3 font-medium text-muted-foreground">Lucro</th>
      <th className="text-right p-3 font-medium text-muted-foreground">ROI</th>
      <th className="text-right p-3 font-medium text-muted-foreground">ROAS</th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="CPI" tooltip="Custo por checkout iniciado" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="IC" tooltip="Checkouts iniciados" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="Vis. de Pág." tooltip="Visualizações da página de destino" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="CTR" tooltip="Taxa de cliques (Cliques / Impressões)" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="CPC" tooltip="Custo por clique" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">Cliques</th>
      <th className="text-right p-3 font-medium text-muted-foreground">
        <ColumnHeader label="CPM" tooltip="Custo por mil impressões" />
      </th>
      <th className="text-right p-3 font-medium text-muted-foreground">Impressões</th>
    </tr>
  );
}

function MetricsRow({ item, onClick, clickable = false }: { item: AggregatedItem | CampaignWithSales; onClick?: () => void; clickable?: boolean }) {
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
      <td className="p-3 sticky left-0 bg-background z-10"><StatusBadge status={status} /></td>
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

  const {
    campaignsWithSales,
    accounts,
    isLoading,
    isRefreshing,
    refreshCampaigns,
    untrackedSales,
    dateRange,
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
  } = useAdsHierarchy(dateRange);

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
              <MetricsTableHeader />
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
                    campaignsWithSales.map((c) => (
                      <MetricsRow
                        key={c.campaign_id}
                        item={c}
                        clickable
                        onClick={() => handleCampaignClick(c)}
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
                    adsets.map((a) => (
                      <MetricsRow
                        key={a.id}
                        item={a}
                        clickable
                        onClick={() => handleAdsetClick(a)}
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
                    ads.map((a) => (
                      <MetricsRow
                        key={a.id}
                        item={a}
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
