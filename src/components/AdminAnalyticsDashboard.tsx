import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy, RefreshCw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

type DateFilter = 1 | 7 | 15 | 30 | 90 | "all";

interface PromptRanking {
  prompt_title: string;
  click_count: number;
}

interface ChartDataPoint {
  date: string;
  mobile: number;
  desktop: number;
  total: number;
}

interface PlanUsageStats {
  plan: string;
  copies: number;
  users: number;
  avgPerUser: number;
}

const AdminAnalyticsDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [pageViews, setPageViews] = useState({ total: 0, mobile: 0, desktop: 0, todayTotal: 0, todayMobile: 0, todayDesktop: 0 });
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [topPrompts, setTopPrompts] = useState<PromptRanking[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [planUsageStats, setPlanUsageStats] = useState<PlanUsageStats[]>([]);
  const [todayUsage, setTodayUsage] = useState({ basicUsed: 0, basicLimit: 10, proUsed: 0, proLimit: 24 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const getDateThreshold = () => {
    if (dateFilter === "all") return null;
    const date = new Date();
    // Para "Hoje" (1 dia), pegar desde meia-noite de hoje
    if (dateFilter === 1) {
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    }
    // Para outros períodos, pegar desde meia-noite de X dias atrás
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - dateFilter + 1); // +1 para incluir hoje
    return date.toISOString();
  };

  const getDaysArray = (days: number | "all") => {
    const result: string[] = [];
    const numDays = days === "all" ? 30 : days;
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(12, 0, 0, 0); // Usa meio-dia para evitar problemas de timezone
      date.setDate(date.getDate() - i);
      // Formata manualmente para evitar problemas de timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
    return result;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const threshold = getDateThreshold();

      // Fetch page views with device type - usando range para pegar todos os registros
      let allViewsData: Array<{ device_type: string; viewed_at: string }> = [];
      let rangeStart = 0;
      const rangeSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let pageViewsQuery = supabase
          .from("page_views")
          .select("device_type, viewed_at")
          .range(rangeStart, rangeStart + rangeSize - 1);
        
        if (threshold) {
          pageViewsQuery = pageViewsQuery.gte("viewed_at", threshold);
        }
        
        const { data: viewsData } = await pageViewsQuery;
        
        if (viewsData && viewsData.length > 0) {
          allViewsData = [...allViewsData, ...viewsData];
          rangeStart += rangeSize;
          hasMore = viewsData.length === rangeSize;
        } else {
          hasMore = false;
        }
      }

      if (allViewsData.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const mobile = allViewsData.filter((v) => v.device_type === "mobile").length;
        const desktop = allViewsData.filter((v) => v.device_type === "desktop").length;
        const todayViews = allViewsData.filter((v) => v.viewed_at.split('T')[0] === today);
        const todayMobile = todayViews.filter((v) => v.device_type === "mobile").length;
        const todayDesktop = todayViews.filter((v) => v.device_type === "desktop").length;
        
        setPageViews({ 
          total: allViewsData.length, 
          mobile, 
          desktop,
          todayTotal: todayViews.length,
          todayMobile,
          todayDesktop
        });

        // Process chart data
        const daysArray = getDaysArray(dateFilter);
        const mobileByDate: Record<string, number> = {};
        const desktopByDate: Record<string, number> = {};
        
        daysArray.forEach(day => {
          mobileByDate[day] = 0;
          desktopByDate[day] = 0;
        });

        allViewsData.forEach(view => {
          const date = view.viewed_at.split("T")[0];
          if (mobileByDate[date] !== undefined) {
            if (view.device_type === "mobile") {
              mobileByDate[date]++;
            } else {
              desktopByDate[date]++;
            }
          }
        });

        const chartDataPoints = daysArray.map(dateStr => {
          // Formata a data para exibição sem usar new Date() que pode ter problemas de timezone
          const [year, month, day] = dateStr.split('-');
          return {
            date: `${day}/${month}`,
            mobile: mobileByDate[dateStr] || 0,
            desktop: desktopByDate[dateStr] || 0,
            total: (mobileByDate[dateStr] || 0) + (desktopByDate[dateStr] || 0),
          };
        });

        setChartData(chartDataPoints);
      }

      // Fetch installations
      let installsQuery = supabase.from("app_installations").select("device_type");
      if (threshold) {
        installsQuery = installsQuery.gte("installed_at", threshold);
      }
      const { data: installsData } = await installsQuery;
      
      if (installsData) {
        const mobile = installsData.filter((i) => i.device_type === "mobile").length;
        const desktop = installsData.filter((i) => i.device_type === "desktop").length;
        setInstallations({ total: installsData.length, mobile, desktop });
      }

      // Fetch top prompts
      let clicksQuery = supabase.from("prompt_clicks").select("prompt_title");
      if (threshold) {
        clicksQuery = clicksQuery.gte("clicked_at", threshold);
      }
      const { data: clicksData } = await clicksQuery;

      if (clicksData) {
        const clickCounts: Record<string, number> = {};
        clicksData.forEach((click) => {
          clickCounts[click.prompt_title] = (clickCounts[click.prompt_title] || 0) + 1;
        });

        const ranked = Object.entries(clickCounts)
          .map(([prompt_title, click_count]) => ({ prompt_title, click_count }))
          .sort((a, b) => b.click_count - a.click_count)
          .slice(0, 10);

        setTopPrompts(ranked);
      }

      // Fetch plan usage stats (copies by plan type)
      const { data: premiumUsers } = await supabase
        .from("premium_users")
        .select("user_id, plan_type")
        .eq("is_active", true);

      if (premiumUsers) {
        // Get all daily copies
        let copiesQuery = supabase.from("daily_prompt_copies").select("user_id, copy_date");
        if (threshold) {
          copiesQuery = copiesQuery.gte("copied_at", threshold);
        }
        const { data: copiesData } = await copiesQuery;

        if (copiesData) {
          // Map user_id to plan_type
          const userPlanMap: Record<string, string> = {};
          premiumUsers.forEach(u => {
            if (u.plan_type) userPlanMap[u.user_id] = u.plan_type;
          });

          // Count copies by plan
          const planCopies: Record<string, { copies: number; users: Set<string> }> = {
            arcano_basico: { copies: 0, users: new Set() },
            arcano_pro: { copies: 0, users: new Set() },
            arcano_unlimited: { copies: 0, users: new Set() },
          };

          copiesData.forEach(copy => {
            const plan = userPlanMap[copy.user_id];
            if (plan && planCopies[plan]) {
              planCopies[plan].copies++;
              planCopies[plan].users.add(copy.user_id);
            }
          });

          const stats: PlanUsageStats[] = [
            {
              plan: "Arcano Básico",
              copies: planCopies.arcano_basico.copies,
              users: planCopies.arcano_basico.users.size,
              avgPerUser: planCopies.arcano_basico.users.size > 0 
                ? Math.round(planCopies.arcano_basico.copies / planCopies.arcano_basico.users.size * 10) / 10
                : 0
            },
            {
              plan: "Arcano Pro",
              copies: planCopies.arcano_pro.copies,
              users: planCopies.arcano_pro.users.size,
              avgPerUser: planCopies.arcano_pro.users.size > 0 
                ? Math.round(planCopies.arcano_pro.copies / planCopies.arcano_pro.users.size * 10) / 10
                : 0
            },
            {
              plan: "Arcano Unlimited",
              copies: planCopies.arcano_unlimited.copies,
              users: planCopies.arcano_unlimited.users.size,
              avgPerUser: planCopies.arcano_unlimited.users.size > 0 
                ? Math.round(planCopies.arcano_unlimited.copies / planCopies.arcano_unlimited.users.size * 10) / 10
                : 0
            },
          ];

          setPlanUsageStats(stats);

          // Get today's usage for basic and pro plans
          const today = new Date().toISOString().split('T')[0];
          const todayCopies = copiesData.filter(c => c.copy_date === today);
          
          let basicToday = 0;
          let proToday = 0;
          
          todayCopies.forEach(copy => {
            const plan = userPlanMap[copy.user_id];
            if (plan === "arcano_basico") basicToday++;
            else if (plan === "arcano_pro") proToday++;
          });

          setTodayUsage({
            basicUsed: basicToday,
            basicLimit: 10 * planCopies.arcano_basico.users.size,
            proUsed: proToday,
            proLimit: 24 * planCopies.arcano_pro.users.size
          });
        }
      }

      setIsLoading(false);
      setLastUpdate(new Date());
    };

    fetchAnalytics();
  }, [dateFilter, refreshKey]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime para atualizações instantâneas
  useEffect(() => {
    const channel = supabase
      .channel('analytics_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'page_views' },
        () => {
          setRefreshKey(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prompt_clicks' },
        () => {
          setRefreshKey(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_prompt_copies' },
        () => {
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filterOptions: { value: DateFilter; label: string }[] = [
    { value: 1, label: "Hoje" },
    { value: 7, label: "7 dias" },
    { value: 15, label: "15 dias" },
    { value: 30, label: "30 dias" },
    { value: 90, label: "90 dias" },
    { value: "all", label: "Todo período" },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard de Métricas</h2>
          <p className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')} • Atualiza automaticamente
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
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={dateFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Today's Page Views Card - HIGHLIGHTED */}
            <Card className="p-6 border-2 border-green-500 bg-green-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Hoje</p>
                  <p className="text-3xl font-bold text-green-600">{pageViews.todayTotal.toLocaleString()}</p>
                  <p className="text-xs text-green-600/80 mt-1">
                    📱 {pageViews.todayMobile} · 💻 {pageViews.todayDesktop}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Page Views Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acessos Totais</p>
                  <p className="text-3xl font-bold text-foreground">{pageViews.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 {pageViews.mobile} · 💻 {pageViews.desktop}
                  </p>
                </div>
              </div>
            </Card>

            {/* Installations Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Smartphone className="h-8 w-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instalações do App</p>
                  <p className="text-3xl font-bold text-foreground">{installations.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 {installations.mobile} mobile · 💻 {installations.desktop} desktop
                  </p>
                </div>
              </div>
            </Card>

            {/* Top Prompts Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Top 10 Prompts Copiados</p>
              </div>
              {topPrompts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum clique registrado</p>
              ) : (
                <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                  {topPrompts.map((prompt, index) => (
                    <li key={prompt.prompt_title} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <span className="truncate text-foreground">{prompt.prompt_title}</span>
                      </span>
                      <span className="text-muted-foreground font-medium ml-2">{prompt.click_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Plan Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Usage by Plan Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <Copy className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Uso de Prompts por Plano</p>
              </div>
              
              {planUsageStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado de uso registrado</p>
              ) : (
                <div className="space-y-4">
                  {planUsageStats.map((stat) => (
                    <div key={stat.plan} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-foreground">{stat.plan}</span>
                        <span className="text-lg font-bold text-primary">{stat.copies}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{stat.users} usuário(s) ativo(s)</span>
                        <span>Média: {stat.avgPerUser} por usuário</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Today's Usage Chart */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Uso de Hoje por Plano</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planUsageStats.filter(s => s.plan !== "Arcano Unlimited")}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="plan" 
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
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
                    <Bar 
                      dataKey="copies" 
                      fill="#8b5cf6" 
                      radius={[4, 4, 0, 0]}
                      name="Cópias"
                    />
                    <Bar 
                      dataKey="users" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]}
                      name="Usuários"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Básico (10/dia)</p>
                  <p className="text-lg font-bold text-orange-500">{todayUsage.basicUsed}</p>
                  <p className="text-xs text-muted-foreground">cópias hoje</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Pro (24/dia)</p>
                  <p className="text-lg font-bold text-purple-500">{todayUsage.proUsed}</p>
                  <p className="text-xs text-muted-foreground">cópias hoje</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Evolução de Acessos</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
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
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: "#f97316", strokeWidth: 2 }}
                    name="📱 Mobile"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="desktop" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                    name="💻 Desktop"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
