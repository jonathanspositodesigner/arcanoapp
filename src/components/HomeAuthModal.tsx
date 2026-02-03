import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Loader2, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle2, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface HomeAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

const HomeAuthModal = ({ open, onClose, onAuthSuccess }: HomeAuthModalProps) => {
  const { t } = useTranslation('index');
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");

  // Two-step login state
  const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
  const [loginEmail, setLoginEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Validation schemas
  const signupSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMinLength')),
    confirmPassword: z.string(),
    name: z.string().min(2, t('auth.nameRequired')),
    phone: z.string().min(10, t('auth.phoneRequired')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsMismatch'),
    path: ["confirmPassword"],
  });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setSignupPhone(formatted);
  };

  // Step 1: Check email
  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim()) {
      toast.error(t('auth.emailRequired'));
      return;
    }
    
    setIsCheckingEmail(true);
    
    try {
      const { data: profileCheck, error } = await supabase
        .rpc('check_profile_exists', { check_email: loginEmail.trim() });
      
      if (error) throw error;
      
      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      const passwordChanged = profileCheck?.[0]?.password_changed || false;
      
      if (!profileExists) {
        // Email not found - switch to signup tab
        toast.info(t('auth.emailNotFoundSignup'));
        setSignupEmail(loginEmail.trim());
        setActiveTab('signup');
        return;
      }
      
      if (profileExists && !passwordChanged) {
        // First access - auto login with email as password
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginEmail.trim().toLowerCase(),
        });
        
        if (!autoLoginError) {
          toast.success(t('auth.firstAccessSetPassword'));
          onClose();
          window.location.href = '/change-password?redirect=/';
        } else {
          // Login automático falhou - enviar link para criar senha (NÃO forgot-password)
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            loginEmail.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/change-password?redirect=/` }
          );
          
          if (!resetError) {
            toast.success(t('auth.passwordLinkSent') || 'Enviamos um link para criar sua senha. Verifique seu email.');
          } else {
            toast.error(t('auth.errorSendingLink') || 'Erro ao enviar link. Tente novamente.');
          }
          onClose();
        }
        return;
      }
      
      // Email exists and has password - go to step 2
      setVerifiedEmail(loginEmail.trim());
      setLoginStep('password');
      
    } catch (error) {
      console.error('Error checking email:', error);
      toast.error(t('auth.loginError'));
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Step 2: Login with password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginPassword) {
      toast.error(t('auth.passwordRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: verifiedEmail.toLowerCase(),
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t('auth.invalidCredentials'));
        } else if (error.message.includes("Email not confirmed")) {
          toast.error(t('auth.emailNotConfirmed'));
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Login successful - check if user needs to change password
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_changed')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile || !profile.password_changed) {
        toast.success(t('auth.firstAccessSetPassword'));
        onClose();
        window.location.href = '/change-password?redirect=/';
        return;
      }

      toast.success(t('auth.loginSuccess'));
      onAuthSuccess();
    } catch (error) {
      toast.error(t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setLoginStep('email');
    setLoginPassword('');
    setVerifiedEmail('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        name: signupName,
        phone: signupPhone,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: signupName.trim(),
            phone: signupPhone.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          // Check if this is a first-time access
          const { data: profileCheck } = await supabase
            .rpc('check_profile_exists', { check_email: signupEmail.trim() });

          const profileExists = profileCheck?.[0]?.exists_in_db || false;
          const passwordChanged = profileCheck?.[0]?.password_changed || false;

          if (profileExists && !passwordChanged) {
            const { error: autoLoginError } = await supabase.auth.signInWithPassword({
              email: signupEmail.trim().toLowerCase(),
              password: signupEmail.trim().toLowerCase(),
            });

            if (!autoLoginError) {
              toast.success(t('auth.firstAccessSetPassword'));
              onClose();
              window.location.href = '/change-password?redirect=/';
              return;
            }
          }

          toast.error(t('auth.emailAlreadyExists'));
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Create profile entry
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: signupEmail.trim().toLowerCase(),
          name: signupName.trim(),
          phone: signupPhone.trim(),
          password_changed: true,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      }

      // Show success screen
      setSignupSuccessEmail(signupEmail.trim().toLowerCase());
      setSignupSuccess(true);
      
      // Reset form
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setSignupName("");
      setSignupPhone("");
    } catch (error) {
      toast.error(t('auth.signupError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal closes or tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "login" | "signup");
    setLoginStep('email');
    setLoginPassword('');
    setVerifiedEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="p-6 pt-8">
          {/* Success Screen after Signup */}
          {signupSuccess ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('auth.signupSuccessTitle')}
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                {t('auth.signupSuccessMessage')}
              </p>
              <p className="text-sm font-medium text-foreground mb-4">
                {signupSuccessEmail}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                {t('auth.signupSuccessInstruction')}
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                {t('auth.signupSuccessSpam')}
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSignupSuccess(false);
                  setActiveTab("login");
                  setLoginStep('email');
                }}
                className="w-full"
              >
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {t('auth.welcomeTitle')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.welcomeSubtitle')}
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  {/* Step 1: Email */}
                  {loginStep === 'email' && (
                    <form onSubmit={handleEmailCheck} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">{t('auth.email')}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10"
                            disabled={isCheckingEmail}
                            autoFocus
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isCheckingEmail}>
                        {isCheckingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.loading')}
                          </>
                        ) : (
                          t('auth.continue') || 'Continuar'
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Step 2: Password */}
                  {loginStep === 'password' && (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      {/* Email indicator */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{verifiedEmail}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleChangeEmail}
                          className="text-xs h-auto py-1 px-2"
                        >
                          {t('auth.changeEmail') || 'Trocar'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t('auth.password')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t('auth.passwordPlaceholder')}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10 pr-10"
                            disabled={isLoading}
                            autoFocus
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
                        <a 
                          href={`/forgot-password?email=${encodeURIComponent(verifiedEmail)}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {t('auth.forgotPassword')}
                        </a>
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.loading')}
                          </>
                        ) : (
                          t('auth.loginButton')
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">{t('auth.name')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder={t('auth.namePlaceholder')}
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">{t('auth.phone')}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder={t('auth.phonePlaceholder')}
                          value={signupPhone}
                          onChange={handlePhoneChange}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t('auth.passwordPlaceholder')}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10 pr-10"
                          disabled={isLoading}
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

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">{t('auth.confirmPassword')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t('auth.confirmPasswordPlaceholder')}
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth.loading')}
                        </>
                      ) : (
                        t('auth.signupButton')
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Navigate without login option */}
              <div className="mt-6 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <MousePointerClick className="h-4 w-4" />
                  <span>{t('auth.browseWithoutLogin')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HomeAuthModal;
