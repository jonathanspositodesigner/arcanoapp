import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { LoginEmailStep, LoginPasswordStep, SignupForm } from '@/components/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ModalStep = 'email' | 'password' | 'signup' | 'verify-email';

interface ArcanoClonerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function ArcanoClonerAuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: ArcanoClonerAuthModalProps) {
  const [step, setStep] = useState<ModalStep>('email');
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setVerifiedEmail('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Listen for auth state changes (user logs in from verify email link)
  // But only trigger if email is verified to prevent bypassing verification
  useEffect(() => {
    if (!isOpen) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check email_verified before granting access
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && profile.email_verified === false) {
          console.log('[ArcanoClonerAuth] onAuthStateChange: email not verified, signing out');
          await supabase.auth.signOut();
          return;
        }

        onAuthSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [isOpen, onAuthSuccess]);

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
      const passwordChanged = profileCheck?.[0]?.password_changed || false;

      if (!profileExists) {
        // Not registered → signup
        toast.info('Email não encontrado. Crie sua conta.');
        setVerifiedEmail(emailToCheck);
        setStep('signup');
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

            if (profile && profile.email_verified === false) {
              console.log('[ArcanoClonerAuth] Auto-login: email not verified, blocking');
              await supabase.auth.signOut();
              toast.error('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
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

        if (profile && profile.email_verified === false) {
          console.log('[ArcanoClonerAuth] Email not verified, blocking login');
          await supabase.auth.signOut();
          toast.error('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
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
          emailRedirectTo: `${window.location.origin}/arcano-cloner-tool`,
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

        // Send confirmation email via SendPulse
        try {
          await supabase.functions.invoke('send-confirmation-email', {
            body: { email: normalizedEmail, user_id: authData.user.id }
          });
          console.log('[ArcanoClonerAuth] Confirmation email sent');
        } catch (e) {
          console.error('[ArcanoClonerAuth] Failed to send confirmation email:', e);
        }

        // Sign out immediately - user must confirm email first
        await supabase.auth.signOut();

        toast.success('Conta criada! Verifique seu email para confirmar.');
        setVerifiedEmail(normalizedEmail);
        setStep('verify-email');
      }
    } catch (error) {
      console.error('[ArcanoClonerAuth] Signup error:', error);
      toast.error('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-[#1A0A2E] to-[#0D0221] border-purple-500/30 text-white p-0 max-w-md overflow-hidden [&>button]:text-purple-300 [&>button]:hover:text-white">
        {/* Header */}
        <div className="bg-purple-500/10 border-b border-purple-500/20 p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
            <Gift className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Ganhe 180 créditos grátis!
          </h2>
          <p className="text-sm text-purple-300 mt-1">
            Faça login ou crie sua conta para começar
          </p>
          <p className="text-xs text-purple-400/80 mt-1">
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
              variant="purple"
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
                forgotPasswordUrl={`/forgot-password?email=${encodeURIComponent(verifiedEmail)}&redirect=/arcano-cloner-tool`}
                isLoading={isLoading}
                variant="purple"
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
            <SignupForm
              defaultEmail={verifiedEmail || email}
              onSubmit={handleSignup}
              onBackToLogin={() => setStep('email')}
              isLoading={isLoading}
              showNameField={true}
              showPhoneField={false}
              variant="purple"
              labels={{
                title: 'Criar Conta',
                subtitle: 'Cadastre-se e ganhe 180 créditos grátis',
                email: 'Email',
                emailPlaceholder: 'seu@email.com',
                name: 'Nome (opcional)',
                namePlaceholder: 'Seu nome',
                password: 'Senha',
                passwordPlaceholder: 'Mínimo 6 caracteres',
                confirmPassword: 'Confirmar Senha',
                confirmPasswordPlaceholder: 'Confirme sua senha',
                warning: 'Após criar sua conta, verifique seu email para ativar.',
                createAccount: 'Criar Conta',
                creatingAccount: 'Criando conta...',
                backToLogin: 'Já tenho conta',
              }}
            />
          )}

          {step === 'verify-email' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Verifique seu email!</h3>
                <p className="text-sm text-purple-300 mt-2">
                  Enviamos um link de confirmação para <strong className="text-white">{verifiedEmail || email}</strong>
                </p>
                <p className="text-xs text-purple-400 mt-2">
                  Após confirmar, volte aqui e faça login para receber seus 180 créditos grátis.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
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
