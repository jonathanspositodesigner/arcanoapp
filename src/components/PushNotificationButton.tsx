import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PushNotificationButtonProps {
  variant?: 'default' | 'floating';
  className?: string;
}

const PushNotificationButton = ({ variant = 'default', className }: PushNotificationButtonProps) => {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (isLoading) return;

    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('Notificações desativadas');
      } else {
        toast.error('Erro ao desativar notificações');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Notificações ativadas com sucesso!');
      } else if (permission === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      } else {
        toast.error('Erro ao ativar notificações');
      }
    }
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all shadow-md",
          isSubscribed
            ? "bg-green-500/20 text-green-600 border border-green-500/30"
            : "bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 animate-pulse",
          isLoading && "opacity-70 cursor-wait",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isSubscribed ? (
          <Check className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        <span>{isSubscribed ? 'Notificações Ativas' : 'Ativar Notificações'}</span>
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg",
        isSubscribed
          ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400"
          : "bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700",
        isLoading && "opacity-70 cursor-wait",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isSubscribed ? (
        <>
          <Check className="h-5 w-5" />
          <span>Notificações Ativas</span>
        </>
      ) : (
        <>
          <Bell className="h-5 w-5" />
          <span>Ativar Notificações</span>
        </>
      )}
    </button>
  );
};

export default PushNotificationButton;
