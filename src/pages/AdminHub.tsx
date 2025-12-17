import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, FileText, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminGoalsCard from "@/components/AdminGoalsCard";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AdminHubSidebar from "@/components/AdminHubSidebar";
import AdminGeneralDashboard from "@/components/AdminGeneralDashboard";

const AdminHub = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"home" | "dashboard" | "marketing">("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleViewChange = (view: "home" | "dashboard" | "marketing") => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
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

      {/* Mobile Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
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

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 mt-16 md:mt-0">
        {activeView === "home" ? (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-2">Escolha uma Plataforma</h2>
              <p className="text-muted-foreground">Cada plataforma possui seu próprio painel de gerenciamento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-2 ${platform.borderColor} ${platform.hoverBorder}`}
                  onClick={() => navigate(platform.path)}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-4 bg-gradient-to-r ${platform.color} rounded-full`}>
                      <platform.icon className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{platform.title}</h3>
                      <p className="text-sm font-medium text-primary">{platform.subtitle}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Goals Section */}
            <div className="mt-12">
              <AdminGoalsCard />
            </div>
          </div>
        ) : activeView === "dashboard" ? (
          <AdminGeneralDashboard />
        ) : (
          <div className="max-w-6xl mx-auto">
            <iframe 
              src="/admin-email-marketing" 
              className="w-full h-[calc(100vh-8rem)] border-0 rounded-lg"
              title="Marketing Geral"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminHub;
