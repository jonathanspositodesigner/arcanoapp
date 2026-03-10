import { useState, FormEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle, UserPlus, ArrowLeft, ArrowRight, MapPin, User, Lock } from "lucide-react";
import { SignupData } from "@/hooks/useUnifiedAuth";

interface SignupFormProps {
  defaultEmail?: string;
  onSubmit: (data: SignupData) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  
  // Configuration (kept for backward compat, but all fields are now mandatory)
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
    progressBg: 'bg-primary/20',
    progressFill: 'bg-primary',
    stepActive: 'bg-primary text-primary-foreground',
    stepInactive: 'bg-muted text-muted-foreground',
    stepDone: 'bg-primary/60 text-primary-foreground',
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
    progressBg: 'bg-emerald-500/20',
    progressFill: 'bg-emerald-500',
    stepActive: 'bg-emerald-500 text-white',
    stepInactive: 'bg-white/10 text-white/40',
    stepDone: 'bg-emerald-500/60 text-white',
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
    progressBg: 'bg-green-500/20',
    progressFill: 'bg-green-500',
    stepActive: 'bg-green-500 text-white',
    stepInactive: 'bg-purple-500/20 text-purple-400',
    stepDone: 'bg-green-500/60 text-white',
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
    progressBg: 'bg-emerald-500/20',
    progressFill: 'bg-emerald-500',
    stepActive: 'bg-emerald-500 text-white',
    stepInactive: 'bg-white/10 text-white/40',
    stepDone: 'bg-emerald-500/60 text-white',
  },
};

const STEPS = [
  { label: 'Conta', icon: Lock },
  { label: 'Dados Pessoais', icon: User },
  { label: 'Endereço', icon: MapPin },
];

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

const isValidCPF = (cpf: string) => {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(numbers[10]);
};

export function SignupForm({
  defaultEmail = '',
  onSubmit,
  onBackToLogin,
  isLoading,
  labels = {},
  variant = 'default',
}: SignupFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [stepError, setStepError] = useState('');
  
  const styles = variantStyles[variant];

  const fetchCEP = useCallback(async (cep: string) => {
    const numbers = cep.replace(/\D/g, "");
    if (numbers.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressLine(data.logradouro || '');
        setAddressCity(data.localidade || '');
        setAddressState(data.uf || '');
      }
    } catch {
      // ignore
    } finally {
      setCepLoading(false);
    }
  }, []);

  const validateStep = (step: number): boolean => {
    setStepError('');
    if (step === 1) {
      if (!email.trim()) { setStepError('Digite seu email'); return false; }
      if (password.length < 6) { setStepError('Senha deve ter pelo menos 6 caracteres'); return false; }
      if (password !== confirmPassword) { setStepError('As senhas não conferem'); return false; }
      return true;
    }
    if (step === 2) {
      if (!name.trim()) { setStepError('Digite seu nome completo'); return false; }
      if (phone.replace(/\D/g, '').length < 10) { setStepError('Digite um telefone válido'); return false; }
      if (!isValidCPF(cpf)) { setStepError('Digite um CPF válido'); return false; }
      return true;
    }
    if (step === 3) {
      if (addressZip.replace(/\D/g, '').length !== 8) { setStepError('Digite um CEP válido'); return false; }
      if (!addressLine.trim()) { setStepError('Digite seu endereço'); return false; }
      if (!addressCity.trim()) { setStepError('Digite sua cidade'); return false; }
      if (!addressState.trim()) { setStepError('Selecione seu estado'); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStepError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    await onSubmit({
      email,
      password,
      name,
      phone,
      cpf,
      address_line: addressLine,
      address_zip: addressZip,
      address_city: addressCity,
      address_state: addressState,
    });
  };

  const STATES = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  return (
    <div className={`rounded-lg overflow-hidden ${styles.container}`}>
      {/* Header */}
      <div className={`p-4 text-center ${styles.header}`}>
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2 ${styles.headerIcon}`}>
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className={`text-xl font-bold ${styles.headerTitle}`}>
          {labels.title || 'Criar Conta'}
        </h2>
        {labels.subtitle && (
          <p className={`text-sm mt-1 ${styles.headerSubtitle}`}>{labels.subtitle}</p>
        )}
      </div>

      {/* Step Progress */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const Icon = step.icon;
            const isDone = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? styles.stepDone : isActive ? styles.stepActive : styles.stepInactive
                  }`}>
                    {isDone ? '✓' : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] mt-1 ${isActive ? styles.headerTitle : styles.headerSubtitle || 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mx-1 rounded ${isDone ? styles.progressFill : styles.progressBg}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className={`h-1.5 rounded-full ${styles.progressBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${styles.progressFill}`}
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
        <p className={`text-xs text-center mt-1 ${styles.headerSubtitle || 'text-muted-foreground'}`}>
          Etapa {currentStep} de 3
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-3">
        {/* Step 1: Account */}
        {currentStep === 1 && (
          <>
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
          </>
        )}

        {/* Step 2: Personal Data */}
        {currentStep === 2 && (
          <>
            <div>
              <Label className={styles.label}>Nome Completo</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className={`mt-1 ${styles.input}`}
                required
              />
            </div>
            <div>
              <Label className={styles.label}>WhatsApp / Celular</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={`mt-1 ${styles.input}`}
                required
              />
            </div>
            <div>
              <Label className={styles.label}>CPF</Label>
              <Input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className={`mt-1 ${styles.input}`}
                maxLength={14}
                required
              />
            </div>
          </>
        )}

        {/* Step 3: Address */}
        {currentStep === 3 && (
          <>
            <div>
              <Label className={styles.label}>CEP</Label>
              <Input
                type="text"
                value={addressZip}
                onChange={(e) => {
                  const formatted = formatCEP(e.target.value);
                  setAddressZip(formatted);
                  if (formatted.replace(/\D/g, '').length === 8) {
                    fetchCEP(formatted);
                  }
                }}
                placeholder="00000-000"
                className={`mt-1 ${styles.input}`}
                maxLength={9}
                required
              />
              {cepLoading && (
                <p className={`text-xs mt-1 ${styles.headerSubtitle || 'text-muted-foreground'}`}>
                  Buscando endereço...
                </p>
              )}
            </div>
            <div>
              <Label className={styles.label}>Endereço</Label>
              <Input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Rua, número, complemento"
                className={`mt-1 ${styles.input}`}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className={styles.label}>Cidade</Label>
                <Input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Cidade"
                  className={`mt-1 ${styles.input}`}
                  required
                />
              </div>
              <div>
                <Label className={styles.label}>UF</Label>
                <select
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className={`mt-1 w-full h-10 rounded-md border px-3 text-sm ${styles.input}`}
                  required
                >
                  <option value="">UF</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Step error */}
        {stepError && (
          <Alert className={styles.alert}>
            <AlertCircle className={`h-4 w-4 ${styles.alertIcon}`} />
            <AlertDescription className={`text-xs ${styles.alertText}`}>
              {stepError}
            </AlertDescription>
          </Alert>
        )}

        {labels.warning && currentStep === 1 && (
          <Alert className={styles.alert}>
            <AlertCircle className={`h-4 w-4 ${styles.alertIcon}`} />
            <AlertDescription className={`text-xs ${styles.alertText}`}>
              {labels.warning}
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-2 pt-1">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className={`flex-1 py-5 ${styles.backButton}`}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className={`flex-1 font-bold py-5 text-base ${styles.button}`}
            >
              Próximo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className={`flex-1 font-bold py-5 text-base ${styles.button}`}
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
          )}
        </div>

        {currentStep === 1 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBackToLogin}
            className={`w-full ${styles.backButton}`}
          >
            {labels.backToLogin || 'Voltar ao login'}
          </Button>
        )}
      </form>
    </div>
  );
}
