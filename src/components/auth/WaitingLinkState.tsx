import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";

interface WaitingLinkStateProps {
  email: string;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
  onCheckSession?: () => Promise<void>;
  isLoading?: boolean;
  
  labels?: {
    title?: string;
    description?: string;
    resend?: string;
    resending?: string;
    changeEmail?: string;
    checkAgain?: string;
    resendCooldown?: string;
  };
  
  variant?: 'default' | 'dark' | 'dark' | 'teal';
}

const variantStyles = {
  default: {
    card: 'border border-border bg-card',
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
    title: 'text-foreground',
    email: 'text-primary font-medium',
    description: 'text-muted-foreground',
    resendButton: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    changeButton: 'text-muted-foreground hover:text-foreground',
  },
  dark: {
    card: 'bg-card border border-border',
    iconBg: 'bg-amber-500/20',
    icon: 'text-amber-400',
    title: 'text-foreground',
    email: 'text-amber-400 font-medium',
    description: 'text-muted-foreground',
    resendButton: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    changeButton: 'text-muted-foreground hover:text-foreground',
  },
  purple: {
    card: 'bg-card border border-border',
    iconBg: 'bg-accent',
    icon: 'text-muted-foreground',
    title: 'text-foreground',
    email: 'text-muted-foreground font-medium',
    description: 'text-muted-foreground',
    resendButton: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    changeButton: 'text-muted-foreground hover:text-foreground',
  },
  teal: {
    card: 'bg-card border border-border',
    iconBg: 'bg-accent',
    icon: 'text-muted-foreground',
    title: 'text-foreground',
    email: 'text-muted-foreground font-medium',
    description: 'text-muted-foreground',
    resendButton: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    changeButton: 'text-muted-foreground hover:text-foreground',
  },
};

const RESEND_COOLDOWN = 60;

export function WaitingLinkState({
  email,
  onResend,
  onChangeEmail,
  onCheckSession,
  isLoading = false,
  labels = {},
  variant = 'default',
}: WaitingLinkStateProps) {
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const styles = variantStyles[variant];

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className={`p-8 text-center ${styles.card}`}>
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${styles.iconBg}`}>
        <Mail className={`w-10 h-10 ${styles.icon}`} />
      </div>
      
      <h2 className={`text-2xl font-bold mb-2 ${styles.title}`}>
        {labels.title || 'Verifique seu email'}
      </h2>
      
      <p className={`mb-2 ${styles.description}`}>
        {labels.description || 'Enviamos um link para criar sua senha.'}
      </p>
      
      <p className={`mb-6 ${styles.email}`}>
        {email}
      </p>
      
      <div className="space-y-3">
        <Button
          onClick={handleResend}
          disabled={cooldown > 0 || isResending || isLoading}
          className={`w-full ${styles.resendButton}`}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.resending || 'Reenviando...'}
            </>
          ) : cooldown > 0 ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.resendCooldown?.replace('{seconds}', String(cooldown)) || `Reenviar em ${cooldown}s`}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.resend || 'Reenviar link'}
            </>
          )}
        </Button>
        
        {onCheckSession && (
          <Button
            variant="outline"
            onClick={onCheckSession}
            disabled={isLoading}
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {labels.checkAgain || 'Já cliquei no link'}
          </Button>
        )}
        
        <Button
          variant="ghost"
          onClick={onChangeEmail}
          className={`w-full ${styles.changeButton}`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {labels.changeEmail || 'Usar outro email'}
        </Button>
      </div>
    </Card>
  );
}
