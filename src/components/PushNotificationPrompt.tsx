import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check, Gift, Sparkles, Zap } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_STORAGE_KEY = "push_notification_dismissed_at";
const SESSION_SHOWN_KEY = "push_notification_prompt_shown_session";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 3000;

interface PushNotificationPromptProps {
  isLoggedIn: boolean;
}

const PushNotificationPrompt = ({ isLoggedIn }: PushNotificationPromptProps) => {
  const [showModal, setShowModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!isLoggedIn || !isSupported || isSubscribed) return;

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
  }, [isLoggedIn, isSupported, isSubscribed]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const success = await subscribe();
      if (success) {
        setShowModal(false);
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
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
            Ative as Notificações! 🔔
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground">
            Não perca nenhuma novidade importante:
          </p>

          {/* Benefits List */}
          <div className="w-full space-y-3 text-left px-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Novidades em primeira mão</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Promoções e descontos exclusivos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-foreground">Novos conteúdos adicionados</span>
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
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
          >
            {isActivating ? (
              "Ativando..."
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                Ativar Notificações
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
