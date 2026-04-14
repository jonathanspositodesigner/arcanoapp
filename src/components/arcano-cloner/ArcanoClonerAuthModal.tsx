import { useState, useCallback, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, ArrowLeft, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { LoginEmailStep, LoginPasswordStep } from '@/components/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ModalStep = 'email' | 'password' | 'signup' | 'verify-email';

function SimpleSignupForm({ defaultEmail, onSubmit, onBackToLogin, isLoading: formLoading }: {
  defaultEmail: string;
  onSubmit: (data: { email: string; password: string; name?: string }) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
}) {
  const [formEmail, setFormEmail] = useState(defaultEmail);
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState('');

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formEmail.trim()) { setFormError('Digite seu email'); return; }
    if (formPassword.length < 6) { setFormError('Senha deve ter pelo menos 6 caracteres'); return; }
    if (formPassword !== formConfirmPassword) { setFormError('As senhas não conferem'); return; }
    await onSubmit({ email: formEmail, password: formPassword, name: formName || undefined });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-3">
      <div>
        <Label className="text-muted-foreground">Email</Label>
        <Input
          type="email"
          value={formEmail}
          onChange={(e) => setFormEmail(e.target.value)}
          placeholder="seu@email.com"
          className="mt-1 bg-background border-border text-white placeholder:text-muted-foreground"
          required
        />
      </div>
      <div>
        <Label className="text-muted-foreground">Nome (opcional)</Label>
        <Input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Seu nome"
          className="mt-1 bg-background border-border text-white placeholder:text-muted-foreground"
        />
      </div>
      <div className="relative">
        <Label className="text-muted-foreground">Senha</Label>
        <Input
          type={showPwd ? "text" : "password"}
          value={formPassword}
          onChange={(e) => setFormPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="mt-1 pr-10 bg-background border-border text-white placeholder:text-muted-foreground"
          required
          minLength={6}
        />
        <button
          type="button"
          onClick={() => setShowPwd(!showPwd)}
          className="absolute right-3 top-[calc(50%+4px)] text-muted-foreground hover:text-foreground"
        >
          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div>
        <Label className="text-muted-foreground">Confirmar Senha</Label>
        <Input
          type="password"
          value={formConfirmPassword}
          onChange={(e) => setFormConfirmPassword(e.target.value)}
          placeholder="Confirme sua senha"
          className="mt-1 bg-background border-border text-white placeholder:text-muted-foreground"
          required
        />
      </div>

      {formError && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
        <p className="text-yellow-400 text-xs">
          ⚠️ Após criar sua conta, verifique seu email para ativar.
        </p>
      </div>

      <Button
        type="submit"
        disabled={formLoading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5"
      >
        {formLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando conta...
          </>
        ) : (
          '🚀 Criar Conta e Ganhar 300 Créditos'
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowLeft className="w-3 h-3" />
          Já tenho conta
        </button>
      </div>
    </form>
  );
}

interface ArcanoClonerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  /** Path to redirect after email confirmation (default: /arcano-cloner-tool) */
  redirectPath?: string;
}

export default function ArcanoClonerAuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  redirectPath = '/arcano-cloner-tool',
}: ArcanoClonerAuthModalProps) {
  const [step, setStep] = useState<ModalStep>('email');
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setVerifiedEmail('');
      setPendingUserId(null);
      setEmailSendError(null);
      setIsLoading(false);
      setIsResendingEmail(false);
    }
  }, [isOpen]);

  // Listen for auth state changes only while user is waiting for email confirmation
  useEffect(() => {
    if (!isOpen || step !== 'verify-email') return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.email_verified !== true) {
        console.log('[ArcanoClonerAuth] onAuthStateChange: email not verified, signing out');
        await supabase.auth.signOut();
        return;
      }

      onAuthSuccess();
    });

    return () => subscription.unsubscribe();
  }, [isOpen, step, onAuthSuccess]);

  const sendConfirmationEmail = useCallback(async (targetEmail: string, userId: string, redirectTo?: string) => {
    const { data, error } = await supabase.functions.invoke('send-free-trial-confirmation-email', {
      body: { email: targetEmail, user_id: userId, redirect_path: redirectTo || null },
    });

    if (error || !data?.success) {
      const errorMessage = data?.error || error?.message || 'Falha ao enviar email de confirmação';
      return { success: false, error: errorMessage };
    }

    return { success: true as const };
  }, []);

  const handleCheckEmail = useCallback(async () => {
    const emailToCheck = email.trim().toLowerCase();
    if (!emailToCheck) {
      toast.error('Digite seu email');
      return;
    }

    setIsLoading(true);

    try {
      const { data: profileCheck, error } = await supabase
        .rpc('check_profile_exists', { check_email: emailToCheck });

      if (error) throw error;

      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      let passwordChanged = profileCheck?.[0]?.password_changed || false;
      const profileCreatedAt = profileCheck?.[0]?.created_at;
      const hasLoggedIn = profileCheck?.[0]?.has_logged_in || false;
      
      // Legacy accounts created before 2026-03-12 should skip first-access flow
      // BUT only if they have actually logged in before
      const LEGACY_CUTOFF = new Date('2026-03-12T00:00:00Z');
      if (profileExists && !passwordChanged && profileCreatedAt && new Date(profileCreatedAt) < LEGACY_CUTOFF && hasLoggedIn) {
        console.log('[ArcanoClonerAuth] Legacy account pre-cutoff WITH login history, skipping first-access flow');
        passwordChanged = true;
      }

      if (!profileExists) {
        // Not registered → signup
        toast.info('Email não encontrado. Crie sua conta.');
        setVerifiedEmail(emailToCheck);
        setStep('signup');
      } else if (profileExists && passwordChanged && !hasLoggedIn) {
        // User created by webhook, never logged in - try auto-login with email as password
        console.log('[ArcanoClonerAuth] User never logged in despite password_changed=true, trying auto-login');
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: emailToCheck,
          password: emailToCheck,
        });

        if (!autoLoginError) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email_verified')
              .eq('id', user.id)
              .maybeSingle();

            if (profile?.email_verified !== true) {
              await supabase.auth.signOut();
              setVerifiedEmail(emailToCheck);
              setPendingUserId(user.id);
              setStep('verify-email');
              toast.error('Confirme seu email antes de entrar.');
              setIsLoading(false);
              return;
            }
          }
          toast.success('Primeiro acesso! Cadastre sua senha.');
          onAuthSuccess();
        } else {
          // Auto-login failed → go to password step
          toast.info('Digite sua senha para continuar.');
          setVerifiedEmail(emailToCheck);
          setStep('password');
        }
      } else if (!passwordChanged) {
        // First access - try auto-login with email as password
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: emailToCheck,
          password: emailToCheck,
        });

        if (!autoLoginError) {
          // Check email_verified before granting access
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email_verified')
              .eq('id', user.id)
              .maybeSingle();

            if (profile?.email_verified !== true) {
              console.log('[ArcanoClonerAuth] Auto-login: email not verified, blocking');
              await supabase.auth.signOut();
              setVerifiedEmail(emailToCheck);
              setPendingUserId(user.id);
              setStep('verify-email');
              toast.error('Confirme seu email antes de entrar. Verifique a caixa de entrada e o spam.');
              setIsLoading(false);
              return;
            }
          }
          
          toast.success('Primeiro acesso! Cadastre sua senha.');
          onAuthSuccess();
        } else {
          // Fallback to password step
          toast.info('Digite sua senha para continuar.');
          setVerifiedEmail(emailToCheck);
          setStep('password');
        }
      } else {
        // Has password → go to password step
        setVerifiedEmail(emailToCheck);
        setStep('password');
      }
    } catch (error) {
      console.error('[ArcanoClonerAuth] Check email error:', error);
      toast.error('Erro ao verificar cadastro');
    } finally {
      setIsLoading(false);
    }
  }, [email, onAuthSuccess]);

  const handleLogin = useCallback(async (password: string) => {
    if (!password) {
      toast.error('Digite sua senha');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: verifiedEmail,
        password,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          toast.error('Confirme seu email antes de entrar.');
        } else {
          toast.error('Email ou senha incorretos');
        }
        return;
      }

      if (data.user) {
        // Check email_verified before allowing access
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.email_verified !== true) {
          console.log('[ArcanoClonerAuth] Email not verified, blocking login');
          await supabase.auth.signOut();
          setStep('verify-email');
          setPendingUserId(data.user.id);
          setEmailSendError(null);
          toast.error('Confirme seu email antes de entrar. Verifique a caixa de entrada e o spam.');
          return;
        }

        toast.success('Login realizado com sucesso!');
        onAuthSuccess();
      }
    } catch (error) {
      console.error('[ArcanoClonerAuth] Login error:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  }, [verifiedEmail, onAuthSuccess]);

  const handleSignup = useCallback(async (signupData: { email: string; password: string; name?: string; phone?: string }) => {
    if (signupData.password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    const normalizedEmail = signupData.email.trim().toLowerCase();

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath}`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(`Erro ao criar conta: ${error.message}`);
        }
        return;
      }

      if (authData.user) {
        // Create profile with email_verified = false
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: normalizedEmail,
          name: signupData.name?.trim() || null,
          phone: signupData.phone?.trim() || null,
          password_changed: true,
          email_verified: false,
        }, { onConflict: 'id' });

        setPendingUserId(authData.user.id);

        const emailResult = await sendConfirmationEmail(normalizedEmail, authData.user.id, redirectPath);

        // Sign out immediately - user must confirm email first
        await supabase.auth.signOut();

        setVerifiedEmail(normalizedEmail);
        setStep('verify-email');

        if (!emailResult.success) {
          setEmailSendError(emailResult.error);
          toast.error('Conta criada, mas houve falha no envio do email. Clique em reenviar.');
          return;
        }

        setEmailSendError(null);
        toast.success('Conta criada! Confirme seu email (verifique também o spam).');
      }
    } catch (error) {
      console.error('[ArcanoClonerAuth] Signup error:', error);
      toast.error('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  }, [sendConfirmationEmail]);

  const handleResendConfirmationEmail = useCallback(async () => {
    const emailToResend = (verifiedEmail || email).trim().toLowerCase();

    if (!pendingUserId || !emailToResend) {
      setEmailSendError('Não foi possível reenviar agora. Tente criar a conta novamente.');
      return;
    }

    setIsResendingEmail(true);

    try {
      const resendResult = await sendConfirmationEmail(emailToResend, pendingUserId, redirectPath);

      if (!resendResult.success) {
        setEmailSendError(resendResult.error);
        toast.error('Falha ao reenviar email. Tente novamente em instantes.');
        return;
      }

      setEmailSendError(null);
      toast.success('Email reenviado! Confira caixa de entrada e spam.');
    } catch (resendError) {
      console.error('[ArcanoClonerAuth] Resend confirmation email error:', resendError);
      setEmailSendError('Falha ao reenviar email de confirmação.');
      toast.error('Falha ao reenviar email.');
    } finally {
      setIsResendingEmail(false);
    }
  }, [verifiedEmail, email, pendingUserId, sendConfirmationEmail, redirectPath]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-[#1A0A2E] to-[#111113] border-border text-white p-0 max-w-md overflow-hidden [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
        {/* Header */}
        <div className="bg-accent0/10 border-b border-border p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent0/20 flex items-center justify-center mb-3">
            <Gift className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Ganhe 300 créditos grátis!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Faça login ou crie sua conta para começar
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            ⏳ Créditos válidos por 24 horas
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'email' && (
            <LoginEmailStep
              email={email}
              onEmailChange={setEmail}
              onSubmit={handleCheckEmail}
              onSignupClick={() => setStep('signup')}
              isLoading={isLoading}
              variant="dark"
              labels={{
                emailPlaceholder: 'seu@email.com',
                continue: 'Continuar',
                loading: 'Verificando...',
                noAccountYet: 'Ainda não tem conta?',
                createAccount: 'Criar Conta',
              }}
            />
          )}

          {step === 'password' && (
            <div className="space-y-4">
              <LoginPasswordStep
                email={verifiedEmail}
                onSubmit={handleLogin}
                onChangeEmail={() => setStep('email')}
                forgotPasswordUrl={`/forgot-password?email=${encodeURIComponent(verifiedEmail)}&redirect=${encodeURIComponent(redirectPath)}`}
                isLoading={isLoading}
                variant="dark"
                labels={{
                  passwordPlaceholder: '••••••••',
                  signIn: 'Entrar',
                  signingIn: 'Entrando...',
                  forgotPassword: 'Esqueci minha senha',
                  changeEmail: 'Trocar',
                }}
              />
            </div>
          )}

          {step === 'signup' && (
            <SimpleSignupForm
              defaultEmail={verifiedEmail || email}
              onSubmit={handleSignup}
              onBackToLogin={() => setStep('email')}
              isLoading={isLoading}
            />
          )}

          {step === 'verify-email' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirme seu email para continuar</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Enviamos um link de confirmação para <strong className="text-white">{verifiedEmail || email}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Verifique também a pasta de spam/lixo eletrônico. Sem confirmação do link, o login e o acesso ficam bloqueados.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Após confirmar no email, você será redirecionado automaticamente para a página de ferramentas.
                </p>
              </div>

              {emailSendError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{emailSendError}</span>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-accent0/10"
                onClick={handleResendConfirmationEmail}
                disabled={isResendingEmail || !pendingUserId}
              >
                {isResendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando email...
                  </>
                ) : (
                  'Reenviar email de confirmação'
                )}
              </Button>

              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-accent0/10"
                onClick={() => setStep('email')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao login
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
