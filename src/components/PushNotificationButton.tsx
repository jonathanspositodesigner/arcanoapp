import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export const PushNotificationButton = ({
  variant = "outline",
  size = "default",
  className = "",
  showLabel = true
}: PushNotificationButtonProps) => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          {showLabel && <span className="ml-2">Desativar Notificações</span>}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {showLabel && <span className="ml-2">Ativar Notificações</span>}
        </>
      )}
    </Button>
  );
};
