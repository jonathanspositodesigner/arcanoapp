import { useNavigate } from "react-router-dom";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trackPushNotificationEvent } from "@/hooks/usePushNotificationAnalytics";
import { Check, Smartphone, Bell, ArrowRight } from "lucide-react";
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
      title: "Biblioteca de Artes Arcanas",
      description: "Artes para Eventos editáveis PSD e Canva",
      image: upscalerDepois,
      route: "/biblioteca-artes",
    },
    {
      title: "Biblioteca de Prompts IA",
      description: "Prompts prontos para criar selos, imagens, logos e muito mais com IA",
      image: upscalerSeloDepois,
      route: "/biblioteca-prompts",
    },
    {
      title: "Ferramentas de IA",
      description: "Upscaler, Forja de Selos 3D, Mudar Pose e Roupa",
      image: upscalerLogoDepois,
      route: "/ferramentas-ia",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <FadeIn delay={0} duration={600}>
        <img alt="ArcanoApp" className="h-7 sm:h-8 mb-4" src={logoHorizontal} />
      </FadeIn>
      
      {/* Título */}
      <FadeIn delay={150} duration={600}>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-6 sm:mb-8 text-center">
          A plataforma dos criadores do futuro!
        </h1>
      </FadeIn>

      {/* Botões de ação */}
      <FadeIn delay={300} duration={600}>
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 sm:mb-8">
          {isAppInstalled ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">App Instalado</span>
            </div>
          ) : (
            <button 
              onClick={() => navigate("/install-app")} 
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg hover-lift"
            >
              <Smartphone className="h-5 w-5" />
              Instalar Aplicativo
            </button>
          )}

          {showNotificationButton && (
            <button 
              onClick={handleActivateNotifications} 
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg hover-lift"
            >
              <Bell className="h-5 w-5" />
              Ativar Notificações
            </button>
          )}
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
            onClick={() => navigate(card.route)} 
            className="group relative overflow-hidden rounded-2xl cursor-pointer aspect-[4/3] shadow-lg hover:shadow-2xl transition-shadow duration-300"
          >
            {/* Imagem de fundo */}
            <img 
              src={card.image} 
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Overlay escuro sempre visível (leve) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {/* Overlay mais forte no hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Conteúdo que sobe no hover */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 translate-y-[60%] group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2 drop-shadow-lg">
                {card.title}
              </h2>
              <p className="text-sm text-white/90 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {card.description}
              </p>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150"
              >
                Acesse aqui
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </StaggeredAnimation>

      {/* Links de acesso */}
      <FadeIn delay={600} duration={600}>
        <div className="mt-8 flex flex-col items-center gap-2">
          <button 
            onClick={() => navigate("/admin-login")} 
            className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
          >
            Acesso Administrador
          </button>
          <button 
            onClick={() => navigate("/parceiro-login-unificado")} 
            className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
          >
            Acesso Colaborador
          </button>
        </div>
      </FadeIn>
    </div>
  );
};

export default Index;
