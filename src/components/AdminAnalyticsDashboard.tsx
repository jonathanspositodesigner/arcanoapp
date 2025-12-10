import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy, RefreshCw, Copy, Timer, Zap, Link2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Funnel, FunnelChart, LabelList, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

type DateFilter = 1 | "yesterday" | 7 | 15 | 30 | 90 | "all" | "custom";

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

interface CollectionStats {
  totalViews: number;
  topCollections: { name: string; count: number }[];
}

const AdminAnalyticsDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
const [pageViews, setPageViews] = useState({ 
    total: 0, mobile: 0, desktop: 0, 
    todayTotal: 0, todayMobile: 0, todayDesktop: 0,
    todayUnique: 0, todayTotalSessions: 0, todayReturning: 0,
    periodUnique: 0, periodTotalSessions: 0, periodReturning: 0
  });
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [topPrompts, setTopPrompts] = useState<PromptRanking[]>([]);
  const [topArtes, setTopArtes] = useState<PromptRanking[]>([]);
  const [topRankingViewMode, setTopRankingViewMode] = useState<'prompts' | 'artes'>('prompts');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [planUsageStats, setPlanUsageStats] = useState<PlanUsageStats[]>([]);
  const [artesUsageStats, setArtesUsageStats] = useState<PlanUsageStats[]>([]);
  const [todayUsage, setTodayUsage] = useState({ basicUsed: 0, basicLimit: 10, proUsed: 0, proLimit: 24 });
  const [todayArtesUsage, setTodayArtesUsage] = useState({ basicUsed: 0, basicLimit: 10, proUsed: 0, proLimit: 24 });
  const [topPurchasedPlans, setTopPurchasedPlans] = useState<{ name: string; count: number }[]>([]);
  const [topPurchasedPacks, setTopPurchasedPacks] = useState<{ name: string; count: number }[]>([]);
  const [usageViewMode, setUsageViewMode] = useState<'prompts' | 'artes'>('prompts');
  const [todayUsageViewMode, setTodayUsageViewMode] = useState<'prompts' | 'artes'>('prompts');
  const [topCategories, setTopCategories] = useState<{ name: string; count: number }[]>([]);
  const [topPacks, setTopPacks] = useState<{ name: string; count: number }[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0, bounceCount: 0, bounceRate: 0, avgDuration: 0
  });
  const [collectionStats, setCollectionStats] = useState<CollectionStats>({
    totalViews: 0, topCollections: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Retorna a data de início e fim do período em formato ISO
  const getDateThreshold = (): { start: string | null; end: string | null } => {
    if (dateFilter === "all") return { start: null, end: null };
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Para período customizado
    if (dateFilter === "custom" && customDateRange?.from) {
      const startDate = new Date(customDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from);
      endDate.setHours(23, 59, 59, 999);
      
      return { start: startDate.toISOString(), end: endDate.toISOString() };
    }
    
    // Para "Ontem"
    if (dateFilter === "yesterday") {
      const startDate = new Date(year, month, day - 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, day - 1, 23, 59, 59, 999);
      return { start: startDate.toISOString(), end: endDate.toISOString() };
    }
    
    // Cria data à meia-noite no horário local
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    
    // Para "Hoje", usa meia-noite de hoje
    // Para outros filtros, subtrai (dias - 1) para incluir hoje
    if (typeof dateFilter === 'number' && dateFilter > 1) {
      startDate.setDate(startDate.getDate() - (dateFilter - 1));
    }
    
    return { start: startDate.toISOString(), end: null };
  };

  // Gera array de datas no formato YYYY-MM-DD
  const getDaysArray = (filter: DateFilter): string[] => {
    const result: string[] = [];
    const now = new Date();
    
    // Para período customizado
    if (filter === "custom" && customDateRange?.from) {
      const startDate = new Date(customDateRange.from);
      const endDate = customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from);
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        result.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return result;
    }
    
    // Para ontem
    if (filter === "yesterday") {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      return [`${year}-${month}-${day}`];
    }
    
    const numDays = filter === "all" ? 30 : (typeof filter === 'number' ? filter : 7);
    
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

      // ========== BUSCA PAGE VIEWS DE HOJE ==========
      const { data: todayPageViewsData } = await supabase
        .from("page_views")
        .select("device_type, user_agent, viewed_at")
        .gte("viewed_at", todayMidnight);

      // Conta page views de hoje
      let todayTotal = 0;
      let todayMobile = 0;
      let todayDesktop = 0;
      const todayUniqueAgents = new Set<string>();
      
      if (todayPageViewsData) {
        todayTotal = todayPageViewsData.length;
        todayPageViewsData.forEach(pv => {
          if (pv.device_type === "mobile") {
            todayMobile++;
          } else {
            todayDesktop++;
          }
          if (pv.user_agent) {
            todayUniqueAgents.add(pv.user_agent);
          }
        });
      }

      const todayUnique = todayUniqueAgents.size;

      // ========== BUSCA PAGE VIEWS DO PERÍODO SELECIONADO (com paginação) ==========
      const fetchAllPageViews = async () => {
        const allRecords: { device_type: string; user_agent: string | null; viewed_at: string }[] = [];
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          let query = supabase
            .from("page_views")
            .select("device_type, user_agent, viewed_at")
            .order("viewed_at", { ascending: false })
            .range(offset, offset + batchSize - 1);
          
          if (threshold.start) {
            query = query.gte("viewed_at", threshold.start);
          }
          if (threshold.end) {
            query = query.lte("viewed_at", threshold.end);
          }
          
          const { data } = await query;
          
          if (data && data.length > 0) {
            allRecords.push(...data);
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
        
        return allRecords;
      };
      
      const allPageViewsData = await fetchAllPageViews();

      // Conta page views do período
      let periodTotal = 0;
      let periodMobile = 0;
      let periodDesktop = 0;
      const periodUniqueAgents = new Set<string>();
      const viewsByDate: Record<string, { mobile: number; desktop: number; total: number }> = {};
      
      // Inicializa todos os dias
      daysArray.forEach(day => {
        viewsByDate[day] = { mobile: 0, desktop: 0, total: 0 };
      });

      if (allPageViewsData) {
        periodTotal = allPageViewsData.length;
        allPageViewsData.forEach(pv => {
          const date = extractDateFromTimestamp(pv.viewed_at);
          
          if (pv.device_type === "mobile") {
            periodMobile++;
            if (viewsByDate[date]) {
              viewsByDate[date].mobile++;
              viewsByDate[date].total++;
            }
          } else {
            periodDesktop++;
            if (viewsByDate[date]) {
              viewsByDate[date].desktop++;
              viewsByDate[date].total++;
            }
          }
          if (pv.user_agent) {
            periodUniqueAgents.add(pv.user_agent);
          }
        });
      }

      const periodUnique = periodUniqueAgents.size;
      
      setPageViews({ 
        total: periodTotal, 
        mobile: periodMobile, 
        desktop: periodDesktop,
        todayTotal,
        todayMobile,
        todayDesktop,
        todayUnique,
        todayTotalSessions: todayTotal,
        todayReturning: 0,
        periodUnique,
        periodTotalSessions: periodTotal,
        periodReturning: 0
      });

      // Process chart data - usa page views totais por dia
      const chartDataPoints = daysArray.map(dateStr => {
        const [, month, day] = dateStr.split('-');
        const dayData = viewsByDate[dateStr] || { mobile: 0, desktop: 0, total: 0 };
        return {
          date: `${day}/${month}`,
          mobile: dayData.mobile,
          desktop: dayData.desktop,
          total: dayData.total,
        };
      });

      setChartData(chartDataPoints);

      // Fetch installations
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

      // Fetch top prompts
      let clicksQuery = supabase.from("prompt_clicks").select("prompt_title");
      if (threshold.start) {
        clicksQuery = clicksQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        clicksQuery = clicksQuery.lte("clicked_at", threshold.end);
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

      // Fetch top artes
      let artesClicksQuery = supabase.from("arte_clicks").select("arte_title");
      if (threshold.start) {
        artesClicksQuery = artesClicksQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        artesClicksQuery = artesClicksQuery.lte("clicked_at", threshold.end);
      }
      const { data: artesClicksData } = await artesClicksQuery;

      if (artesClicksData) {
        const clickCounts: Record<string, number> = {};
        artesClicksData.forEach((click) => {
          clickCounts[click.arte_title] = (clickCounts[click.arte_title] || 0) + 1;
        });

        const ranked = Object.entries(clickCounts)
          .map(([prompt_title, click_count]) => ({ prompt_title, click_count }))
          .sort((a, b) => b.click_count - a.click_count)
          .slice(0, 10);

        setTopArtes(ranked);
      }

      // Fetch top categories for prompts
      let promptsWithCategoryQuery = supabase.from("prompt_clicks").select("prompt_id, is_admin_prompt");
      if (threshold.start) {
        promptsWithCategoryQuery = promptsWithCategoryQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        promptsWithCategoryQuery = promptsWithCategoryQuery.lte("clicked_at", threshold.end);
      }
      const { data: promptClicksWithId } = await promptsWithCategoryQuery;

      if (promptClicksWithId && promptClicksWithId.length > 0) {
        // Get categories from admin_prompts
        const adminPromptIds = promptClicksWithId.filter(p => p.is_admin_prompt).map(p => p.prompt_id);
        const partnerPromptIds = promptClicksWithId.filter(p => !p.is_admin_prompt).map(p => p.prompt_id);
        
        const categoryCounts: Record<string, number> = {};
        
        if (adminPromptIds.length > 0) {
          const { data: adminPrompts } = await supabase
            .from("admin_prompts")
            .select("id, category")
            .in("id", adminPromptIds);
          
          if (adminPrompts) {
            const categoryMap: Record<string, string> = {};
            adminPrompts.forEach(p => { categoryMap[p.id] = p.category; });
            
            promptClicksWithId.filter(p => p.is_admin_prompt).forEach(click => {
              const cat = categoryMap[click.prompt_id];
              if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          }
        }
        
        if (partnerPromptIds.length > 0) {
          const { data: partnerPrompts } = await supabase
            .from("partner_prompts")
            .select("id, category")
            .in("id", partnerPromptIds);
          
          if (partnerPrompts) {
            const categoryMap: Record<string, string> = {};
            partnerPrompts.forEach(p => { categoryMap[p.id] = p.category; });
            
            promptClicksWithId.filter(p => !p.is_admin_prompt).forEach(click => {
              const cat = categoryMap[click.prompt_id];
              if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          }
        }
        
        const topCats = Object.entries(categoryCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopCategories(topCats);
      }

      // Fetch top packs for artes
      let artesWithPackQuery = supabase.from("arte_clicks").select("arte_id, is_admin_arte");
      if (threshold.start) {
        artesWithPackQuery = artesWithPackQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        artesWithPackQuery = artesWithPackQuery.lte("clicked_at", threshold.end);
      }
      const { data: arteClicksWithId } = await artesWithPackQuery;

      if (arteClicksWithId && arteClicksWithId.length > 0) {
        const adminArteIds = arteClicksWithId.filter(a => a.is_admin_arte).map(a => a.arte_id);
        const partnerArteIds = arteClicksWithId.filter(a => !a.is_admin_arte).map(a => a.arte_id);
        
        const packCounts: Record<string, number> = {};
        
        if (adminArteIds.length > 0) {
          const { data: adminArtes } = await supabase
            .from("admin_artes")
            .select("id, pack")
            .in("id", adminArteIds);
          
          if (adminArtes) {
            const packMap: Record<string, string> = {};
            adminArtes.forEach(a => { packMap[a.id] = a.pack || 'Sem Pack'; });
            
            arteClicksWithId.filter(a => a.is_admin_arte).forEach(click => {
              const pack = packMap[click.arte_id] || 'Sem Pack';
              packCounts[pack] = (packCounts[pack] || 0) + 1;
            });
          }
        }
        
        if (partnerArteIds.length > 0) {
          const { data: partnerArtes } = await supabase
            .from("partner_artes")
            .select("id, pack")
            .in("id", partnerArteIds);
          
          if (partnerArtes) {
            const packMap: Record<string, string> = {};
            partnerArtes.forEach(a => { packMap[a.id] = a.pack || 'Sem Pack'; });
            
            arteClicksWithId.filter(a => !a.is_admin_arte).forEach(click => {
              const pack = packMap[click.arte_id] || 'Sem Pack';
              packCounts[pack] = (packCounts[pack] || 0) + 1;
            });
          }
        }
        
        const topPacksList = Object.entries(packCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopPacks(topPacksList);
      }

      // Fetch plan usage stats (copies by plan type)
      const { data: premiumUsers } = await supabase
        .from("premium_users")
        .select("user_id, plan_type")
        .eq("is_active", true);

      if (premiumUsers) {
        // Get all daily copies
        let copiesQuery = supabase.from("daily_prompt_copies").select("user_id, copy_date");
        if (threshold.start) {
          copiesQuery = copiesQuery.gte("copied_at", threshold.start);
        }
        if (threshold.end) {
          copiesQuery = copiesQuery.lte("copied_at", threshold.end);
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

      // ========== FETCH ARTES USAGE STATS (copies from daily_arte_copies) ==========
      const { data: premiumArtesUsers } = await supabase
        .from("premium_artes_users")
        .select("user_id, plan_type")
        .eq("is_active", true);

      const { data: packUsers } = await supabase
        .from("user_pack_purchases")
        .select("user_id, access_type")
        .eq("is_active", true);

      if (premiumArtesUsers || packUsers) {
        let arteCopiesQuery = supabase.from("daily_arte_copies").select("user_id, copy_date");
        if (threshold.start) {
          arteCopiesQuery = arteCopiesQuery.gte("copied_at", threshold.start);
        }
        if (threshold.end) {
          arteCopiesQuery = arteCopiesQuery.lte("copied_at", threshold.end);
        }
        const { data: arteCopiesData } = await arteCopiesQuery;

        if (arteCopiesData) {
          const artesUserPlanMap: Record<string, string> = {};
          premiumArtesUsers?.forEach(u => {
            if (u.plan_type) artesUserPlanMap[u.user_id] = u.plan_type;
          });
          packUsers?.forEach(u => {
            if (!artesUserPlanMap[u.user_id]) {
              artesUserPlanMap[u.user_id] = 'pack_user';
            }
          });

          const artesTypeCopies: Record<string, { copies: number; users: Set<string> }> = {
            premium: { copies: 0, users: new Set() },
            pack_user: { copies: 0, users: new Set() },
          };

          arteCopiesData.forEach(copy => {
            const userType = artesUserPlanMap[copy.user_id];
            if (userType === 'pack_user') {
              artesTypeCopies.pack_user.copies++;
              artesTypeCopies.pack_user.users.add(copy.user_id);
            } else if (userType) {
              artesTypeCopies.premium.copies++;
              artesTypeCopies.premium.users.add(copy.user_id);
            }
          });

          const artesStats: PlanUsageStats[] = [
            {
              plan: "Premium Artes",
              copies: artesTypeCopies.premium.copies,
              users: artesTypeCopies.premium.users.size,
              avgPerUser: artesTypeCopies.premium.users.size > 0 
                ? Math.round(artesTypeCopies.premium.copies / artesTypeCopies.premium.users.size * 10) / 10
                : 0
            },
            {
              plan: "Compradores de Pack",
              copies: artesTypeCopies.pack_user.copies,
              users: artesTypeCopies.pack_user.users.size,
              avgPerUser: artesTypeCopies.pack_user.users.size > 0 
                ? Math.round(artesTypeCopies.pack_user.copies / artesTypeCopies.pack_user.users.size * 10) / 10
                : 0
            },
          ];

          setArtesUsageStats(artesStats);

          const today = new Date().toISOString().split('T')[0];
          const todayArtesCopies = arteCopiesData.filter(c => c.copy_date === today);
          
          let premiumToday = 0;
          let packToday = 0;
          
          todayArtesCopies.forEach(copy => {
            const userType = artesUserPlanMap[copy.user_id];
            if (userType === 'pack_user') packToday++;
            else if (userType) premiumToday++;
          });

          setTodayArtesUsage({
            basicUsed: premiumToday,
            basicLimit: artesTypeCopies.premium.users.size * 10,
            proUsed: packToday,
            proLimit: artesTypeCopies.pack_user.users.size * 10
          });
        }
      }

      // ========== FETCH TOP PURCHASED PLANS (Prompts) ==========
      let purchasedPlansQuery = supabase.from("premium_users").select("plan_type, subscribed_at");
      if (threshold.start) {
        purchasedPlansQuery = purchasedPlansQuery.gte("subscribed_at", threshold.start);
      }
      if (threshold.end) {
        purchasedPlansQuery = purchasedPlansQuery.lte("subscribed_at", threshold.end);
      }
      const { data: purchasedPlansData } = await purchasedPlansQuery;

      if (purchasedPlansData) {
        const planCounts: Record<string, number> = {};
        purchasedPlansData.forEach(p => {
          const planName = p.plan_type || 'Sem Plano';
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        });
        
        const planNameMap: Record<string, string> = {
          'arcano_basico': 'Arcano Básico',
          'arcano_pro': 'Arcano Pro',
          'arcano_unlimited': 'Arcano Unlimited'
        };
        
        const topPlans = Object.entries(planCounts)
          .map(([name, count]) => ({ name: planNameMap[name] || name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopPurchasedPlans(topPlans);
      }

      // ========== FETCH TOP PURCHASED PACKS (Artes) ==========
      let purchasedPacksQuery = supabase.from("user_pack_purchases").select("pack_slug, purchased_at");
      if (threshold.start) {
        purchasedPacksQuery = purchasedPacksQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        purchasedPacksQuery = purchasedPacksQuery.lte("purchased_at", threshold.end);
      }
      const { data: purchasedPacksData } = await purchasedPacksQuery;

      if (purchasedPacksData) {
        const packCounts: Record<string, number> = {};
        purchasedPacksData.forEach(p => {
          const packName = p.pack_slug || 'Sem Pack';
          packCounts[packName] = (packCounts[packName] || 0) + 1;
        });
        
        const topPacksList = Object.entries(packCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopPurchasedPacks(topPacksList);
      }

      // ========== FETCH SESSION STATS (bounce rate e tempo médio) ==========
      let statsSessionsQuery = supabase
        .from("user_sessions")
        .select("session_id, page_path, duration_seconds, entered_at")
        .in("page_path", ["/biblioteca-prompts", "/biblioteca-artes"]);
      
      if (threshold.start) {
        statsSessionsQuery = statsSessionsQuery.gte("entered_at", threshold.start);
      }
      if (threshold.end) {
        statsSessionsQuery = statsSessionsQuery.lte("entered_at", threshold.end);
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

      // ========== FETCH COLLECTION STATS from collection_views table ==========
      let collectionViewsQuery = supabase
        .from("collection_views")
        .select("collection_slug, collection_name, viewed_at");
      
      if (threshold.start) {
        collectionViewsQuery = collectionViewsQuery.gte("viewed_at", threshold.start);
      }
      if (threshold.end) {
        collectionViewsQuery = collectionViewsQuery.lte("viewed_at", threshold.end);
      }
      const { data: collectionViewsData } = await collectionViewsQuery;

      if (collectionViewsData) {
        const totalViews = collectionViewsData.length;

        // Count views per collection
        const collectionCounts: Record<string, number> = {};
        collectionViewsData.forEach((view) => {
          collectionCounts[view.collection_name] = (collectionCounts[view.collection_name] || 0) + 1;
        });

        // Rank collections by view count
        const topCollections = Object.entries(collectionCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setCollectionStats({
          totalViews,
          topCollections
        });
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
            key={String(option.value)}
            variant={dateFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
        
        {/* Custom Date Range Picker */}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Today's Page Views Card - HIGHLIGHTED */}
            <Card className="p-6 border-2 border-green-500 bg-green-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Acessos Hoje</p>
                  <p className="text-3xl font-bold text-green-600">{pageViews.todayTotal.toLocaleString()}</p>
                  <p className="text-xs text-green-600/80 mt-1">
                    📱 {pageViews.todayMobile} · 💻 {pageViews.todayDesktop}
                  </p>
                  <p className="text-xs text-green-600/60 mt-0.5">
                    👤 {pageViews.todayUnique} únicos
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
                  <p className="text-sm text-muted-foreground">Acessos no Período</p>
                  <p className="text-3xl font-bold text-foreground">{pageViews.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    📱 {pageViews.mobile} · 💻 {pageViews.desktop}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    👤 {pageViews.periodUnique.toLocaleString()} únicos
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

            {/* Top Prompts/Artes Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {topRankingViewMode === 'prompts' ? 'Top 10 Prompts Copiados' : 'Top 10 Artes Copiadas'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={topRankingViewMode === 'prompts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopRankingViewMode('prompts')}
                    className="h-7 px-2 text-xs"
                  >
                    Prompts
                  </Button>
                  <Button
                    variant={topRankingViewMode === 'artes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopRankingViewMode('artes')}
                    className="h-7 px-2 text-xs"
                  >
                    Artes
                  </Button>
                </div>
              </div>
              {(topRankingViewMode === 'prompts' ? topPrompts : topArtes).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum clique registrado</p>
              ) : (
                <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                  {(topRankingViewMode === 'prompts' ? topPrompts : topArtes).map((item, index) => (
                    <li key={item.prompt_title} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <span className="truncate text-foreground">{item.prompt_title}</span>
                      </span>
                      <span className="text-muted-foreground font-medium ml-2">{item.click_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Session Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

            {/* Collection Links Card */}
            <Card className="p-6 border-2 border-indigo-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-full">
                  <Link2 className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Links de Coleções</p>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-bold text-indigo-500">{collectionStats.totalViews}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    aberturas de coleções
                  </p>
                </div>
                {collectionStats.topCollections.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Top Coleções:</p>
                    {collectionStats.topCollections.slice(0, 3).map((col, index) => (
                      <div key={col.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[140px]">{index + 1}. {col.name}</span>
                        <span className="font-medium text-indigo-500">{col.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Plan Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Top Purchased Plans/Packs Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <Trophy className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {usageViewMode === 'prompts' ? 'Planos Mais Comprados' : 'Packs Mais Comprados'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={usageViewMode === 'prompts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUsageViewMode('prompts')}
                    className="h-7 px-2 text-xs"
                  >
                    Prompts
                  </Button>
                  <Button
                    variant={usageViewMode === 'artes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUsageViewMode('artes')}
                    className="h-7 px-2 text-xs"
                  >
                    Artes
                  </Button>
                </div>
              </div>
              
              {(usageViewMode === 'prompts' ? topPurchasedPlans : topPurchasedPacks).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma compra registrada no período</p>
              ) : (
                <div className="space-y-3">
                  {(usageViewMode === 'prompts' ? topPurchasedPlans : topPurchasedPacks).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <span className="text-foreground truncate">{item.name}</span>
                      </span>
                      <span className="font-bold text-primary">{item.count} {item.count === 1 ? 'compra' : 'compras'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Categories/Packs Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">
                  {todayUsageViewMode === 'prompts' ? 'Top 5 Categorias - Prompts' : 'Top 5 Packs - Artes'}
                </h3>
                <div className="flex gap-1">
                  <Button
                    variant={todayUsageViewMode === 'prompts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTodayUsageViewMode('prompts')}
                    className="h-7 px-2 text-xs"
                  >
                    Prompts
                  </Button>
                  <Button
                    variant={todayUsageViewMode === 'artes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTodayUsageViewMode('artes')}
                    className="h-7 px-2 text-xs"
                  >
                    Artes
                  </Button>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={todayUsageViewMode === 'prompts' ? topCategories : topPacks}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      width={100}
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
                      dataKey="count" 
                      fill={todayUsageViewMode === 'prompts' ? "#8b5cf6" : "#f59e0b"}
                      radius={[0, 4, 4, 0]}
                      name="Cliques"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {(todayUsageViewMode === 'prompts' ? topCategories : topPacks).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Nenhum dado registrado</p>
                ) : (
                  (todayUsageViewMode === 'prompts' ? topCategories : topPacks).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm bg-secondary/50 rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <span className="text-foreground truncate">{item.name}</span>
                      </span>
                      <span className="font-bold text-primary">{item.count}</span>
                    </div>
                  ))
                )}
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
