import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

const NEVER_SHOW_KEY = 'ai_tool_notification_never';
const SESSION_SHOWN_KEY = 'ai_tool_notification_shown_session';
const SHOW_DELAY_MS = 2000;

interface NotificationPromptToastProps {
  toolName?: string;
  className?: string;
}

/**
 * Toast discreto no canto inferior direito para ativar notificações push.
 * - Só aparece se o usuário não ativou notificações
 * - "Não obrigado" salva no localStorage para nunca mais mostrar
 * - Não bloqueia a página
 */
const NotificationPromptToast = ({ toolName = 'upscale', className }: NotificationPromptToastProps) => {
  const [showToast, setShowToast] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const { isSupported, isSubscribed, subscribe, isLoading } = usePushNotifications();

  useEffect(() => {
    // Não mostrar se: 
    // - Não suporta push
    // - Já está inscrito
    // - Já disse "não obrigado" 
    // - Já mostrou nesta sessão
    // - Está carregando status
    if (!isSupported || isSubscribed || isLoading) return;
    
    const neverShow = localStorage.getItem(NEVER_SHOW_KEY) === 'true';
    if (neverShow) return;
    
    const shownInSession = sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';
    if (shownInSession) return;

    // Browser não suporta notificações
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    // Já tem permissão granted
    if (Notification.permission === 'granted') return;
    
    // Mostrar após delay
    const timer = setTimeout(() => {
      setShowToast(true);
      sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isLoading]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const success = await subscribe();
      if (success) {
        setShowToast(false);
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(NEVER_SHOW_KEY, 'true');
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "w-[calc(100%-2rem)] sm:w-auto sm:max-w-[280px]",
        "bg-card border border-border rounded-xl",
        "shadow-lg shadow-black/10",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div className="p-3 sm:p-4">
        {/* Header with close button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Quer saber quando seu {toolName} ficar pronto?
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 -m-1 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mt-3">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Não obrigado
          </button>
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={isActivating}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground text-xs px-3 py-1.5 h-auto"
          >
            {isActivating ? 'Ativando...' : 'Ativar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPromptToast;
