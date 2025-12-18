import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Palette, FileImage, Music, Loader2 } from "lucide-react";

interface Platform {
  platform: string;
  is_active: boolean;
}

const PLATFORM_CONFIG = {
  prompts: {
    title: "Prompts",
    description: "Envie e gerencie prompts de IA",
    icon: FileImage,
    color: "from-purple-500 to-indigo-600",
    route: "/parceiro-dashboard",
  },
  artes_eventos: {
    title: "Artes Eventos",
    description: "Artes para eventos sociais",
    icon: Palette,
    color: "from-cyan-500 to-blue-600",
    route: "/parceiro-dashboard-artes",
  },
  artes_musicos: {
    title: "Músicos & Artistas",
    description: "Artes para músicos e artistas",
    icon: Music,
    color: "from-pink-500 to-rose-600",
    route: "/parceiro-dashboard-musicos",
  },
};

const PartnerPlatformSelect = () => {
  const navigate = useNavigate();
  const [partnerName, setPartnerName] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAccessAndFetchPlatforms();
  }, []);

  const checkAccessAndFetchPlatforms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/parceiro-login-unificado');
        return;
      }

      // Check partner role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'partner')
        .maybeSingle();

      if (!roleData) {
        toast.error("Acesso negado");
        navigate('/');
        return;
      }

      // Get partner info
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (partnerError || !partnerData) {
        toast.error("Conta de colaborador não encontrada");
        navigate('/parceiro-login-unificado');
        return;
      }

      setPartnerName(partnerData.name);

      // Fetch active platforms
      const { data: platformsData, error: platformsError } = await supabase
        .from('partner_platforms')
        .select('platform, is_active')
        .eq('partner_id', partnerData.id)
        .eq('is_active', true);

      if (platformsError) {
        console.error("Error fetching platforms:", platformsError);
        setPlatforms([]);
      } else {
        setPlatforms(platformsData || []);

        // If only one platform, redirect directly
        if (platformsData && platformsData.length === 1) {
          const platform = platformsData[0].platform as keyof typeof PLATFORM_CONFIG;
          if (PLATFORM_CONFIG[platform]) {
            navigate(PLATFORM_CONFIG[platform].route);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Erro ao verificar acesso");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate('/');
  };

  const handleSelectPlatform = (platformKey: string) => {
    const config = PLATFORM_CONFIG[platformKey as keyof typeof PLATFORM_CONFIG];
    if (config) {
      navigate(config.route);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activePlatformKeys = platforms.map(p => p.platform);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Olá, {partnerName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Escolha uma plataforma para acessar
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Platform Cards */}
        {platforms.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                Você não tem acesso a nenhuma plataforma. Contate o administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
              const isActive = activePlatformKeys.includes(key);
              if (!isActive) return null;

              const IconComponent = config.icon;

              return (
                <Card
                  key={key}
                  className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg overflow-hidden"
                  onClick={() => handleSelectPlatform(key)}
                >
                  <div className={`h-2 bg-gradient-to-r ${config.color}`} />
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${config.color} flex items-center justify-center mb-3`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{config.title}</CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className={`w-full bg-gradient-to-r ${config.color} hover:opacity-90`}>
                      Acessar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerPlatformSelect;