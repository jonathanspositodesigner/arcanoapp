import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Smartphone, Trophy, RefreshCw, Timer, Zap, Link2, CalendarIcon, Clock, TrendingUp, Users, PieChart, RotateCcw, ShoppingCart, KeyRound, LayoutGrid, Maximize2, AlertCircle } from "lucide-react";
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
import { useDashboardGrid } from "@/hooks/useDashboardGrid";
import { GridDashboard } from "@/components/GridDashboard";
import { GridCard } from "@/components/GridCard";

type DateFilter = 1 | "yesterday" | 7 | 15 | 30 | 90 | "all" | "custom";

interface PromptRanking {
  prompt_title: string;
  click_count: number;
}

interface PlanUsageStats {
  plan: string;
  copies: number;
  users: number;
  avgPerUser: number;
}

interface CollectionStats {
  totalViews: number;
  topCollections: { name: string; count: number }[];
}

interface PurchaseHourStats {
  hour: number;
  count: number;
}

const COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

// Helper component to load signed URLs for ranking item images
const RankingItemImage = ({ imageUrl, title, type }: { imageUrl: string; title: string; type: 'prompt' | 'arte' }) => {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!imageUrl) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(false);
      
      // Parse URL: https://xxx.supabase.co/storage/v1/object/public/bucket-name/filename.ext
      // Extract bucket and filePath using regex
      const match = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      
      if (!match) {
        setFinalUrl(imageUrl);
        setLoading(false);
        return;
      }
      
      const bucket = match[1];
      const filePath = match[2];

      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
          body: { bucket, filePath }
        });
        
        if (fnError || !data?.signedUrl) {
          setFinalUrl(imageUrl);
        } else {
          setFinalUrl(data.signedUrl);
        }
      } catch {
        setFinalUrl(imageUrl);
      }
      setLoading(false);
    };

    fetchSignedUrl();
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="w-full h-40 rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (error || !finalUrl) {
    return (
      <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Imagem não disponível</span>
      </div>
    );
  }

  const isVideo = finalUrl.includes('.mp4') || finalUrl.includes('.webm') || finalUrl.includes('.mov');

  return (
    <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted">
      {isVideo ? (
        <video 
          src={finalUrl} 
          className="w-full h-full object-contain"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setError(true)}
        />
      ) : (
        <img 
          src={finalUrl} 
          alt={title}
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

const AdminAnalyticsDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  
  // Access stats (from page_views)
  const [todayAccess, setTodayAccess] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [periodAccess, setPeriodAccess] = useState({ total: 0, mobile: 0, desktop: 0 });
  
  // Stats that DON'T depend on user_sessions (kept)
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [todayInstallations, setTodayInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  const [todayPasswordResets, setTodayPasswordResets] = useState(0);
  const [topPrompts, setTopPrompts] = useState<PromptRanking[]>([]);
  const [topArtes, setTopArtes] = useState<PromptRanking[]>([]);
  const [artesClickTypeStats, setArtesClickTypeStats] = useState({ canva: 0, psd: 0, download: 0 });
  const [topRankingViewMode, setTopRankingViewMode] = useState<'prompts' | 'artes'>('prompts');
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
  const [collectionStats, setCollectionStats] = useState<CollectionStats>({
    totalViews: 0, topCollections: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Conversion rate (simplified - without session dependency)
  const [conversionRate, setConversionRate] = useState({ visitors: 0, buyers: 0, rate: 0 });
  const [purchaseHourStats, setPurchaseHourStats] = useState<PurchaseHourStats[]>([]);
  
  // Peak hours and access evolution charts
  const [peakHours, setPeakHours] = useState<{ hour: number; count: number }[]>([]);
  const [accessChartData, setAccessChartData] = useState<{ date: string; mobile: number; desktop: number; total: number }[]>([]);
  const [avgAccessPerDay, setAvgAccessPerDay] = useState(0);
  
  // First access stats
  const [firstAccessStats, setFirstAccessStats] = useState({ 
    changed: 0, 
    pending: 0, 
    pendingUsers: [] as { id: string; email: string; name: string | null }[],
    changedUsers: [] as { id: string; email: string; name: string | null }[]
  });
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [firstAccessModalView, setFirstAccessModalView] = useState<'changed' | 'pending'>('pending');
  
  // Refund stats
  const [refundStats, setRefundStats] = useState({
    refundedCount: 0,
    chargebackCount: 0,
    recentLogs: [] as { email: string; status: string; pack: string; date: string }[]
  });
  const [showRefundModal, setShowRefundModal] = useState(false);
  
  // Top ranking item preview modal
  const [selectedRankingItem, setSelectedRankingItem] = useState<{
    type: 'prompt' | 'arte';
    title: string;
    imageUrl: string | null;
    prompt?: string;
    category?: string;
    canvaLink?: string;
    driveLink?: string;
  } | null>(null);
  
  // Abandoned checkouts stats
  const [abandonedCheckoutsStats, setAbandonedCheckoutsStats] = useState({
    total: 0,
    pending: 0,
    potentialValue: 0,
    today: 0
  });
  
  const navigate = useNavigate();
  
  // Grid layout system
  const {
    layouts,
    isEditing,
    handleLayoutChange,
    resetLayouts,
    toggleEditing,
  } = useDashboardGrid();

  // Retorna a data de início e fim do período em formato ISO
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

      // Fetch TODAY's access from page_views (with pagination)
      const todayAccessData = await fetchAllPageViews(todayMidnight);
      const todayMobile = todayAccessData.filter((a) => a.device_type === "mobile").length;
      const todayDesktop = todayAccessData.filter((a) => a.device_type === "desktop").length;
      setTodayAccess({ total: todayAccessData.length, mobile: todayMobile, desktop: todayDesktop });

      // Fetch PERIOD access from page_views (with pagination)
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

      // Process ACCESS EVOLUTION data (by date)
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

      // Calculate AVERAGE accesses per day (for retention card)
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

      // Fetch top artes and click type stats
      let artesClicksQuery = supabase.from("arte_clicks").select("arte_title, click_type");
      if (threshold.start) {
        artesClicksQuery = artesClicksQuery.gte("clicked_at", threshold.start);
      }
      if (threshold.end) {
        artesClicksQuery = artesClicksQuery.lte("clicked_at", threshold.end);
      }
      const { data: artesClicksData } = await artesClicksQuery;

      if (artesClicksData) {
        const clickCounts: Record<string, number> = {};
        let canvaClicks = 0;
        let psdClicks = 0;
        let downloadClicks = 0;
        
        artesClicksData.forEach((click) => {
          clickCounts[click.arte_title] = (clickCounts[click.arte_title] || 0) + 1;
          
          if (click.click_type === 'canva') canvaClicks++;
          else if (click.click_type === 'psd') psdClicks++;
          else downloadClicks++;
        });

        const ranked = Object.entries(clickCounts)
          .map(([prompt_title, click_count]) => ({ prompt_title, click_count }))
          .sort((a, b) => b.click_count - a.click_count)
          .slice(0, 10);

        setTopArtes(ranked);
        setArtesClickTypeStats({ canva: canvaClicks, psd: psdClicks, download: downloadClicks });
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

      // Fetch top purchased packs for artes
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

      // Fetch plan usage stats
      const { data: premiumUsers } = await supabase
        .from("premium_users")
        .select("user_id, plan_type")
        .eq("is_active", true);

      if (premiumUsers) {
        let copiesQuery = supabase.from("daily_prompt_copies").select("user_id, copy_date");
        if (threshold.start) {
          copiesQuery = copiesQuery.gte("copied_at", threshold.start);
        }
        if (threshold.end) {
          copiesQuery = copiesQuery.lte("copied_at", threshold.end);
        }
        const { data: copiesData } = await copiesQuery;

        if (copiesData) {
          const userPlanMap: Record<string, string> = {};
          premiumUsers.forEach(u => {
            if (u.plan_type) userPlanMap[u.user_id] = u.plan_type;
          });

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

      // Fetch artes usage stats
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

      // Fetch top purchased plans
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

      // Fetch top purchased packs
      let purchasedPacksQuery = supabase.from("user_pack_purchases").select("pack_slug, purchased_at");
      if (threshold.start) {
        purchasedPacksQuery = purchasedPacksQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        purchasedPacksQuery = purchasedPacksQuery.lte("purchased_at", threshold.end);
      }
      const { data: purchasedPacksDataNew } = await purchasedPacksQuery;

      if (purchasedPacksDataNew) {
        const packCounts: Record<string, number> = {};
        purchasedPacksDataNew.forEach(p => {
          const packName = p.pack_slug || 'Sem Pack';
          packCounts[packName] = (packCounts[packName] || 0) + 1;
        });
        
        const topPacksList = Object.entries(packCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTopPurchasedPacks(topPacksList);
      }

      // Fetch collection stats
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

        const collectionCounts: Record<string, number> = {};
        collectionViewsData.forEach((view) => {
          collectionCounts[view.collection_name] = (collectionCounts[view.collection_name] || 0) + 1;
        });

        const topCollections = Object.entries(collectionCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setCollectionStats({
          totalViews,
          topCollections
        });
      }

      // Conversion rate - using user_sessions for unique visitors
      let appSalesQuery = supabase.from("webhook_logs")
        .select("id")
        .eq("from_app", true)
        .eq("result", "success")
        .in("status", ["paid", "approved"]);
      
      if (threshold.start) {
        appSalesQuery = appSalesQuery.gte("received_at", threshold.start);
      }
      if (threshold.end) {
        appSalesQuery = appSalesQuery.lte("received_at", threshold.end);
      }
      const { data: appSalesData } = await appSalesQuery;
      
      const buyers = appSalesData?.length || 0;
      
      // Fetch unique sessions for visitor count
      let sessionsQuery = supabase.from("user_sessions").select("session_id");
      if (threshold.start) {
        sessionsQuery = sessionsQuery.gte("created_at", threshold.start);
      }
      if (threshold.end) {
        sessionsQuery = sessionsQuery.lte("created_at", threshold.end);
      }
      const { data: sessionsData } = await sessionsQuery;
      
      const uniqueVisitors = sessionsData 
        ? new Set(sessionsData.map(s => s.session_id)).size 
        : 0;
      
      const conversionRateValue = uniqueVisitors > 0 
        ? (buyers / uniqueVisitors) * 100 
        : 0;
      
      setConversionRate({
        visitors: uniqueVisitors,
        buyers,
        rate: conversionRateValue
      });

      // Purchase hours - use pack purchases data for hourly stats
      let purchaseHoursQuery = supabase.from("user_pack_purchases").select("id, purchased_at");
      if (threshold.start) {
        purchaseHoursQuery = purchaseHoursQuery.gte("purchased_at", threshold.start);
      }
      if (threshold.end) {
        purchaseHoursQuery = purchaseHoursQuery.lte("purchased_at", threshold.end);
      }
      const { data: purchaseHoursData } = await purchaseHoursQuery;
      
      if (purchaseHoursData && purchaseHoursData.length > 0) {
        const purchaseHourCounts: Record<number, number> = {};
        for (let i = 0; i < 24; i++) purchaseHourCounts[i] = 0;
        
        purchaseHoursData.forEach(purchase => {
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

      // First access stats with pagination
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

      // Refund stats
      const { data: refundLogsData } = await supabase
        .from("webhook_logs")
        .select("email, status, mapping_type, received_at, payload")
        .or("status.eq.refunded,status.eq.chargeback")
        .order("received_at", { ascending: false })
        .limit(50);

      if (refundLogsData) {
        const refundedCount = refundLogsData.filter(l => l.status === 'refunded').length;
        const chargebackCount = refundLogsData.filter(l => l.status === 'chargeback').length;
        
        const recentLogs = refundLogsData.slice(0, 20).map(log => {
          const payload = log.payload as any;
          const packInfo = payload?.product?.name || log.mapping_type || 'Pack não identificado';
          return {
            email: log.email || 'Email não registrado',
            status: log.status || 'desconhecido',
            pack: packInfo,
            date: log.received_at ? new Date(log.received_at).toLocaleString('pt-BR') : 'Data não registrada'
          };
        });

        setRefundStats({
          refundedCount,
          chargebackCount,
          recentLogs
        });
      }

      // Abandoned checkouts stats
      let abandonedQuery = supabase
        .from('abandoned_checkouts')
        .select('remarketing_status, amount, abandoned_at');

      if (threshold.start) {
        abandonedQuery = abandonedQuery.gte('abandoned_at', threshold.start);
        if (threshold.end) {
          abandonedQuery = abandonedQuery.lte('abandoned_at', threshold.end);
        }
      }

      const { data: abandonedData } = await abandonedQuery;

      const abandonedTotal = abandonedData?.length || 0;
      const abandonedPending = abandonedData?.filter(a => a.remarketing_status === 'pending').length || 0;
      const abandonedValue = abandonedData
        ?.filter(a => a.remarketing_status === 'pending')
        ?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
      
      // Count today's abandoned checkouts
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const abandonedToday = abandonedData?.filter(a => 
        a.abandoned_at && new Date(a.abandoned_at) >= todayStart
      ).length || 0;

      setAbandonedCheckoutsStats({
        total: abandonedTotal,
        pending: abandonedPending,
        potentialValue: abandonedValue,
        today: abandonedToday
      });

      setIsLoading(false);
      setLastUpdate(new Date());
    };

    fetchAnalytics();
  }, [dateFilter, refreshKey, customDateRange]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Fetch ranking item details for preview modal
  const handleRankingItemClick = async (title: string, type: 'prompt' | 'arte') => {
    if (type === 'prompt') {
      // Try admin_prompts first
      const { data: adminPrompt } = await supabase
        .from("admin_prompts")
        .select("title, image_url, prompt, category")
        .eq("title", title)
        .maybeSingle();
      
      if (adminPrompt) {
        setSelectedRankingItem({
          type: 'prompt',
          title: adminPrompt.title,
          imageUrl: adminPrompt.image_url,
          prompt: adminPrompt.prompt,
          category: adminPrompt.category
        });
        return;
      }
      
      // Try partner_prompts
      const { data: partnerPrompt } = await supabase
        .from("partner_prompts")
        .select("title, image_url, prompt, category")
        .eq("title", title)
        .maybeSingle();
      
      if (partnerPrompt) {
        setSelectedRankingItem({
          type: 'prompt',
          title: partnerPrompt.title,
          imageUrl: partnerPrompt.image_url,
          prompt: partnerPrompt.prompt,
          category: partnerPrompt.category
        });
      }
    } else {
      // Try admin_artes first
      const { data: adminArte } = await supabase
        .from("admin_artes")
        .select("title, image_url, category, canva_link, drive_link")
        .eq("title", title)
        .maybeSingle();
      
      if (adminArte) {
        setSelectedRankingItem({
          type: 'arte',
          title: adminArte.title,
          imageUrl: adminArte.image_url,
          category: adminArte.category,
          canvaLink: adminArte.canva_link || undefined,
          driveLink: adminArte.drive_link || undefined
        });
        return;
      }
      
      // Try partner_artes
      const { data: partnerArte } = await supabase
        .from("partner_artes")
        .select("title, image_url, category, canva_link, drive_link")
        .eq("title", title)
        .maybeSingle();
      
      if (partnerArte) {
        setSelectedRankingItem({
          type: 'arte',
          title: partnerArte.title,
          imageUrl: partnerArte.image_url,
          category: partnerArte.category,
          canvaLink: partnerArte.canva_link || undefined,
          driveLink: partnerArte.drive_link || undefined
        });
      }
    }
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

  // Build version timestamp for cache debugging (horário do Brasil)
  const BUILD_VERSION = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard de Métricas</h2>
          <p className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')} • Atualiza automaticamente
          </p>
          <p className="text-[10px] text-muted-foreground/50 font-mono">v{BUILD_VERSION}</p>
        </div>
        <div className="flex items-center gap-2">
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
          
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={toggleEditing}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            {isEditing ? "Concluir" : "Editar Layout"}
          </Button>
          
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetLayouts}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
          )}
        </div>
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
          {isEditing && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-primary font-medium">
                🔄 Modo de edição ativo - Arraste pela barra superior para mover, arraste pelas bordas para redimensionar
              </p>
            </div>
          )}

          <GridDashboard
            layouts={layouts}
            isEditing={isEditing}
            onLayoutChange={handleLayoutChange}
          >
            {/* Today's Stats Card */}
            <GridCard key="today-access" isEditing={isEditing} className="border-2 border-green-500 bg-green-500/10">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Eye className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Acessos Hoje</p>
                    <p className="text-3xl font-bold text-green-600">{todayAccess.total}</p>
                    <p className="text-xs text-green-600/80 mt-1">
                      📱 {todayAccess.mobile} mobile · 💻 {todayAccess.desktop} desktop
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-green-500/20 grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{todayInstallations.total}</p>
                    <p className="text-xs text-green-600/70">📲 Instalações</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{todayPasswordResets}</p>
                    <p className="text-xs text-green-600/70">🔑 Redefiniram senha</p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Period Stats Card */}
            <GridCard key="period-access" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Acessos no Período</p>
                    <p className="text-3xl font-bold text-foreground">{periodAccess.total}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      📱 {periodAccess.mobile} mobile · 💻 {periodAccess.desktop} desktop
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Installations Card */}
            <GridCard key="installations" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
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
              </div>
            </GridCard>

            {/* Top Prompts/Artes Card */}
            <GridCard key="top-ranking" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {topRankingViewMode === 'prompts' ? 'Top 10 Prompts' : 'Top 10 Artes'}
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
                  <ul className="space-y-2 overflow-y-auto flex-1">
                    {(topRankingViewMode === 'prompts' ? topPrompts : topArtes).map((item, index) => (
                      <li 
                        key={item.prompt_title} 
                        className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors"
                        onClick={() => handleRankingItemClick(item.prompt_title, topRankingViewMode === 'prompts' ? 'prompt' : 'arte')}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-bold text-primary">{index + 1}.</span>
                          <span className="truncate text-foreground hover:underline">{item.prompt_title}</span>
                        </span>
                        <span className="text-muted-foreground font-medium ml-2">{item.click_count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GridCard>

            {/* Artes Click Type Stats Card */}
            <GridCard key="artes-click-types" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/20 rounded-full">
                    <PieChart className="h-6 w-6 text-cyan-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Downloads por Tipo</p>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#00C4CC]" />
                      <span className="text-sm text-foreground">Canva</span>
                    </div>
                    <span className="font-bold text-foreground">{artesClickTypeStats.canva}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#31A8FF]" />
                      <span className="text-sm text-foreground">PSD</span>
                    </div>
                    <span className="font-bold text-foreground">{artesClickTypeStats.psd}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                      <span className="text-sm text-foreground">Download</span>
                    </div>
                    <span className="font-bold text-foreground">{artesClickTypeStats.download}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-border mt-auto">
                    <p className="text-xs text-muted-foreground text-center">
                      Total: {artesClickTypeStats.canva + artesClickTypeStats.psd + artesClickTypeStats.download} cliques
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Collection Links Card */}
            <GridCard key="collection-links" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/20 rounded-full">
                    <Link2 className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Links de Coleção</p>
                    <p className="text-xs text-muted-foreground">Acessos via link de coleção</p>
                  </div>
                </div>
                <div className="space-y-2 overflow-y-auto flex-1">
                  {collectionStats.topCollections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum acesso registrado</p>
                  ) : (
                    collectionStats.topCollections.map((collection, index) => (
                      <div key={collection.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-bold text-indigo-500">{index + 1}.</span>
                          <span className="truncate text-foreground">{collection.name}</span>
                        </span>
                        <span className="text-muted-foreground font-medium ml-2">{collection.count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-border">
                  <p className="text-sm font-medium text-center">
                    Total: <span className="text-indigo-500">{collectionStats.totalViews}</span> acessos
                  </p>
                </div>
              </div>
            </GridCard>

            {/* First Access Stats Card */}
            <GridCard key="first-access" isEditing={isEditing} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="p-6 h-full flex flex-col" onClick={() => setShowFirstAccessModal(true)}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-full">
                    <KeyRound className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Primeiro Acesso</p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-center justify-between bg-green-500/10 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground">Redefiniram senha</span>
                    <span className="font-bold text-green-600">{firstAccessStats.changed}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-500/10 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground">Pendentes</span>
                    <span className="font-bold text-amber-600">{firstAccessStats.pending}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Clique para ver detalhes
                  </p>
                </div>
              </div>
            </GridCard>

            {/* Top Purchased Plans/Packs Card */}
            <GridCard key="top-purchased" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
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
                  <div className="space-y-3 overflow-y-auto flex-1">
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
              </div>
            </GridCard>

            {/* Top Categories/Packs Chart */}
            <GridCard key="top-categories" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
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
                <div className="flex-1 min-h-[150px]">
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
              </div>
            </GridCard>

            {/* Peak Hours */}
            <GridCard key="hourly-stats" isEditing={isEditing} className="border-2 border-orange-500/30">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-full">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Horário de Pico</p>
                </div>
                
                {peakHours.some(h => h.count > 0) ? (
                  <>
                    <div className="flex-1 min-h-[120px]">
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
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center">Sem dados no período</p>
                  </div>
                )}
              </div>
            </GridCard>

            {/* Conversion Rate - SIMPLIFIED (no visitor count) */}
            <GridCard key="conversion" isEditing={isEditing} className="border-2 border-green-500/30">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Vendas do App</p>
                </div>
                
                <div className="text-center space-y-3 flex-1 flex flex-col justify-center">
                  <p className="text-4xl font-bold text-green-500">
                    {conversionRate.buyers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🛒 Compras via aplicativo
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Taxa de conversão indisponível
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Retention - Average per day */}
            <GridCard key="retention" isEditing={isEditing} className="border-2 border-cyan-500/30">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/20 rounded-full">
                    <RotateCcw className="h-6 w-6 text-cyan-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Média de Acessos</p>
                </div>
                
                <div className="text-center space-y-3 flex-1 flex flex-col justify-center">
                  <p className="text-4xl font-bold text-cyan-500">
                    {avgAccessPerDay}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📊 Acessos/dia no período
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {accessChartData.length} dias com dados
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Purchase Hours */}
            <GridCard key="purchase-hours" isEditing={isEditing} className="border-2 border-emerald-500/30">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <ShoppingCart className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Compras por Hora</p>
                </div>
                
                {purchaseHourStats.some(h => h.count > 0) ? (
                  <>
                    <div className="flex-1 min-h-[120px]">
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
              </div>
            </GridCard>

            {/* Refunds */}
            <GridCard key="refunds" isEditing={isEditing} className="border-2 border-red-500/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="p-6 h-full flex flex-col" onClick={() => setShowRefundModal(true)}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-full">
                    <RotateCcw className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Reembolsos</p>
                </div>
                
                <div className="text-center space-y-3 flex-1 flex flex-col justify-center">
                  <p className="text-4xl font-bold text-red-500">
                    {refundStats.refundedCount + refundStats.chargebackCount}
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-500">{refundStats.refundedCount}</p>
                      <p className="text-xs text-muted-foreground">Reembolsos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{refundStats.chargebackCount}</p>
                      <p className="text-xs text-muted-foreground">Chargebacks</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Clique para ver logs detalhados
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Abandoned Checkouts */}
            <GridCard key="abandoned-checkouts" isEditing={isEditing} className="border-2 border-orange-500/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="p-6 h-full flex flex-col relative" onClick={() => navigate('/admin-abandoned-checkouts')}>
                {abandonedCheckoutsStats.today > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 min-w-6 px-1.5 flex items-center justify-center">
                    +{abandonedCheckoutsStats.today} hoje
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-full">
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Checkouts Abandonados</p>
                </div>
                
                <div className="text-center space-y-3 flex-1 flex flex-col justify-center">
                  <p className="text-4xl font-bold text-orange-500">
                    {abandonedCheckoutsStats.total}
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-500">{abandonedCheckoutsStats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-500">
                        R$ {abandonedCheckoutsStats.potentialValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Valor Potencial</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Clique para gerenciar remarketing
                    </p>
                  </div>
                </div>
              </div>
            </GridCard>

            {/* Access Chart */}
            <GridCard key="access-chart" isEditing={isEditing}>
              <div className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold text-foreground mb-4">Evolução de Acessos</h3>
                {accessChartData.length > 0 ? (
                  <div className="flex-1 min-h-[200px]">
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
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground text-center">Sem dados no período</p>
                  </div>
                )}
              </div>
            </GridCard>
          </GridDashboard>

          {/* First Access Modal */}
          <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Primeiro Acesso - Detalhes</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={firstAccessModalView === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFirstAccessModalView('pending')}
                >
                  Pendentes ({firstAccessStats.pending})
                </Button>
                <Button
                  variant={firstAccessModalView === 'changed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFirstAccessModalView('changed')}
                >
                  Redefiniram ({firstAccessStats.changed})
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {(firstAccessModalView === 'pending' ? firstAccessStats.pendingUsers : firstAccessStats.changedUsers).map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{user.name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Refund Modal */}
          <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Logs de Reembolsos e Chargebacks</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {refundStats.recentLogs.map((log, index) => (
                    <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{log.email}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.status === 'chargeback' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                        }`}>
                          {log.status === 'chargeback' ? 'Chargeback' : 'Reembolso'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.pack}</p>
                      <p className="text-xs text-muted-foreground mt-1">{log.date}</p>
                      <p className="text-xs text-red-500 mt-1">✓ Acesso removido</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Ranking Item Preview Modal */}
          <Dialog open={!!selectedRankingItem} onOpenChange={(open) => !open && setSelectedRankingItem(null)}>
            <DialogContent className="max-w-sm sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {selectedRankingItem?.type === 'prompt' ? 'Visualizar Prompt' : 'Visualizar Arte'}
                </DialogTitle>
              </DialogHeader>
              {selectedRankingItem && (
                <div className="space-y-3">
                  {selectedRankingItem.imageUrl && (
                    <RankingItemImage 
                      imageUrl={selectedRankingItem.imageUrl} 
                      title={selectedRankingItem.title}
                      type={selectedRankingItem.type}
                    />
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{selectedRankingItem.title}</h3>
                    {selectedRankingItem.category && (
                      <span className="inline-block mt-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {selectedRankingItem.category}
                      </span>
                    )}
                  </div>
                  
                  {selectedRankingItem.type === 'prompt' && selectedRankingItem.prompt && (
                    <div className="bg-secondary/50 rounded-lg p-2 max-h-20 overflow-hidden">
                      <p className="text-xs text-muted-foreground mb-0.5">Prompt:</p>
                      <p className="text-xs text-foreground line-clamp-3">{selectedRankingItem.prompt}</p>
                    </div>
                  )}
                  
                  {selectedRankingItem.type === 'arte' && (
                    <div className="flex gap-2">
                      {selectedRankingItem.canvaLink && (
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          style={{ backgroundColor: '#00C4CC' }}
                          onClick={() => window.open(selectedRankingItem.canvaLink, '_blank')}
                        >
                          Abrir no Canva
                        </Button>
                      )}
                      {selectedRankingItem.driveLink && (
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          style={{ backgroundColor: '#31A8FF' }}
                          onClick={() => window.open(selectedRankingItem.driveLink, '_blank')}
                        >
                          Baixar PSD
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
