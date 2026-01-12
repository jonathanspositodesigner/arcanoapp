import { useNavigate } from "react-router-dom";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trackPushNotificationEvent } from "@/hooks/usePushNotificationAnalytics";
import { Check, Smartphone, Bell, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { FadeIn, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";

// Imagens de preview para os cards
import upscalerDepois from "@/assets/upscaler-depois-1.jpg";
import upscalerSeloDepois from "@/assets/upscaler-selo-depois.jpg";
import upscalerLogoDepois from "@/assets/upscaler-logo-depois.jpg";

const Index = () => {
  const navigate = useNavigate();
  const isAppInstalled = useIsAppInstalled();
  const { subscribe } = usePushNotifications();

  const showNotificationButton = typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted';
  
  const handleActivateNotifications = async () => {
    const success = await subscribe();
    if (success) {
      trackPushNotificationEvent('activated_manual');
      toast.success("Notificações ativadas com sucesso!");
    } else {
      trackPushNotificationEvent('permission_denied');
      toast.error("Não foi possível ativar as notificações");
    }
  };

  const cards = [
    {
      category: "Artes Editáveis",
      title: "Biblioteca de Artes Arcanas",
      description: "Artes para Eventos editáveis PSD e Canva",
      image: upscalerDepois,
      route: "/biblioteca-artes",
    },
    {
      category: "Prompts IA",
      title: "Biblioteca de Prompts IA",
      description: "Prompts prontos para criar selos, imagens, logos e muito mais com IA",
      image: upscalerSeloDepois,
      route: "/biblioteca-prompts",
    },
    {
      category: "Ferramentas",
      title: "Ferramentas de IA",
      description: "Upscaler, Forja de Selos 3D, Mudar Pose e Roupa",
      image: upscalerLogoDepois,
      route: "/ferramentas-ia",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <img alt="ArcanoApp" className="h-6 sm:h-7" src={logoHorizontal} />
          
          <div className="flex items-center gap-2 sm:gap-3">
            {isAppInstalled ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs font-medium hidden sm:inline">App Instalado</span>
              </div>
            ) : (
              <button 
                onClick={() => navigate("/install-app")} 
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs sm:text-sm font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {showNotificationButton && (
              <button 
                onClick={handleActivateNotifications} 
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notificações</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal com padding para o header fixo */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 pt-24">
        {/* Títulos */}
        <FadeIn delay={150} duration={600}>
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
              Seja bem vindo ao Arcano App!
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              A plataforma dos criadores do futuro!
            </p>
          </div>
        </FadeIn>

      <StaggeredAnimation 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl"
        staggerDelay={150}
        animation="fade-up"
      >
        {cards.map((card) => (
          <div 
            key={card.route}
            className="group bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-primary/50"
          >
            {/* Imagem com hover zoom */}
            <div className="relative overflow-hidden aspect-[4/3]">
              <img 
                src={card.image} 
                alt={card.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            
            {/* Conteúdo abaixo da imagem */}
            <div className="p-4 sm:p-5">
              {/* Categoria */}
              <p className="text-xs text-muted-foreground mb-1">
                {card.category}
              </p>
              
              {/* Título */}
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 line-clamp-2">
                {card.title}
              </h2>
              
              {/* Botões */}
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info(card.description);
                  }}
                >
                  Mostrar detalhes
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  onClick={() => navigate(card.route)}
                >
                  Acessar
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        </StaggeredAnimation>

        {/* Links de acesso */}
        <FadeIn delay={600} duration={600}>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              onClick={() => navigate("/admin-login")} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              Acesso Administrador
            </button>
            <span className="text-muted-foreground">•</span>
            <button 
              onClick={() => navigate("/parceiro-login-unificado")} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              Acesso Colaborador
            </button>
          </div>
        </FadeIn>
      </main>
    </div>
  );
};

export default Index;
