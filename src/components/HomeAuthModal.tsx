import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MousePointerClick, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep, SignupForm } from "@/components/auth";

interface HomeAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  onSignupStart?: () => void;
  onSignupEnd?: () => void;
}

const HomeAuthModal = ({ open, onClose, onAuthSuccess, onSignupStart, onSignupEnd }: HomeAuthModalProps) => {
  const { t: tAuth } = useTranslation('auth');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");
  const signupInProgressRef = useRef(false);

  useEffect(() => {
    if (open) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('referral_code', ref);
      }
    }
  }, [open]);

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: '/',
    onLoginSuccess: onAuthSuccess,
    onSignupSuccess: () => {
      setSignupSuccessEmail(auth.state.email);
      setSignupSuccess(true);
      signupInProgressRef.current = false;
      onSignupEnd?.();
    },
    onClose: () => {
      if (!signupInProgressRef.current && !signupSuccess) {
        onClose();
      }
    },
    t: (key: string) => tAuth(key, key),
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="p-6 pt-8">
          {signupSuccess ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Verifique seu E-mail!
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                Enviamos um link de confirmação para:
              </p>
              <p className="text-sm font-medium text-foreground mb-4">
                {signupSuccessEmail}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Clique no link do e-mail para ativar sua conta e fazer login.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Não encontrou? Verifique a pasta de spam.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSignupSuccess(false);
                  auth.goToLogin();
                }}
                className="w-full"
              >
                Voltar para Login
              </Button>
            </div>
          ) : auth.state.step === 'signup' ? (
            <SignupForm
              defaultEmail={auth.state.email}
              onSubmit={async (data) => {
                signupInProgressRef.current = true;
                onSignupStart?.();
                await auth.signup(data);
              }}
              onBackToLogin={auth.goToLogin}
              isLoading={auth.state.isLoading}
              showPhoneField={true}
              variant="default"
              labels={{
                title: 'Criar Conta',
                email: 'E-mail',
                emailPlaceholder: 'seu@email.com',
                name: 'Nome (opcional)',
                namePlaceholder: 'Seu nome',
                phone: 'WhatsApp (opcional)',
                phonePlaceholder: '(00) 00000-0000',
                password: 'Senha',
                passwordPlaceholder: 'Mínimo 6 caracteres',
                confirmPassword: 'Confirmar Senha',
                confirmPasswordPlaceholder: 'Confirme sua senha',
                createAccount: 'Criar Conta',
                creatingAccount: 'Criando conta...',
                backToLogin: 'Voltar ao Login',
              }}
            />
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Bem-vindo ao Arcano!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Faça login ou crie sua conta
                </p>
              </div>

              {auth.state.step === 'email' && (
                <LoginEmailStep
                  email={auth.state.email}
                  onEmailChange={auth.setEmail}
                  onSubmit={auth.checkEmail}
                  onSignupClick={() => {}}
                  isLoading={auth.state.isLoading}
                  labels={{
                    email: 'E-mail',
                    emailPlaceholder: 'seu@email.com',
                    continue: 'Continuar',
                    loading: 'Verificando...',
                    noAccountYet: '',
                    createAccount: '',
                  }}
                />
              )}

              {auth.state.step === 'password' && (
                <LoginPasswordStep
                  email={auth.state.verifiedEmail}
                  onSubmit={auth.loginWithPassword}
                  onChangeEmail={auth.changeEmail}
                  forgotPasswordUrl={auth.getForgotPasswordUrl()}
                  isLoading={auth.state.isLoading}
                  labels={{
                    password: 'Senha',
                    passwordPlaceholder: 'Digite sua senha',
                    signIn: 'Entrar',
                    signingIn: 'Entrando...',
                    forgotPassword: 'Esqueceu a senha?',
                    changeEmail: 'Trocar',
                  }}
                />
              )}

              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Ainda não tem conta?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                  onClick={auth.goToSignup}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Conta
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <MousePointerClick className="h-4 w-4" />
                  <span>Navegar sem login</span>
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
