import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy, RefreshCw, Copy, Timer, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Funnel, FunnelChart, LabelList, Cell } from "recharts";

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

interface SessionStats {
  totalSessions: number;
  bounceCount: number;
  bounceRate: number;
  avgDuration: number;
}

const AdminAnalyticsDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [pageViews, setPageViews] = useState({ total: 0, mobile: 0, desktop: 0, todayTotal: 0, todayMobile: 0, todayDesktop: 0 });
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [topPrompts, setTopPrompts] = useState<PromptRanking[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [planUsageStats, setPlanUsageStats] = useState<PlanUsageStats[]>([]);
  const [todayUsage, setTodayUsage] = useState({ basicUsed: 0, basicLimit: 10, proUsed: 0, proLimit: 24 });
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0, bounceCount: 0, bounceRate: 0, avgDuration: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Retorna a data de início do período em formato ISO
  const getDateThreshold = (): string | null => {
    if (dateFilter === "all") return null;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Cria data à meia-noite no horário local
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    
    // Para "Hoje", usa meia-noite de hoje
    // Para outros filtros, subtrai (dias - 1) para incluir hoje
    if (dateFilter > 1) {
      startDate.setDate(startDate.getDate() - (dateFilter - 1));
    }
    
    return startDate.toISOString();
  };

  // Gera array de datas no formato YYYY-MM-DD
  const getDaysArray = (days: number | "all"): string[] => {
    const result: string[] = [];
    const numDays = days === "all" ? 30 : days;
    
    const now = new Date();
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
    return result;
  };

  // Extrai data YYYY-MM-DD de um timestamp ISO (convertendo para horário local)
  const extractDateFromTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const threshold = getDateThreshold();
      
      // Gera o array de dias para o gráfico
      const daysArray = getDaysArray(dateFilter);
      
      // Data de hoje no formato YYYY-MM-DD
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Meia-noite de hoje para buscar acessos de hoje
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

      // ========== BUSCA SESSÕES ÚNICAS DAS BIBLIOTECAS (prompts e artes) ==========
      const { data: todaySessionsData } = await supabase
        .from("user_sessions")
        .select("session_id, device_type, entered_at, page_path")
        .in("page_path", ["/biblioteca-prompts", "/biblioteca-artes"])
        .gte("entered_at", todayMidnight);

      // Conta sessões únicas de hoje
      const todayUniqueSessions = new Set<string>();
      const todayMobileSet = new Set<string>();
      const todayDesktopSet = new Set<string>();
      
      if (todaySessionsData) {
        todaySessionsData.forEach(s => {
          todayUniqueSessions.add(s.session_id);
          if (s.device_type === "mobile") {
            todayMobileSet.add(s.session_id);
          } else {
            todayDesktopSet.add(s.session_id);
          }
        });
      }

      const todayTotal = todayUniqueSessions.size;
      const todayMobile = todayMobileSet.size;
      const todayDesktop = todayDesktopSet.size;

      // ========== BUSCA DO PERÍODO SELECIONADO ==========
      let sessionsQuery = supabase
        .from("user_sessions")
        .select("session_id, device_type, entered_at, page_path")
        .in("page_path", ["/biblioteca-prompts", "/biblioteca-artes"])
        .order("entered_at", { ascending: false });
      
      if (threshold) {
        sessionsQuery = sessionsQuery.gte("entered_at", threshold);
      }
      
      const { data: allSessionsData } = await sessionsQuery;

      // Conta sessões únicas do período
      const uniqueSessions = new Set<string>();
      const mobileSessionsSet = new Set<string>();
      const desktopSessionsSet = new Set<string>();
      const sessionsByDate: Record<string, { mobile: Set<string>; desktop: Set<string> }> = {};
      
      // Inicializa todos os dias
      daysArray.forEach(day => {
        sessionsByDate[day] = { mobile: new Set(), desktop: new Set() };
      });

      if (allSessionsData) {
        allSessionsData.forEach(s => {
          uniqueSessions.add(s.session_id);
          const date = extractDateFromTimestamp(s.entered_at);
          
          if (s.device_type === "mobile") {
            mobileSessionsSet.add(s.session_id);
            if (sessionsByDate[date]) {
              sessionsByDate[date].mobile.add(s.session_id);
            }
          } else {
            desktopSessionsSet.add(s.session_id);
            if (sessionsByDate[date]) {
              sessionsByDate[date].desktop.add(s.session_id);
            }
          }
        });
      }

      const mobile = mobileSessionsSet.size;
      const desktop = desktopSessionsSet.size;
      
      setPageViews({ 
        total: uniqueSessions.size, 
        mobile, 
        desktop,
        todayTotal,
        todayMobile,
        todayDesktop
      });

      // Process chart data - usa sessões únicas por dia
      const chartDataPoints = daysArray.map(dateStr => {
        const [, month, day] = dateStr.split('-');
        const dayData = sessionsByDate[dateStr] || { mobile: new Set(), desktop: new Set() };
        return {
          date: `${day}/${month}`,
          mobile: dayData.mobile.size,
          desktop: dayData.desktop.size,
          total: dayData.mobile.size + dayData.desktop.size,
        };
      });

      setChartData(chartDataPoints);

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


      // ========== FETCH SESSION STATS (bounce rate e tempo médio) ==========
      let statsSessionsQuery = supabase
        .from("user_sessions")
        .select("session_id, page_path, duration_seconds, entered_at")
        .in("page_path", ["/biblioteca-prompts", "/biblioteca-artes"]);
      
      if (threshold) {
        statsSessionsQuery = statsSessionsQuery.gte("entered_at", threshold);
      }
      const { data: statsSessionsData } = await statsSessionsQuery;

      if (statsSessionsData) {
        // Agrupa por session_id para ter sessões únicas
        const sessionMap = new Map<string, { duration: number }>();
        statsSessionsData.forEach(s => {
          if (!sessionMap.has(s.session_id) || (s.duration_seconds || 0) > (sessionMap.get(s.session_id)?.duration || 0)) {
            sessionMap.set(s.session_id, { duration: s.duration_seconds || 0 });
          }
        });
        
        const uniqueSessionsList = Array.from(sessionMap.values());
        const totalSessions = uniqueSessionsList.length;
        
        // Bounce = session < 3 seconds
        const bounceCount = uniqueSessionsList.filter(s => s.duration < 3).length;
        const bounceRate = totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0;
        
        // Average duration (exclude bounces for more accurate reading)
        const nonBounceSessions = uniqueSessionsList.filter(s => s.duration >= 3);
        const avgDuration = nonBounceSessions.length > 0 
          ? Math.round(nonBounceSessions.reduce((sum, s) => sum + s.duration, 0) / nonBounceSessions.length)
          : 0;

        setSessionStats({
          totalSessions,
          bounceCount,
          bounceRate,
          avgDuration
        });
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
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

          {/* Session Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Bounce Rate Card */}
            <Card className="p-6 border-2 border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <Zap className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Bounce Rate (&lt;3s)</p>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-500">{sessionStats.bounceRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sessionStats.bounceCount} de {sessionStats.totalSessions} sessões
                  </p>
                </div>
                <div className="pt-2 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    Usuários que saíram em menos de 3 segundos
                  </p>
                </div>
              </div>
            </Card>

            {/* Average Time Card */}
            <Card className="p-6 border-2 border-teal-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-500/20 rounded-full">
                  <Timer className="h-6 w-6 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Tempo Médio</p>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-bold text-teal-500">
                    {Math.floor(sessionStats.avgDuration / 60)}:{String(sessionStats.avgDuration % 60).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">minutos na biblioteca</p>
                </div>
                <div className="pt-2 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    Tempo médio de permanência (excluindo bounces)
                  </p>
                </div>
              </div>
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
