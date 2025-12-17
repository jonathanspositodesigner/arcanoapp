import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Users, ShoppingCart, Eye, TrendingUp, 
  CalendarIcon, Package, FileText, Image
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import AdminGoalsCard from "./AdminGoalsCard";

const AdminGeneralDashboard = () => {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPremiumUsers: 0,
    totalPackPurchases: 0,
    totalPrompts: 0,
    totalArtes: 0,
    totalPartners: 0,
    newUsersToday: 0,
    totalRevenue: 0
  });

  const fetchAllStats = async () => {
    setIsLoading(true);
    const start = startOfDay(startDate).toISOString();
    const end = endOfDay(endDate).toISOString();

    try {
      // Fetch all data in parallel
      const [
        sessionsResult,
        premiumUsersResult,
        premiumArtesUsersResult,
        packPurchasesResult,
        promptsResult,
        artesResult,
        partnersResult,
        partnersArtesResult
      ] = await Promise.all([
        // Total sessions
        supabase
          .from('user_sessions')
          .select('id', { count: 'exact', head: true })
          .gte('entered_at', start)
          .lte('entered_at', end),
        
        // Premium users (Prompts)
        supabase
          .from('premium_users')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // Premium users (Artes)
        supabase
          .from('premium_artes_users')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // Pack purchases
        supabase
          .from('user_pack_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // Total prompts
        supabase
          .from('admin_prompts')
          .select('id', { count: 'exact', head: true }),
        
        // Total artes
        supabase
          .from('admin_artes')
          .select('id', { count: 'exact', head: true }),
        
        // Partners (Prompts)
        supabase
          .from('partners')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // Partners (Artes)
        supabase
          .from('partners_artes')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
      ]);

      setStats({
        totalSessions: sessionsResult.count || 0,
        totalPremiumUsers: (premiumUsersResult.count || 0) + (premiumArtesUsersResult.count || 0),
        totalPackPurchases: packPurchasesResult.count || 0,
        totalPrompts: promptsResult.count || 0,
        totalArtes: artesResult.count || 0,
        totalPartners: (partnersResult.count || 0) + (partnersArtesResult.count || 0),
        newUsersToday: 0,
        totalRevenue: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, [startDate, endDate]);

  const statCards = [
    {
      title: "Acessos Totais",
      value: stats.totalSessions,
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Usuários Premium",
      value: stats.totalPremiumUsers,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Compras de Packs",
      value: stats.totalPackPurchases,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Total de Prompts",
      value: stats.totalPrompts,
      icon: FileText,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Total de Artes",
      value: stats.totalArtes,
      icon: Image,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      title: "Parceiros Ativos",
      value: stats.totalPartners,
      icon: TrendingUp,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Geral</h2>
          <p className="text-muted-foreground">Métricas consolidadas de todas as plataformas</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">até</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {isLoading ? "..." : stat.value.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className={cn("p-3 rounded-full", stat.bgColor)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Goals Section */}
      <AdminGoalsCard />
    </div>
  );
};

export default AdminGeneralDashboard;
