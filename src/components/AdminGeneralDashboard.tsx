import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Eye, Smartphone, CalendarIcon, Clock, TrendingUp, 
  RotateCcw, ShoppingCart, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

type DateFilter = 1 | "yesterday" | 7 | 15 | 30 | 90 | "all" | "custom";

const AdminGeneralDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Access stats
  const [todayAccess, setTodayAccess] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [periodAccess, setPeriodAccess] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [todayInstallations, setTodayInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [todayPasswordResets, setTodayPasswordResets] = useState(0);
  
  // Conversion and purchases
  const [conversionRate, setConversionRate] = useState({ visitors: 0, buyers: 0, rate: 0 });
  const [purchaseHourStats, setPurchaseHourStats] = useState<{ hour: number; count: number }[]>([]);
  
  // Peak hours and access evolution
  const [peakHours, setPeakHours] = useState<{ hour: number; count: number }[]>([]);
  const [accessChartData, setAccessChartData] = useState<{ date: string; mobile: number; desktop: number; total: number }[]>([]);
  const [avgAccessPerDay, setAvgAccessPerDay] = useState(0);

  const getDateThreshold = (): { start: string | null; end: string | null } => {
    if (dateFilter === "all") return { start: null, end: null };
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    if (dateFilter === "custom" && customDateRange?.from) {
      const startDate = new Date(customDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from);
      endDate.setHours(23, 59, 59, 999);
      
      return { start: startDate.toISOString(), end: endDate.toISOString() };
    }
    
    if (dateFilter === "yesterday") {
      const startDate = new Date(year, month, day - 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, day - 1, 23, 59, 59, 999);
      return { start: startDate.toISOString(), end: endDate.toISOString() };
    }
    
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    
    if (typeof dateFilter === 'number' && dateFilter > 1) {
      startDate.setDate(startDate.getDate() - (dateFilter - 1));
    }
    
    return { start: startDate.toISOString(), end: null };
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const threshold = getDateThreshold();
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

      // Helper function to fetch ALL page_views with pagination
      const fetchAllPageViews = async (startDate: string, endDate?: string | null) => {
        let allRecords: { device_type: string; viewed_at: string }[] = [];
        let from = 0;
        const batchSize = 1000;
        
        while (true) {
          let query = supabase.from("page_views").select("device_type, viewed_at");
          query = query.gte("viewed_at", startDate);
          if (endDate) query = query.lte("viewed_at", endDate);
          query = query.range(from, from + batchSize - 1);
          
          const { data } = await query;
          if (!data || data.length === 0) break;
          
          allRecords = [...allRecords, ...data];
          from += batchSize;
          if (data.length < batchSize) break;
        }
        
        return allRecords;
      };

      // Fetch TODAY's access
      const todayAccessData = await fetchAllPageViews(todayMidnight);
      const todayMobile = todayAccessData.filter((a) => a.device_type === "mobile").length;
      const todayDesktop = todayAccessData.filter((a) => a.device_type === "desktop").length;
      setTodayAccess({ total: todayAccessData.length, mobile: todayMobile, desktop: todayDesktop });

      // Fetch PERIOD access
      const periodAccessData = threshold.start 
        ? await fetchAllPageViews(threshold.start, threshold.end)
        : [];
      const periodMobile = periodAccessData.filter((a) => a.device_type === "mobile").length;
      const periodDesktop = periodAccessData.filter((a) => a.device_type === "desktop").length;
      setPeriodAccess({ total: periodAccessData.length, mobile: periodMobile, desktop: periodDesktop });

      // Process PEAK HOURS data
      const hourCounts: Record<number, number> = {};
      periodAccessData.forEach(access => {
        const hour = new Date(access.viewed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHoursData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourCounts[i] || 0
      }));
      setPeakHours(peakHoursData);

      // Process ACCESS EVOLUTION data
      const dateCounts: Record<string, { mobile: number; desktop: number }> = {};
      periodAccessData.forEach(access => {
        const dateStr = new Date(access.viewed_at).toISOString().split('T')[0];
        if (!dateCounts[dateStr]) dateCounts[dateStr] = { mobile: 0, desktop: 0 };
        if (access.device_type === 'mobile') dateCounts[dateStr].mobile++;
        else dateCounts[dateStr].desktop++;
      });
      const chartData = Object.entries(dateCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, counts]) => ({
          date: format(new Date(date), 'dd/MM', { locale: ptBR }),
          mobile: counts.mobile,
          desktop: counts.desktop,
          total: counts.mobile + counts.desktop
        }));
      setAccessChartData(chartData);

      // Calculate AVERAGE accesses per day
      const totalDays = Object.keys(dateCounts).length || 1;
      setAvgAccessPerDay(Math.round(periodAccessData.length / totalDays));

      // Fetch installations for period
      let installsQuery = supabase.from("app_installations").select("device_type");
      if (threshold.start) {
        installsQuery = installsQuery.gte("installed_at", threshold.start);
      }
      if (threshold.end) {
        installsQuery = installsQuery.lte("installed_at", threshold.end);
      }
      const { data: installsData } = await installsQuery;
      
      if (installsData) {
        const mobile = installsData.filter((i) => i.device_type === "mobile").length;
        const desktop = installsData.filter((i) => i.device_type === "desktop").length;
        setInstallations({ total: installsData.length, mobile, desktop });
      }

      // Fetch today's installations
      const { data: todayInstallsData } = await supabase
        .from("app_installations")
        .select("device_type")
        .gte("installed_at", todayMidnight);
      
      if (todayInstallsData) {
        const mobile = todayInstallsData.filter((i) => i.device_type === "mobile").length;
        const desktop = todayInstallsData.filter((i) => i.device_type === "desktop").length;
        setTodayInstallations({ total: todayInstallsData.length, mobile, desktop });
      }

      // Fetch today's password resets
      const { data: todayPasswordData } = await supabase
        .from("profiles")
        .select("id")
        .eq("password_changed", true)
        .gte("updated_at", todayMidnight);
      
      setTodayPasswordResets(todayPasswordData?.length || 0);

      // Fetch conversion rate (from webhook_logs)
      let webhookQuery = supabase
        .from("webhook_logs")
        .select("email, status, from_app")
        .eq("from_app", true);
      
      if (threshold.start) {
        webhookQuery = webhookQuery.gte("received_at", threshold.start);
      }
      if (threshold.end) {
        webhookQuery = webhookQuery.lte("received_at", threshold.end);
      }
      
      const { data: webhookData } = await webhookQuery;
      
      if (webhookData) {
        const visitors = periodAccessData.length;
        const buyers = webhookData.filter(w => w.status === 'paid' || w.status === 'approved').length;
        const rate = visitors > 0 ? (buyers / visitors) * 100 : 0;
        setConversionRate({ visitors, buyers, rate });
      }

      // Fetch purchase hour stats
      let purchaseQuery = supabase
        .from("webhook_logs")
        .select("received_at")
        .in("status", ["paid", "approved"]);
      
      if (threshold.start) {
        purchaseQuery = purchaseQuery.gte("received_at", threshold.start);
      }
      if (threshold.end) {
        purchaseQuery = purchaseQuery.lte("received_at", threshold.end);
      }
      
      const { data: purchaseData } = await purchaseQuery;
      
      if (purchaseData) {
        const hourPurchaseCounts: Record<number, number> = {};
        purchaseData.forEach(p => {
          if (p.received_at) {
            const hour = new Date(p.received_at).getHours();
            hourPurchaseCounts[hour] = (hourPurchaseCounts[hour] || 0) + 1;
          }
        });
        const purchaseHoursData = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: hourPurchaseCounts[i] || 0
        }));
        setPurchaseHourStats(purchaseHoursData);
      }

      setIsLoading(false);
      setLastUpdate(new Date());
    };

    fetchAnalytics();
  }, [dateFilter, refreshKey, customDateRange]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filterOptions: { value: DateFilter; label: string }[] = [
    { value: 1, label: "Hoje" },
    { value: "yesterday", label: "Ontem" },
    { value: 7, label: "7 dias" },
    { value: 15, label: "15 dias" },
    { value: 30, label: "30 dias" },
    { value: 90, label: "90 dias" },
    { value: "all", label: "Todo período" },
  ];

  const formatDateRange = () => {
    if (!customDateRange?.from) return "Selecionar período";
    if (!customDateRange.to) return format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR });
    return `${format(customDateRange.from, "dd/MM", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Geral</h2>
          <p className="text-sm text-muted-foreground">
            Métricas consolidadas de todas as plataformas
          </p>
          <p className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={String(option.value)}
            variant={dateFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter === "custom" ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              {dateFilter === "custom" ? formatDateRange() : "Período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customDateRange?.from}
              selected={customDateRange}
              onSelect={(range) => {
                setCustomDateRange(range);
                if (range?.from) {
                  setDateFilter("custom");
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Access */}
            <Card className="p-6 border-2 border-green-500 bg-green-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Acessos Hoje</p>
                  <p className="text-3xl font-bold text-green-600">{todayAccess.total}</p>
                  <p className="text-xs text-green-600/80 mt-1">
                    📱 {todayAccess.mobile} · 💻 {todayAccess.desktop}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-green-500/20 grid grid-cols-2 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{todayInstallations.total}</p>
                  <p className="text-xs text-green-600/70">📲 Instalações</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{todayPasswordResets}</p>
                  <p className="text-xs text-green-600/70">🔑 Senha</p>
                </div>
              </div>
            </Card>

            {/* Period Access */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acessos no Período</p>
                  <p className="text-3xl font-bold text-foreground">{periodAccess.total}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    📱 {periodAccess.mobile} · 💻 {periodAccess.desktop}
                  </p>
                </div>
              </div>
            </Card>

            {/* Installations */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Smartphone className="h-8 w-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instalações do App</p>
                  <p className="text-3xl font-bold text-foreground">{installations.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 {installations.mobile} · 💻 {installations.desktop}
                  </p>
                </div>
              </div>
            </Card>

            {/* Conversion Rate */}
            <Card className="p-6 border-2 border-green-500/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendas do App</p>
                  <p className="text-3xl font-bold text-green-500">
                    {conversionRate.visitors > 0 ? `${conversionRate.rate.toFixed(1)}%` : '0%'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversionRate.buyers} vendas de {conversionRate.visitors} visitas
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Average Access */}
            <Card className="p-6 border-2 border-cyan-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-full">
                  <RotateCcw className="h-6 w-6 text-cyan-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Média de Acessos</p>
              </div>
              <div className="text-center space-y-3">
                <p className="text-4xl font-bold text-cyan-500">{avgAccessPerDay}</p>
                <p className="text-xs text-muted-foreground">📊 Acessos/dia no período</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {accessChartData.length} dias com dados
                  </p>
                </div>
              </div>
            </Card>

            {/* Peak Hours */}
            <Card className="p-6 border-2 border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-full">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Horário de Pico</p>
              </div>
              {peakHours.some(h => h.count > 0) ? (
                <>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHours}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fontSize: 9 }}
                          tickFormatter={(h) => `${h}h`}
                          className="text-muted-foreground"
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                          formatter={(value: number) => [value, 'Acessos']}
                          labelFormatter={(h) => `${h}:00`}
                        />
                        <Bar dataKey="count" fill="#f97316" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-center">
                    {(() => {
                      const topHours = [...peakHours].sort((a, b) => b.count - a.count).filter(h => h.count > 0).slice(0, 3);
                      return topHours.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          🔥 Picos: <span className="font-bold text-orange-500">
                            {topHours.map(h => `${h.hour}h`).join(', ')}
                          </span>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </>
              ) : (
                <div className="h-[120px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Sem dados no período</p>
                </div>
              )}
            </Card>

            {/* Purchase Hours */}
            <Card className="p-6 border-2 border-emerald-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Compras por Hora</p>
              </div>
              {purchaseHourStats.some(h => h.count > 0) ? (
                <>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={purchaseHourStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fontSize: 9 }}
                          tickFormatter={(h) => `${h}h`}
                          className="text-muted-foreground"
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                          formatter={(value: number) => [value, 'Compras']}
                          labelFormatter={(h) => `${h}:00`}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-center">
                    {(() => {
                      const topHours = [...purchaseHourStats].sort((a, b) => b.count - a.count).filter(h => h.count > 0).slice(0, 3);
                      return topHours.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          💰 Melhor horário: <span className="font-bold text-emerald-500">
                            {topHours.map(h => `${h.hour}h`).join(', ')}
                          </span>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </>
              ) : (
                <div className="h-[120px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Sem compras no período</p>
                </div>
              )}
            </Card>
          </div>

          {/* Access Evolution Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Evolução de Acessos</h3>
            {accessChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accessChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mobile" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Mobile"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="desktop" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Desktop"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">Sem dados no período</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminGeneralDashboard;
