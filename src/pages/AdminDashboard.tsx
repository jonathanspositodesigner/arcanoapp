import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle, Settings, LogOut, Bell, Users, Home, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin-login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast.error("Acesso negado");
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);

      // Fetch subscriber count
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      setSubscriberCount(count || 0);
    };

    checkAdminStatus();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie arquivos e contribuições da comunidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários com notificações ativas</p>
              <p className="text-3xl font-bold text-foreground">{subscriberCount}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
            onClick={() => navigate('/admin-upload')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-gradient-primary rounded-full">
                <Upload className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Enviar Arquivo
              </h2>
              <p className="text-muted-foreground">
                Faça upload de novos arquivos exclusivos para a biblioteca
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
            onClick={() => navigate('/admin-community-review')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-green-500 rounded-full">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Analisar Arquivos da Comunidade
              </h2>
              <p className="text-muted-foreground">
                Aprove ou rejeite contribuições enviadas pela comunidade
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
            onClick={() => navigate('/admin-manage-images')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-blue-500 rounded-full">
                <Settings className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Gerenciar Imagens Enviadas
              </h2>
              <p className="text-muted-foreground">
                Edite ou exclua todos os arquivos já publicados
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
            onClick={() => navigate('/admin-push-notifications')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-orange-500 rounded-full">
                <Bell className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Notificações Push
              </h2>
              <p className="text-muted-foreground">
                Envie notificações para todos os usuários inscritos
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
            onClick={() => navigate('/admin-manage-premium')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
                <Crown className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Cadastrar Premium
              </h2>
              <p className="text-muted-foreground">
                Adicione manualmente usuários ao sistema premium
              </p>
            </div>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <AdminAnalyticsDashboard />
      </div>
    </div>
  );
};

export default AdminDashboard;
