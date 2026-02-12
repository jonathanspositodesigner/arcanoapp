import { useState } from "react";
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
}

const HomeAuthModal = ({ open, onClose, onAuthSuccess }: HomeAuthModalProps) => {
  const { t } = useTranslation('index');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: '/',
    onLoginSuccess: onAuthSuccess,
    onSignupSuccess: () => {
      setSignupSuccessEmail(auth.state.email);
      setSignupSuccess(true);
    },
    onClose,
    t: (key: string) => t(`auth.${key}`) || t(key),
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
                  auth.goToLogin();
                }}
                className="w-full"
              >
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : auth.state.step === 'signup' ? (
            <>
              <SignupForm
                defaultEmail={auth.state.email}
                onSubmit={auth.signup}
                onBackToLogin={auth.goToLogin}
                isLoading={auth.state.isLoading}
                variant="default"
                labels={{
                  title: t('auth.createAccountTitle') || 'Criar Conta',
                  email: t('auth.email'),
                  emailPlaceholder: t('auth.emailPlaceholder'),
                  password: t('auth.password'),
                  passwordPlaceholder: t('auth.passwordPlaceholder'),
                  confirmPassword: t('auth.confirmPassword') || 'Confirmar Senha',
                  createAccount: t('auth.createAccountButton') || 'Criar Conta',
                  creatingAccount: t('auth.loading'),
                  backToLogin: t('auth.backToLogin') || 'Voltar ao Login',
                }}
              />
            </>
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

              {auth.state.step === 'email' && (
                <LoginEmailStep
                  email={auth.state.email}
                  onEmailChange={auth.setEmail}
                  onSubmit={auth.checkEmail}
                  onSignupClick={() => {}}
                  isLoading={auth.state.isLoading}
                  labels={{
                    email: t('auth.email'),
                    emailPlaceholder: t('auth.emailPlaceholder'),
                    continue: t('auth.continue') || 'Continuar',
                    loading: t('auth.loading'),
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
                    password: t('auth.password'),
                    passwordPlaceholder: t('auth.passwordPlaceholder'),
                    signIn: t('auth.loginButton'),
                    signingIn: t('auth.loading'),
                    forgotPassword: t('auth.forgotPassword'),
                    changeEmail: t('auth.changeEmail') || 'Trocar',
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
