import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check, Gift, Sparkles, Zap } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trackPushNotificationEvent } from "@/hooks/usePushNotificationAnalytics";

const DISMISS_STORAGE_KEY = "push_notification_dismissed_at";
const SESSION_SHOWN_KEY = "push_notification_prompt_shown_session";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 3000;

const PushNotificationPrompt = () => {
  const [showModal, setShowModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const { subscribe } = usePushNotifications();

  useEffect(() => {
    // LÓGICA SIMPLES: Se browser não suporta ou já tem permissão, não mostra
    const browserSupports = typeof window !== 'undefined' && 'Notification' in window;
    if (!browserSupports) return;
    if (Notification.permission === 'granted') return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt));
      const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DAYS) return;
    }

    // Check if already shown in this session
    const shownInSession = sessionStorage.getItem(SESSION_SHOWN_KEY);
    if (shownInSession) return;

    // Show after delay
    const timer = setTimeout(() => {
      setShowModal(true);
      sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const success = await subscribe();
      if (success) {
        // Track activation via prompt
        trackPushNotificationEvent('activated_prompt');
        setShowModal(false);
      } else {
        // Track permission denied
        trackPushNotificationEvent('permission_denied');
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    // Track dismiss event
    trackPushNotificationEvent('dismissed');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Animated Bell Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center animate-pulse">
              <Bell className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground">
            Ganhe 20% OFF! 🎁
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground">
            Ative as notificações e receba 20% de desconto no próximo lançamento!
          </p>

          {/* Benefits List */}
          <div className="w-full space-y-3 text-left px-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm text-foreground font-medium">20% OFF no próximo pack</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Novidades em primeira mão</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Promoções exclusivas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Atualizações importantes</span>
            </div>
          </div>

          {/* Activate Button */}
          <Button
            onClick={handleActivate}
            disabled={isActivating}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 text-lg shadow-lg shadow-amber-500/30"
          >
            {isActivating ? (
              "Ativando..."
            ) : (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Ativar e Ganhar 20% OFF
              </>
            )}
          </Button>

          {/* Dismiss Link */}
          <button
            onClick={handleDismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Talvez depois
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushNotificationPrompt;
