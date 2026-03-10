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
import { RefreshCw, Search, CalendarIcon, Megaphone, TrendingUp, TrendingDown, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAdsCampaigns, AdsPeriod, CampaignWithSales } from "./ads/useAdsCampaigns";
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
    totals,
  } = useAdsCampaigns(period, customStart, customEnd, accountFilter || undefined, searchQuery || undefined);

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

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="adsets" disabled>Conjuntos</TabsTrigger>
          <TabsTrigger value="ads" disabled>Anúncios</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar campanha..."
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
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground sticky left-[72px] bg-muted/30 z-10">Campanha</th>
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
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Carregando...</td></tr>
              ) : campaignsWithSales.length === 0 ? (
                <tr><td colSpan={18} className="text-center p-8 text-muted-foreground">Nenhuma campanha encontrada. Clique em "Atualizar" para sincronizar.</td></tr>
              ) : (
                campaignsWithSales.map((c) => (
                  <CampaignRow key={c.campaign_id} campaign={c} />
                ))
              )}
            </tbody>
            {!isLoading && campaignsWithSales.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="p-3 sticky left-0 bg-muted/50 z-10" colSpan={1}></td>
                  <td className="p-3 sticky left-[72px] bg-muted/50 z-10">Total ({campaignsWithSales.length})</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">{formatCurrency(totals.spend)}</td>
                  <td className="p-3 text-right">{totals.sales}</td>
                  <td className="p-3 text-right">{formatCurrency(totals.cpa)}</td>
                  <td className="p-3 text-right">{formatCurrency(totals.revenue)}</td>
                  <td className={cn("p-3 text-right", totals.profit >= 0 ? "text-green-400" : "text-red-400")}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td className={cn("p-3 text-right", totals.roi >= 0 ? "text-green-400" : "text-red-400")}>
                    {totals.roi.toFixed(0)}%
                  </td>
                  <td className="p-3 text-right">{totals.roas.toFixed(2)}x</td>
                  {/* Extra columns totals */}
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">{formatNumber(campaignsWithSales.reduce((s, c) => s + c.total_initiated_checkouts, 0))}</td>
                  <td className="p-3 text-right">{formatNumber(campaignsWithSales.reduce((s, c) => s + c.total_landing_page_views, 0))}</td>
                  <td className="p-3 text-right">
                    {totals.impressions > 0 ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="p-3 text-right">{totals.clicks > 0 ? formatCurrency(totals.spend / totals.clicks) : "—"}</td>
                  <td className="p-3 text-right">{formatNumber(totals.clicks)}</td>
                  <td className="p-3 text-right">{totals.impressions > 0 ? formatCurrency((totals.spend / totals.impressions) * 1000) : "—"}</td>
                  <td className="p-3 text-right">{formatNumber(totals.impressions)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};

function CampaignRow({ campaign: c }: { campaign: CampaignWithSales }) {
  const ctr = c.total_impressions > 0 ? (c.total_clicks / c.total_impressions) * 100 : 0;
  const cpi = c.total_initiated_checkouts > 0 ? c.total_spend / c.total_initiated_checkouts : 0;

  return (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="p-3 sticky left-0 bg-background z-10"><StatusBadge status={c.campaign_status} /></td>
      <td className="p-3 sticky left-[72px] bg-background z-10">
        <p className="font-medium text-foreground truncate max-w-[280px]" title={c.campaign_name}>{c.campaign_name}</p>
        <p className="text-xs text-muted-foreground">Conta: {c.account_id}</p>
      </td>
      <td className="p-3 text-right text-muted-foreground">
        {c.daily_budget > 0 ? formatCurrency(c.daily_budget) + "/dia" : "—"}
      </td>
      <td className="p-3 text-right font-medium">{formatCurrency(c.total_spend)}</td>
      <td className="p-3 text-right">
        {c.sales_count > 0 ? (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{c.sales_count}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="p-3 text-right text-muted-foreground">{c.sales_count > 0 ? formatCurrency(c.cpa) : "—"}</td>
      <td className="p-3 text-right font-medium">{formatCurrency(c.revenue)}</td>
      <td className={cn("p-3 text-right font-medium", c.profit >= 0 ? "text-green-400" : "text-red-400")}>
        <span className="inline-flex items-center gap-1">
          {c.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatCurrency(c.profit)}
        </span>
      </td>
      <td className={cn("p-3 text-right", c.roi >= 0 ? "text-green-400" : "text-red-400")}>
        {c.total_spend > 0 ? `${c.roi.toFixed(0)}%` : "—"}
      </td>
      <td className="p-3 text-right">{c.total_spend > 0 ? `${c.roas.toFixed(2)}x` : "—"}</td>
      {/* CPI */}
      <td className="p-3 text-right text-muted-foreground">{cpi > 0 ? formatCurrency(cpi) : "N/A"}</td>
      {/* IC */}
      <td className="p-3 text-right">{formatNumber(c.total_initiated_checkouts)}</td>
      {/* Vis. de Pág. */}
      <td className="p-3 text-right">{formatNumber(c.total_landing_page_views)}</td>
      {/* CTR */}
      <td className="p-3 text-right">{c.total_impressions > 0 ? `${ctr.toFixed(2)}%` : "—"}</td>
      {/* CPC */}
      <td className="p-3 text-right text-muted-foreground">{c.avg_cpc > 0 ? formatCurrency(c.avg_cpc) : "—"}</td>
      {/* Cliques */}
      <td className="p-3 text-right">{formatNumber(c.total_clicks)}</td>
      {/* CPM */}
      <td className="p-3 text-right text-muted-foreground">{c.avg_cpm > 0 ? formatCurrency(c.avg_cpm) : "—"}</td>
      {/* Impressões */}
      <td className="p-3 text-right">{formatNumber(c.total_impressions)}</td>
    </tr>
  );
}

export default AdsManagementContent;
