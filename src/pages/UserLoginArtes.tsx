import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep, SignupForm } from "@/components/auth";

const UserLoginArtes = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/biblioteca-artes';

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password-artes',
    loginRoute: '/login-artes',
    forgotPasswordRoute: '/forgot-password-artes',
    defaultRedirect: redirectTo,
    t: (key: string) => t(key),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      {/* Signup Modal */}
      <Dialog open={auth.state.step === 'signup'} onOpenChange={(open) => !open && auth.goToLogin()}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0">
          <SignupForm
            defaultEmail={auth.state.email}
            onSubmit={auth.signup}
            onBackToLogin={auth.goToLogin}
            isLoading={auth.state.isLoading}
            variant="dark"
            labels={{
              title: t('signupModal.title'),
              subtitle: t('signupModal.subtitle'),
              email: t('email'),
              emailPlaceholder: t('signupModal.emailPlaceholder'),
              name: t('signupModal.nameOptional'),
              namePlaceholder: t('signupModal.namePlaceholder'),
              password: t('password'),
              passwordPlaceholder: t('signupModal.minCharacters'),
              confirmPassword: t('confirmPassword'),
              confirmPasswordPlaceholder: t('signupModal.confirmPasswordPlaceholder'),
              warning: t('signupModal.afterSignupWarning'),
              createAccount: t('signupModal.createMyAccount'),
              creatingAccount: t('creatingAccount'),
              backToLogin: t('signupModal.backToLogin'),
            }}
          />
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-white/70 hover:text-white"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <CardTitle className="text-2xl text-white">
            {t('loginCard.title')}
          </CardTitle>
          <CardDescription className="text-white/60">
            {t('loginCard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auth.state.step === 'email' && (
            <LoginEmailStep
              email={auth.state.email}
              onEmailChange={auth.setEmail}
              onSubmit={auth.checkEmail}
              onSignupClick={auth.goToSignup}
              isLoading={auth.state.isLoading}
              variant="dark"
              labels={{
                email: t('email'),
                emailPlaceholder: t('email'),
                continue: t('continue'),
                loading: t('checking'),
                noAccountYet: t('noAccountYet'),
                createAccount: t('createAccountButton'),
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
              variant="dark"
              labels={{
                password: t('password'),
                passwordPlaceholder: t('password'),
                signIn: t('signIn'),
                signingIn: t('signingIn'),
                forgotPassword: t('forgotPassword'),
                changeEmail: t('changeEmail'),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLoginArtes;
