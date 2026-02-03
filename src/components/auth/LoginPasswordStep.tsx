import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginPasswordStepProps {
  email: string;
  onSubmit: (password: string) => Promise<void>;
  onChangeEmail: () => void;
  forgotPasswordUrl: string;
  isLoading: boolean;
  
  // Labels (for i18n)
  labels?: {
    password?: string;
    passwordPlaceholder?: string;
    signIn?: string;
    signingIn?: string;
    forgotPassword?: string;
    changeEmail?: string;
  };
  
  // Styling variants
  variant?: 'default' | 'dark' | 'purple' | 'teal';
}

const variantStyles = {
  default: {
    emailBox: 'bg-muted/50 border',
    emailIcon: 'text-muted-foreground',
    emailText: 'text-foreground',
    changeBtn: 'text-primary',
    input: '',
    button: '',
    forgotLink: 'text-primary hover:underline',
  },
  dark: {
    emailBox: 'bg-[#2d4a5e]/20 border border-[#2d4a5e]/30',
    emailIcon: 'text-amber-400',
    emailText: 'text-white/80',
    changeBtn: 'text-amber-400 hover:text-amber-300',
    input: 'bg-[#0f0f1a] border-[#2d4a5e]/50 text-white',
    button: 'bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white',
    forgotLink: 'text-[#2d4a5e] hover:underline',
  },
  purple: {
    emailBox: 'bg-purple-500/10 border border-purple-500/20',
    emailIcon: 'text-purple-400',
    emailText: 'text-white',
    changeBtn: 'text-purple-400 hover:text-purple-300',
    input: 'bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    forgotLink: 'text-purple-400 hover:text-purple-300 underline',
  },
  teal: {
    emailBox: 'bg-violet-500/10 border border-violet-500/20',
    emailIcon: 'text-violet-400',
    emailText: 'text-white/80',
    changeBtn: 'text-violet-400 hover:text-violet-300',
    input: 'bg-[#0f0f1a] border-violet-500/30 text-white',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    forgotLink: 'text-violet-400 hover:text-violet-300 underline',
  },
};

export function LoginPasswordStep({
  email,
  onSubmit,
  onChangeEmail,
  forgotPasswordUrl,
  isLoading,
  labels = {},
  variant = 'default',
}: LoginPasswordStepProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const styles = variantStyles[variant];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email indicator */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${styles.emailBox}`}>
        <div className="flex items-center gap-2">
          <Mail className={`h-4 w-4 ${styles.emailIcon}`} />
          <span className={`text-sm ${styles.emailText}`}>{email}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onChangeEmail}
          className={`text-xs h-auto py-1 px-2 ${styles.changeBtn}`}
        >
          {labels.changeEmail || 'Trocar'}
        </Button>
      </div>

      <div className="space-y-2">
        {labels.password && <Label>{labels.password}</Label>}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={labels.passwordPlaceholder || '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`pl-10 pr-10 ${styles.input}`}
            disabled={isLoading}
            autoFocus
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="text-right">
        <Link
          to={forgotPasswordUrl}
          className={`text-sm ${styles.forgotLink}`}
        >
          {labels.forgotPassword || 'Esqueci minha senha'}
        </Link>
      </div>

      <Button 
        type="submit" 
        className={`w-full ${styles.button}`} 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {labels.signingIn || 'Entrando...'}
          </>
        ) : (
          labels.signIn || 'Entrar'
        )}
      </Button>
    </form>
  );
}
