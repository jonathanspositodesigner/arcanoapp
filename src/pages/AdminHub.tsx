import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, FileText, Menu, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// APP_VERSION removed - now using pwa_version from database
import { toast } from "sonner";
import AdminGoalsCard from "@/components/AdminGoalsCard";
import WelcomeEmailsMonitor from "@/components/WelcomeEmailsMonitor";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AdminHubSidebar, { HubViewType } from "@/components/AdminHubSidebar";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";
import PushNotificationsContent from "@/components/PushNotificationsContent";
import PartnersManagementContent from "@/components/PartnersManagementContent";
import AbandonedCheckoutsContent from "@/components/AbandonedCheckoutsContent";
import AdminsManagementContent from "@/components/AdminsManagementContent";

const AdminHub = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<HubViewType>("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isForcingUpdate, setIsForcingUpdate] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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
        toast.error("Acesso negado. Você não tem permissões de administrador.");
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleViewChange = (view: HubViewType) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const handleForceUpdate = async () => {
    if (!confirm("Forçar atualização para TODOS os usuários?")) {
      return;
    }

    setIsForcingUpdate(true);
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const newVersion = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({
          value: { version: newVersion },
          updated_at: now.toISOString()
        })
        .eq('id', 'pwa_version');

      if (updateError) throw updateError;

      toast.success(`Update global publicado! Versão: ${newVersion}`);
    } catch (error) {
      console.error('Error forcing update:', error);
      toast.error("Erro ao forçar atualização");
    } finally {
      setIsForcingUpdate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const platforms = [
    {
      id: "artes-eventos",
      title: "Biblioteca de Artes Arcanas",
      subtitle: "Eventos & Festas",
      description: "Gerenciar artes editáveis para festas, bares, eventos",
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      borderColor: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/60",
      path: "/admin-artes-eventos"
    },
    {
      id: "artes-musicos",
      title: "Biblioteca de Artes Arcanas",
      subtitle: "Músicos & Artistas",
      description: "Gerenciar artes para músicos, bandas e artistas",
      icon: Music,
      color: "from-violet-500 to-purple-500",
      borderColor: "border-violet-500/30",
      hoverBorder: "hover:border-violet-500/60",
      path: "/admin-artes-musicos"
    },
    {
      id: "promptclub",
      title: "PromptClub",
      subtitle: "Biblioteca de Prompts",
      description: "Gerenciar prompts, categorias e assinaturas premium",
      icon: FileText,
      color: "from-primary to-purple-600",
      borderColor: "border-primary/30",
      hoverBorder: "hover:border-primary/60",
      path: "/admin-prompts"
    }
  ];

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Platform Selection */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Escolha uma Plataforma</h2>
              <p className="text-muted-foreground">Cada plataforma possui seu próprio painel de gerenciamento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 ${platform.borderColor} ${platform.hoverBorder}`}
                  onClick={() => navigate(platform.path)}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`p-2.5 bg-gradient-to-r ${platform.color} rounded-full`}>
                      <platform.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{platform.title}</h3>
                      <p className="text-xs font-medium text-primary">{platform.subtitle}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{platform.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Goals Section */}
            <AdminGoalsCard />
          </div>
        );
      case "dashboard":
        return <AdminSimpleMetrics />;
      case "push-notifications":
        return <PushNotificationsContent />;
      case "partners":
        return <PartnersManagementContent />;
      case "abandoned-checkouts":
        return <AbandonedCheckoutsContent />;
      case "admins":
        return <AdminsManagementContent />;
      case "emails":
        return <WelcomeEmailsMonitor />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminHubSidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
          onLogout={handleLogout}
        />
      </div>

      {/* Desktop Force Update Button - Fixed position */}
      <div className="hidden md:flex fixed top-4 right-4 z-50">
        <Button
          variant="destructive"
          onClick={handleForceUpdate}
          disabled={isForcingUpdate}
          className="gap-2 shadow-lg"
        >
          <RefreshCw className={`h-4 w-4 ${isForcingUpdate ? 'animate-spin' : ''}`} />
          {isForcingUpdate ? 'Enviando...' : 'Forçar Update Global'}
        </Button>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleForceUpdate}
            disabled={isForcingUpdate}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isForcingUpdate ? 'animate-spin' : ''}`} />
            {isForcingUpdate ? 'Enviando...' : 'Forçar Update'}
          </Button>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AdminHubSidebar 
                activeView={activeView}
                onViewChange={handleViewChange}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 mt-16 md:mt-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminHub;
