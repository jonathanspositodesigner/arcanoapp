import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, FileText, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminHub = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Site
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Selecione a plataforma para gerenciar</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
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
        </div>
      </main>
    </div>
  );
};

export default AdminHub;
