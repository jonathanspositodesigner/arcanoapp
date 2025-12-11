import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy, RefreshCw, Copy, Timer, Zap, Link2, CalendarIcon, Clock, TrendingUp, Users, PieChart, RotateCcw, ShoppingCart, KeyRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  trackedSessions: number;
  bounceCount: number;
  bounceRate: number;
  avgDuration: number;
}

interface CollectionStats {
  totalViews: number;
  topCollections: { name: string; count: number }[];
}

interface HourlyStats {
  hour: number;
  count: number;
}

interface AccessTypeStats {
  type: string;
  count: number;
  percentage: number;
}

interface FunnelStats {
  visits: number;
  clicks: number;
  copies: number;
  clickRate: number;
  copyRate: number;
}

interface RetentionStats {
  newUsers: number;
  returningUsers: number;
  retentionRate: number;
}

interface PurchaseHourStats {
  hour: number;
  count: number;
}

const COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

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
    totalSessions: 0, trackedSessions: 0, bounceCount: 0, bounceRate: 0, avgDuration: 0
  });
  const [collectionStats, setCollectionStats] = useState<CollectionStats>({
    totalViews: 0, topCollections: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // New metrics state
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [conversionRate, setConversionRate] = useState({ visitors: 0, buyers: 0, rate: 0 });
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({ visits: 0, clicks: 0, copies: 0, clickRate: 0, copyRate: 0 });
  const [accessTypeStats, setAccessTypeStats] = useState<AccessTypeStats[]>([]);
  const [retentionStats, setRetentionStats] = useState<RetentionStats>({ newUsers: 0, returningUsers: 0, retentionRate: 0 });
  const [purchaseHourStats, setPurchaseHourStats] = useState<PurchaseHourStats[]>([]);
  
  // First access stats
  const [firstAccessStats, setFirstAccessStats] = useState({ 
    changed: 0, 
    pending: 0, 
    pendingUsers: [] as { id: string; email: string; name: string | null }[],
    changedUsers: [] as { id: string; email: string; name: string | null }[]
  });
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [firstAccessModalView, setFirstAccessModalView] = useState<'changed' | 'pending'>('pending');

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

      // Fetch top purchased packs for artes (from user_pack_purchases)
      let packPurchasesQuery = supabase.from("user_pack_purchases").select("pack_slug, purchased_at");
      if (threshold.start) {
        packPurchasesQuery = packPurchasesQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        packPurchasesQuery = packPurchasesQuery.lte("purchased_at", threshold.end);
      }
      const { data: packPurchasesData } = await packPurchasesQuery;

      if (packPurchasesData && packPurchasesData.length > 0) {
        const packCounts: Record<string, number> = {};
        
        packPurchasesData.forEach(purchase => {
          const packName = purchase.pack_slug || 'Sem Pack';
          packCounts[packName] = (packCounts[packName] || 0) + 1;
        });
        
        const topPacksList = Object.entries(packCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopPacks(topPacksList);
      } else {
        setTopPacks([]);
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

      // ========== FETCH SESSION STATS (bounce rate e tempo médio) com paginação ==========
      const fetchAllSessions = async () => {
        const allRecords: { session_id: string; page_path: string; duration_seconds: number | null; entered_at: string }[] = [];
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          let query = supabase
            .from("user_sessions")
            .select("session_id, page_path, duration_seconds, entered_at")
            .in("page_path", ["/biblioteca-prompts", "/biblioteca-artes"])
            .range(offset, offset + batchSize - 1);
          
          if (threshold.start) {
            query = query.gte("entered_at", threshold.start);
          }
          if (threshold.end) {
            query = query.lte("entered_at", threshold.end);
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
      
      const statsSessionsData = await fetchAllSessions();

      if (statsSessionsData && statsSessionsData.length > 0) {
        // Agrupa por session_id para ter sessões únicas
        const sessionMap = new Map<string, { duration: number }>();
        statsSessionsData.forEach(s => {
          if (!sessionMap.has(s.session_id) || (s.duration_seconds || 0) > (sessionMap.get(s.session_id)?.duration || 0)) {
            sessionMap.set(s.session_id, { duration: s.duration_seconds || 0 });
          }
        });
        
        const uniqueSessionsList = Array.from(sessionMap.values());
        const trackedSessions = uniqueSessionsList.length;
        
        // Bounce = session < 3 seconds
        const bounceCount = uniqueSessionsList.filter(s => s.duration < 3).length;
        const bounceRate = trackedSessions > 0 ? Math.round((bounceCount / trackedSessions) * 100) : 0;
        
        // Average duration (exclude bounces for more accurate reading)
        const nonBounceSessions = uniqueSessionsList.filter(s => s.duration >= 3);
        const avgDuration = nonBounceSessions.length > 0 
          ? Math.round(nonBounceSessions.reduce((sum, s) => sum + s.duration, 0) / nonBounceSessions.length)
          : 0;

        // Usa visitantes únicos de page_views como total de sessões
        setSessionStats({
          totalSessions: periodUnique,
          trackedSessions,
          bounceCount,
          bounceRate,
          avgDuration
        });
      } else {
        setSessionStats({
          totalSessions: periodUnique,
          trackedSessions: 0,
          bounceCount: 0,
          bounceRate: 0,
          avgDuration: 0
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

      // ========== NEW METRIC 1: HORÁRIO DE PICO (Peak Hours) ==========
      if (allPageViewsData && allPageViewsData.length > 0) {
        const hourCounts: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourCounts[i] = 0;
        
        allPageViewsData.forEach(pv => {
          const hour = new Date(pv.viewed_at).getHours();
          hourCounts[hour]++;
        });
        
        const hourlyData = Object.entries(hourCounts).map(([hour, count]) => ({
          hour: parseInt(hour),
          count
        })).sort((a, b) => a.hour - b.hour);
        
        setHourlyStats(hourlyData);
      }

      // ========== NEW METRIC 2: TAXA DE CONVERSÃO - ARTES ==========
      // Visitors to /biblioteca-artes vs pack buyers
      const bibliotecaArtesVisitors = allPageViewsData?.filter(pv => 
        pv.viewed_at && pv.user_agent
      ).length || 0;
      
      let purchasesQuery = supabase.from("user_pack_purchases").select("id, purchased_at");
      if (threshold.start) {
        purchasesQuery = purchasesQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        purchasesQuery = purchasesQuery.lte("purchased_at", threshold.end);
      }
      const { data: purchasesData } = await purchasesQuery;
      const buyersCount = purchasesData?.length || 0;
      
      const conversionRateValue = bibliotecaArtesVisitors > 0 
        ? Math.round((buyersCount / bibliotecaArtesVisitors) * 10000) / 100 
        : 0;
      
      setConversionRate({
        visitors: bibliotecaArtesVisitors,
        buyers: buyersCount,
        rate: conversionRateValue
      });

      // ========== NEW METRIC 3: FUNIL DE ENGAJAMENTO - PROMPTS ==========
      // Visits → Clicks → Copies
      const promptVisits = allPageViewsData?.filter(pv => true).length || 0;
      
      let promptClicksQuery = supabase.from("prompt_clicks").select("id");
      if (threshold.start) {
        promptClicksQuery = promptClicksQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        promptClicksQuery = promptClicksQuery.lte("clicked_at", threshold.end);
      }
      const { data: promptClicksData } = await promptClicksQuery;
      const promptClicksCount = promptClicksData?.length || 0;
      
      let promptCopiesQuery = supabase.from("daily_prompt_copies").select("id");
      if (threshold.start) {
        promptCopiesQuery = promptCopiesQuery.gte("copied_at", threshold.start);
      }
      if (threshold.end) {
        promptCopiesQuery = promptCopiesQuery.lte("copied_at", threshold.end);
      }
      const { data: promptCopiesData } = await promptCopiesQuery;
      const promptCopiesCount = promptCopiesData?.length || 0;
      
      setFunnelStats({
        visits: promptVisits,
        clicks: promptClicksCount,
        copies: promptCopiesCount,
        clickRate: promptVisits > 0 ? Math.round((promptClicksCount / promptVisits) * 100) : 0,
        copyRate: promptClicksCount > 0 ? Math.round((promptCopiesCount / promptClicksCount) * 100) : 0
      });

      // ========== NEW METRIC 4: DISTRIBUIÇÃO DE TIPOS DE ACESSO - ARTES ==========
      let accessTypesQuery = supabase.from("user_pack_purchases").select("access_type");
      if (threshold.start) {
        accessTypesQuery = accessTypesQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        accessTypesQuery = accessTypesQuery.lte("purchased_at", threshold.end);
      }
      const { data: accessTypesData } = await accessTypesQuery;
      
      if (accessTypesData && accessTypesData.length > 0) {
        const typeCounts: Record<string, number> = {};
        accessTypesData.forEach(item => {
          const type = item.access_type || 'unknown';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const total = accessTypesData.length;
        const typeNameMap: Record<string, string> = {
          '3_meses': '3 Meses',
          '6_meses': '6 Meses',
          '1_ano': '1 Ano',
          'vitalicio': 'Vitalício'
        };
        
        const accessStats = Object.entries(typeCounts).map(([type, count]) => ({
          type: typeNameMap[type] || type,
          count,
          percentage: Math.round((count / total) * 100)
        })).sort((a, b) => b.count - a.count);
        
        setAccessTypeStats(accessStats);
      }

      // ========== NEW METRIC 5: RETENÇÃO DE USUÁRIOS ==========
      // Based on user_agent appearing more than once
      if (allPageViewsData && allPageViewsData.length > 0) {
        const userAgentCounts: Record<string, number> = {};
        allPageViewsData.forEach(pv => {
          if (pv.user_agent) {
            userAgentCounts[pv.user_agent] = (userAgentCounts[pv.user_agent] || 0) + 1;
          }
        });
        
        const uniqueAgents = Object.keys(userAgentCounts).length;
        const returningAgents = Object.values(userAgentCounts).filter(count => count > 1).length;
        const newAgents = uniqueAgents - returningAgents;
        
        setRetentionStats({
          newUsers: newAgents,
          returningUsers: returningAgents,
          retentionRate: uniqueAgents > 0 ? Math.round((returningAgents / uniqueAgents) * 100) : 0
        });
      }

      // ========== NEW METRIC 6: COMPRAS POR PERÍODO DO DIA ==========
      if (purchasesData && purchasesData.length > 0) {
        const purchaseHourCounts: Record<number, number> = {};
        for (let i = 0; i < 24; i++) purchaseHourCounts[i] = 0;
        
        purchasesData.forEach(purchase => {
          if (purchase.purchased_at) {
            const hour = new Date(purchase.purchased_at).getHours();
            purchaseHourCounts[hour]++;
          }
        });
        
        const purchaseHourData = Object.entries(purchaseHourCounts).map(([hour, count]) => ({
          hour: parseInt(hour),
          count
        })).sort((a, b) => a.hour - b.hour);
        
        setPurchaseHourStats(purchaseHourData);
      }

      // ========== FETCH FIRST ACCESS STATS (COM PAGINAÇÃO PARA BUSCAR TODOS) ==========
      const fetchAllProfiles = async () => {
        const allRecords: any[] = [];
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const { data } = await supabase
            .from("profiles")
            .select("id, email, name, password_changed")
            .not("email", "is", null)
            .range(offset, offset + batchSize - 1);
          
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

      const allProfiles = await fetchAllProfiles();

      if (allProfiles && allProfiles.length > 0) {
        const changedUsers = allProfiles
          .filter(p => p.password_changed === true)
          .map(p => ({ id: p.id, email: p.email || '', name: p.name }));
        const pendingUsers = allProfiles
          .filter(p => p.password_changed === false || p.password_changed === null)
          .map(p => ({ id: p.id, email: p.email || '', name: p.name }));
        
        setFirstAccessStats({
          changed: changedUsers.length,
          pending: pendingUsers.length,
          pendingUsers,
          changedUsers
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
                    {sessionStats.bounceCount} bounces de {sessionStats.trackedSessions} sessões rastreadas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({sessionStats.totalSessions} visitantes únicos no período)
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

            {/* First Access Stats Card */}
            <Card className="p-6 border-2 border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-full">
                  <KeyRound className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-foreground">1º Acesso (Senha)</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className="text-center p-2 bg-green-500/10 rounded-lg cursor-pointer hover:bg-green-500/20 transition-colors"
                  onClick={() => {
                    setFirstAccessModalView('changed');
                    setShowFirstAccessModal(true);
                  }}
                >
                  <p className="text-2xl font-bold text-green-500">{firstAccessStats.changed}</p>
                  <p className="text-xs text-muted-foreground">Redefiniram</p>
                </div>
                <div 
                  className="text-center p-2 bg-orange-500/10 rounded-lg cursor-pointer hover:bg-orange-500/20 transition-colors"
                  onClick={() => {
                    setFirstAccessModalView('pending');
                    setShowFirstAccessModal(true);
                  }}
                >
                  <p className="text-2xl font-bold text-orange-500">{firstAccessStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Clique para ver lista
                </p>
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

          {/* NEW METRICS SECTION */}
          <h3 className="text-xl font-bold text-foreground mt-8 mb-4">Métricas Avançadas</h3>
          
          {/* Row 1: Peak Hours + Conversion Rate + Funnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Horário de Pico */}
            <Card className="p-6 border-2 border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-full">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Horário de Pico</p>
              </div>
              
              {hourlyStats.length > 0 ? (
                <>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyStats}>
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
                      const topHours = [...hourlyStats].sort((a, b) => b.count - a.count).slice(0, 3);
                      return (
                        <p className="text-xs text-muted-foreground">
                          🔥 Pico: <span className="font-bold text-orange-500">
                            {topHours.map(h => `${h.hour}h`).join(', ')}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Sem dados</p>
              )}
            </Card>

            {/* Taxa de Conversão - Artes */}
            <Card className="p-6 border-2 border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Taxa de Conversão</p>
              </div>
              
              <div className="text-center space-y-3">
                <p className={`text-4xl font-bold ${
                  conversionRate.rate >= 5 ? 'text-green-500' : 
                  conversionRate.rate >= 2 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {conversionRate.rate}%
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    👀 {conversionRate.visitors.toLocaleString()} visitantes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🛒 {conversionRate.buyers.toLocaleString()} compradores
                  </p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Visitantes que compraram packs
                  </p>
                </div>
              </div>
            </Card>

            {/* Funil de Engajamento - Prompts */}
            <Card className="p-6 border-2 border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Funil - Prompts</p>
              </div>
              
              <div className="space-y-3">
                {/* Funnel visual */}
                <div className="space-y-2">
                  <div className="bg-purple-500/20 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-500">{funnelStats.visits.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Visitas</p>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-xs text-muted-foreground">↓ {funnelStats.clickRate}%</span>
                  </div>
                  <div className="bg-purple-500/30 rounded-lg p-2 text-center mx-4">
                    <p className="text-lg font-bold text-purple-500">{funnelStats.clicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Cliques</p>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-xs text-muted-foreground">↓ {funnelStats.copyRate}%</span>
                  </div>
                  <div className="bg-purple-500/40 rounded-lg p-2 text-center mx-8">
                    <p className="text-lg font-bold text-purple-500">{funnelStats.copies.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Cópias</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: Access Types + Retention + Purchase Hours */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Distribuição de Tipos de Acesso */}
            <Card className="p-6 border-2 border-amber-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <PieChart className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Tipos de Acesso</p>
              </div>
              
              {accessTypeStats.length > 0 ? (
                <>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={accessTypeStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="type"
                        >
                          {accessTypeStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                          formatter={(value: number, name: string) => [`${value} (${accessTypeStats.find(s => s.type === name)?.percentage}%)`, name]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1">
                    {accessTypeStats.map((stat, index) => (
                      <div key={stat.type} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {stat.type}
                        </span>
                        <span className="font-medium">{stat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Sem dados</p>
              )}
            </Card>

            {/* Retenção de Usuários */}
            <Card className="p-6 border-2 border-cyan-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-full">
                  <RotateCcw className="h-6 w-6 text-cyan-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Retenção</p>
              </div>
              
              <div className="text-center space-y-3">
                <p className={`text-4xl font-bold ${
                  retentionStats.retentionRate >= 40 ? 'text-green-500' : 
                  retentionStats.retentionRate >= 20 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {retentionStats.retentionRate}%
                </p>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-cyan-500">{retentionStats.newUsers}</p>
                    <p className="text-xs text-muted-foreground">Novos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-500">{retentionStats.returningUsers}</p>
                    <p className="text-xs text-muted-foreground">Recorrentes</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Usuários que voltaram mais de uma vez
                  </p>
                </div>
              </div>
            </Card>

            {/* Compras por Período do Dia */}
            <Card className="p-6 border-2 border-emerald-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Compras por Hora</p>
              </div>
              
              {purchaseHourStats.some(h => h.count > 0) ? (
                <>
                  <div className="h-[150px]">
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
                <p className="text-sm text-muted-foreground text-center">Sem compras no período</p>
              )}
            </Card>
          </div>

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

      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className={`h-5 w-5 ${firstAccessModalView === 'changed' ? 'text-green-500' : 'text-orange-500'}`} />
              {firstAccessModalView === 'changed' ? 'Usuários que Redefiniram Senha' : 'Usuários Pendentes de 1º Acesso'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Toggle buttons */}
            <div className="flex gap-2">
              <Button
                variant={firstAccessModalView === 'changed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFirstAccessModalView('changed')}
                className={firstAccessModalView === 'changed' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                Redefiniram ({firstAccessStats.changed})
              </Button>
              <Button
                variant={firstAccessModalView === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFirstAccessModalView('pending')}
                className={firstAccessModalView === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                Pendentes ({firstAccessStats.pending})
              </Button>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg ${
              firstAccessModalView === 'changed' ? 'bg-green-500/10' : 'bg-orange-500/10'
            }`}>
              <span className="text-sm font-medium">
                {firstAccessModalView === 'changed' ? 'Total que redefiniram:' : 'Total de pendentes:'}
              </span>
              <span className={`text-lg font-bold ${firstAccessModalView === 'changed' ? 'text-green-500' : 'text-orange-500'}`}>
                {firstAccessModalView === 'changed' ? firstAccessStats.changed : firstAccessStats.pending}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {firstAccessModalView === 'changed' 
                ? 'Esses usuários já redefiniram a senha inicial e acessaram o sistema.'
                : 'Esses usuários ainda não redefiniram a senha inicial. Use o filtro "Pendentes 1º acesso" no E-mail Marketing para enviar uma campanha específica para eles.'
              }
            </p>
            
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {(firstAccessModalView === 'changed' ? firstAccessStats.changedUsers : firstAccessStats.pendingUsers).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {firstAccessModalView === 'changed' ? 'Nenhum usuário redefiniu a senha ainda' : 'Nenhum usuário pendente'}
                  </p>
                ) : (
                  (firstAccessModalView === 'changed' ? firstAccessStats.changedUsers : firstAccessStats.pendingUsers).map((user, index) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-medium w-6">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user.name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowFirstAccessModal(false)}
              >
                Fechar
              </Button>
              {firstAccessModalView === 'pending' && (
                <Button
                  onClick={() => {
                    setShowFirstAccessModal(false);
                    window.location.href = '/admin-email-marketing';
                  }}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Ir para E-mail Marketing
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnalyticsDashboard;
