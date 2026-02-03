import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, CheckCircle2, MousePointerClick } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "login" | "signup");
    if (tab === 'signup') {
      auth.goToSignup();
    } else {
      auth.goToLogin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

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
                  setActiveTab("login");
                  auth.goToLogin();
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
                  {auth.state.step === 'email' && (
                    <LoginEmailStep
                      email={auth.state.email}
                      onEmailChange={auth.setEmail}
                      onSubmit={auth.checkEmail}
                      onSignupClick={() => handleTabChange('signup')}
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
                </TabsContent>

                <TabsContent value="signup">
                  <SignupForm
                    defaultEmail={auth.state.email}
                    onSubmit={auth.signup}
                    onBackToLogin={() => handleTabChange('login')}
                    isLoading={auth.state.isLoading}
                    showNameField={true}
                    showPhoneField={true}
                    nameRequired={true}
                    phoneRequired={true}
                    labels={{
                      email: t('auth.email'),
                      emailPlaceholder: t('auth.emailPlaceholder'),
                      name: t('auth.name'),
                      namePlaceholder: t('auth.namePlaceholder'),
                      phone: t('auth.phone'),
                      phonePlaceholder: t('auth.phonePlaceholder'),
                      password: t('auth.password'),
                      passwordPlaceholder: t('auth.passwordPlaceholder'),
                      confirmPassword: t('auth.confirmPassword'),
                      confirmPasswordPlaceholder: t('auth.confirmPasswordPlaceholder'),
                      createAccount: t('auth.signupButton'),
                      creatingAccount: t('auth.loading'),
                      backToLogin: '',
                    }}
                  />
                </TabsContent>
              </Tabs>

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
