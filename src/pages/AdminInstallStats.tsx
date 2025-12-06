import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Monitor, TrendingUp } from "lucide-react";

interface InstallStats {
  total: number;
  mobile: number;
  desktop: number;
}

const AdminInstallStats = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InstallStats>({ total: 0, mobile: 0, desktop: 0 });

  useEffect(() => {
    const checkAdminAndFetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin-login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        navigate("/admin-login");
        return;
      }

      setIsAdmin(true);

      // Fetch installation stats
      const { data: installations, error } = await supabase
        .from("app_installations")
        .select("device_type");

      if (!error && installations) {
        const mobile = installations.filter(i => i.device_type === 'mobile').length;
        const desktop = installations.filter(i => i.device_type === 'desktop').length;
        setStats({
          total: installations.length,
          mobile,
          desktop,
        });
      }

      setLoading(false);
    };

    checkAdminAndFetchStats();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Estatísticas de Instalação</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe quantas pessoas instalaram o app no celular e no computador
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Instalações
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Instalações Mobile
              </CardTitle>
              <Smartphone className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{stats.mobile}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? Math.round((stats.mobile / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Instalações Desktop
              </CardTitle>
              <Monitor className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{stats.desktop}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? Math.round((stats.desktop / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminInstallStats;
