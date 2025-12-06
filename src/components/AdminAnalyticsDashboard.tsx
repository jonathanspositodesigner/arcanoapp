import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type DateFilter = 1 | 7 | 15 | 30 | 90 | "all";

interface PromptRanking {
  prompt_title: string;
  click_count: number;
}

interface ChartDataPoint {
  date: string;
  views: number;
}

const AdminAnalyticsDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [pageViews, setPageViews] = useState(0);
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [topPrompts, setTopPrompts] = useState<PromptRanking[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDateThreshold = () => {
    if (dateFilter === "all") return null;
    const date = new Date();
    date.setDate(date.getDate() - dateFilter);
    return date.toISOString();
  };

  const getDaysArray = (days: number | "all") => {
    const result: string[] = [];
    const numDays = days === "all" ? 30 : days;
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result.push(date.toISOString().split("T")[0]);
    }
    return result;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const threshold = getDateThreshold();

      // Fetch page views
      let pageViewsQuery = supabase.from("page_views").select("*", { count: "exact", head: true });
      if (threshold) {
        pageViewsQuery = pageViewsQuery.gte("viewed_at", threshold);
      }
      const { count: viewsCount } = await pageViewsQuery;
      setPageViews(viewsCount || 0);

      // Fetch page views for chart
      let chartQuery = supabase.from("page_views").select("viewed_at");
      if (threshold) {
        chartQuery = chartQuery.gte("viewed_at", threshold);
      }
      const { data: viewsData } = await chartQuery;

      if (viewsData) {
        const daysArray = getDaysArray(dateFilter);
        const viewsByDate: Record<string, number> = {};
        
        daysArray.forEach(day => {
          viewsByDate[day] = 0;
        });

        viewsData.forEach(view => {
          const date = view.viewed_at.split("T")[0];
          if (viewsByDate[date] !== undefined) {
            viewsByDate[date]++;
          }
        });

        const chartDataPoints = daysArray.map(date => ({
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          views: viewsByDate[date] || 0,
        }));

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

      setIsLoading(false);
    };

    fetchAnalytics();
  }, [dateFilter]);

  const filterOptions: { value: DateFilter; label: string }[] = [
    { value: 1, label: "1 dia" },
    { value: 7, label: "7 dias" },
    { value: 15, label: "15 dias" },
    { value: 30, label: "30 dias" },
    { value: 90, label: "90 dias" },
    { value: "all", label: "Todo período" },
  ];

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-foreground mb-4">Dashboard de Métricas</h2>
      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Page Views Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acessos</p>
                  <p className="text-3xl font-bold text-foreground">{pageViews.toLocaleString()}</p>
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
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    name="Acessos"
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
