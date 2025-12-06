import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();

  useEffect(() => {
    // Check if user has already dismissed or subscribed
    const dismissed = localStorage.getItem("push-notification-dismissed");
    
    if (!dismissed && isSupported && !isSubscribed && !isLoading) {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, isLoading]);

  const handleEnable = async () => {
    await subscribe();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("push-notification-dismissed", "true");
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed || isSubscribed || !isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-xs">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3 pr-4">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Ative as notificações
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Receba novidades e atualizações do Arcano Lab diretamente no seu dispositivo.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isLoading}
                className="text-xs"
              >
                Ativar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="text-xs"
              >
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
