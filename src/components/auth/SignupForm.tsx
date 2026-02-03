import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle, UserPlus } from "lucide-react";
import { SignupData } from "@/hooks/useUnifiedAuth";

interface SignupFormProps {
  defaultEmail?: string;
  onSubmit: (data: SignupData) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  
  // Configuration
  showNameField?: boolean;
  showPhoneField?: boolean;
  nameRequired?: boolean;
  phoneRequired?: boolean;
  
  // Labels (for i18n)
  labels?: {
    title?: string;
    subtitle?: string;
    email?: string;
    emailPlaceholder?: string;
    name?: string;
    namePlaceholder?: string;
    phone?: string;
    phonePlaceholder?: string;
    password?: string;
    passwordPlaceholder?: string;
    confirmPassword?: string;
    confirmPasswordPlaceholder?: string;
    warning?: string;
    createAccount?: string;
    creatingAccount?: string;
    backToLogin?: string;
  };
  
  // Styling variants
  variant?: 'default' | 'dark' | 'purple' | 'teal';
}

const variantStyles = {
  default: {
    container: '',
    header: 'bg-primary/10 border-b border-primary/20',
    headerIcon: 'bg-primary/20 text-primary',
    headerTitle: 'text-primary',
    headerSubtitle: 'text-muted-foreground',
    label: 'text-foreground',
    input: '',
    alert: 'bg-amber-500/10 border-amber-500/30',
    alertIcon: 'text-amber-500',
    alertText: 'text-amber-700',
    button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    backButton: 'text-muted-foreground hover:text-foreground',
  },
  dark: {
    container: 'bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-emerald-500/50',
    header: 'bg-emerald-500/20 border-b border-emerald-500/30',
    headerIcon: 'bg-emerald-500/30 text-emerald-400',
    headerTitle: 'text-emerald-400',
    headerSubtitle: 'text-white/70',
    label: 'text-white/80',
    input: 'bg-[#0f0f1a] border-[#2d4a5e]/50 text-white',
    alert: 'bg-amber-500/10 border-amber-500/30',
    alertIcon: 'text-amber-500',
    alertText: 'text-amber-200',
    button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    backButton: 'text-white/60 hover:text-white',
  },
  purple: {
    container: 'bg-[#1A0A2E] border-purple-500/20',
    header: 'bg-green-500/20 border-b border-green-500/30',
    headerIcon: 'bg-green-500/30 text-green-400',
    headerTitle: 'text-green-400',
    headerSubtitle: 'text-purple-300',
    label: 'text-purple-200',
    input: 'bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400',
    alert: 'bg-yellow-500/10 border-yellow-500/30',
    alertIcon: 'text-yellow-500',
    alertText: 'text-yellow-400',
    button: 'bg-green-600 hover:bg-green-700 text-white',
    backButton: 'text-purple-400 hover:text-white hover:bg-purple-500/20',
  },
  teal: {
    container: 'bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-emerald-500/50',
    header: 'bg-emerald-500/20 border-b border-emerald-500/30',
    headerIcon: 'bg-emerald-500/30 text-emerald-400',
    headerTitle: 'text-emerald-400',
    headerSubtitle: 'text-white/70',
    label: 'text-white/80',
    input: 'bg-[#0f0f1a] border-violet-500/30 text-white',
    alert: 'bg-violet-500/10 border-violet-500/30',
    alertIcon: 'text-violet-500',
    alertText: 'text-violet-200',
    button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    backButton: 'text-white/60 hover:text-white',
  },
};

export function SignupForm({
  defaultEmail = '',
  onSubmit,
  onBackToLogin,
  isLoading,
  showNameField = true,
  showPhoneField = false,
  nameRequired = false,
  phoneRequired = false,
  labels = {},
  variant = 'default',
}: SignupFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const styles = variantStyles[variant];

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return; // Let the hook handle the error
    }
    
    await onSubmit({
      email,
      password,
      name: showNameField ? name : undefined,
      phone: showPhoneField ? phone : undefined,
    });
  };

  return (
    <div className={`rounded-lg overflow-hidden ${styles.container}`}>
      {/* Header */}
      <div className={`p-6 text-center ${styles.header}`}>
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${styles.headerIcon}`}>
          <UserPlus className="w-10 h-10" />
        </div>
        <h2 className={`text-2xl font-bold ${styles.headerTitle}`}>
          {labels.title || 'Criar Conta'}
        </h2>
        {labels.subtitle && (
          <p className={`text-sm mt-2 ${styles.headerSubtitle}`}>
            {labels.subtitle}
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <Label className={styles.label}>{labels.email || 'Email'}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={labels.emailPlaceholder || 'seu@email.com'}
            className={`mt-1 ${styles.input}`}
            required
          />
        </div>

        {showNameField && (
          <div>
            <Label className={styles.label}>
              {labels.name || (nameRequired ? 'Nome' : 'Nome (opcional)')}
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={labels.namePlaceholder || 'Seu nome'}
              className={`mt-1 ${styles.input}`}
              required={nameRequired}
            />
          </div>
        )}

        {showPhoneField && (
          <div>
            <Label className={styles.label}>
              {labels.phone || (phoneRequired ? 'Telefone' : 'Telefone (opcional)')}
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder={labels.phonePlaceholder || '(00) 00000-0000'}
              className={`mt-1 ${styles.input}`}
              required={phoneRequired}
            />
          </div>
        )}

        <div className="relative">
          <Label className={styles.label}>{labels.password || 'Senha'}</Label>
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={labels.passwordPlaceholder || 'Mínimo 6 caracteres'}
            className={`mt-1 pr-10 ${styles.input}`}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[calc(50%+4px)] text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div>
          <Label className={styles.label}>{labels.confirmPassword || 'Confirmar Senha'}</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={labels.confirmPasswordPlaceholder || 'Confirme sua senha'}
            className={`mt-1 ${styles.input}`}
            required
          />
        </div>

        {labels.warning && (
          <Alert className={styles.alert}>
            <AlertCircle className={`h-4 w-4 ${styles.alertIcon}`} />
            <AlertDescription className={`text-xs ${styles.alertText}`}>
              {labels.warning}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className={`w-full font-bold py-6 text-lg ${styles.button}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.creatingAccount || 'Criando conta...'}
            </>
          ) : (
            labels.createAccount || 'Criar Conta'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBackToLogin}
          className={`w-full ${styles.backButton}`}
        >
          {labels.backToLogin || 'Voltar ao login'}
        </Button>
      </form>
    </div>
  );
}
