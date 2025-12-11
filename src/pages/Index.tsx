import { useNavigate } from "react-router-dom";
import { useIsAppInstalled } from "@/hooks/useIsAppInstalled";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trackPushNotificationEvent } from "@/hooks/usePushNotificationAnalytics";
import { Check, Smartphone, Bell } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const isAppInstalled = useIsAppInstalled();
  const { isSupported, subscribe } = usePushNotifications();

  // FONTE ÚNICA DE VERDADE: Notification.permission
  const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

  const handleActivateNotifications = async () => {
    const success = await subscribe();
    if (success) {
      // Track manual activation
      trackPushNotificationEvent('activated_manual');
      toast.success("Notificações ativadas com sucesso!");
    } else {
      // Track permission denied
      trackPushNotificationEvent('permission_denied');
      toast.error("Não foi possível ativar as notificações");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <img alt="ArcanoApp" className="h-7 sm:h-8 mb-4" src="/lovable-uploads/c730fa96-d2c9-48f7-8bbb-f5fd02378698.png" />
      
      {/* Título */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-6 sm:mb-8 text-center">
        A plataforma dos criadores do futuro!
      </h1>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 sm:mb-8">
        {/* Botão Instalar App ou Badge App Instalado */}
        {isAppInstalled ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">App Instalado</span>
          </div>
        ) : (
          <button
            onClick={() => navigate("/install-app")}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg"
          >
            <Smartphone className="h-5 w-5" />
            Instalar Aplicativo
          </button>
        )}

        {/* Botão Ativar Notificações - só mostra se não tem permissão */}
        {isSupported && !hasPermission && (
          <button
            onClick={handleActivateNotifications}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            <Bell className="h-5 w-5" />
            Ativar Notificações
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl">
        {/* Card - Biblioteca de Artes Arcanas */}
        <div onClick={() => navigate("/biblioteca-artes")} className="group cursor-pointer bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center">
            <img alt="Biblioteca de Artes Arcanas" className="w-full h-full object-contain" src="/lovable-uploads/0b5816a1-fee5-45f1-906e-9f7952d9b4e3.png" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Biblioteca de Artes Arcanas
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Artes editáveis PSD e Canva para eventos e Artistas</p>
        </div>

        {/* Card - Biblioteca de Prompts IA */}
        <div onClick={() => navigate("/biblioteca-prompts")} className="group cursor-pointer bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 flex items-center justify-center">
            <img alt="Biblioteca de Prompts IA" className="w-full h-full object-contain" src="/lovable-uploads/c7d0b526-a28d-43a4-8f43-9654f93029e5.png" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Biblioteca de Prompts IA
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Prompts para criar selos e elementos 3D profissionais
          </p>
        </div>
      </div>

      {/* Links de acesso */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          onClick={() => navigate("/admin-login")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
        >
          Acesso Administrador
        </button>
        <button
          onClick={() => navigate("/parceiro-login-artes")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline lg:hidden"
        >
          Área do Colaborador
        </button>
      </div>
    </div>
  );
};

export default Index;