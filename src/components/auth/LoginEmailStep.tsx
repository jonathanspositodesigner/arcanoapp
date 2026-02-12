import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, UserPlus } from "lucide-react";

interface LoginEmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (email?: string) => Promise<void>;
  onSignupClick: () => void;
  isLoading: boolean;
  
  // Labels (for i18n)
  labels?: {
    email?: string;
    emailPlaceholder?: string;
    continue?: string;
    loading?: string;
    noAccountYet?: string;
    createAccount?: string;
  };
  
  // Styling variants
  variant?: 'default' | 'dark' | 'purple' | 'teal';
}

const variantStyles = {
  default: {
    input: '',
    button: '',
    signupButton: 'border-primary/50 text-primary hover:bg-primary/10',
    text: 'text-muted-foreground',
  },
  dark: {
    input: 'bg-[#0f0f1a] border-[#2d4a5e]/50 text-white',
    button: 'bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white',
    signupButton: 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20',
    text: 'text-white/60',
  },
  purple: {
    input: 'bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    signupButton: 'border-green-500/50 text-green-400 hover:bg-green-500/20',
    text: 'text-purple-300',
  },
  teal: {
    input: 'bg-[#0f0f1a] border-violet-500/30 text-white',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    signupButton: 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300',
    text: 'text-white/60',
  },
};

export function LoginEmailStep({
  email,
  onEmailChange,
  onSubmit,
  onSignupClick,
  isLoading,
  labels = {},
  variant = 'default',
}: LoginEmailStepProps) {
  const styles = variantStyles[variant];
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {labels.email && <Label>{labels.email}</Label>}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder={labels.emailPlaceholder || 'seu@email.com'}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className={`pl-10 ${styles.input}`}
            disabled={isLoading}
            autoFocus
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className={`w-full ${styles.button}`} 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {labels.loading || 'Verificando...'}
          </>
        ) : (
          labels.continue || 'Continuar'
        )}
      </Button>

      {(labels.noAccountYet !== '' || labels.createAccount !== '') && (
        <div className="text-center pt-4 border-t border-border/30">
          <p className={`text-sm mb-2 ${styles.text}`}>
            {labels.noAccountYet || 'Ainda não tem conta?'}
          </p>
          <Button
            type="button"
            variant="outline"
            className={`w-full ${styles.signupButton}`}
            onClick={onSignupClick}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {labels.createAccount || 'Criar Conta'}
          </Button>
        </div>
      )}
    </form>
  );
}
