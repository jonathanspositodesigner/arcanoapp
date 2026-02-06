import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Star, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep, SignupForm } from "@/components/auth";

const UserLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/biblioteca-prompts';
  const { t } = useTranslation('auth');

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/login',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: redirectTo,
    t: (key: string) => t(key),
    // No premium validation - allow all users to login
  });

  // Check if user is already logged in and redirect
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile || !profile.password_changed) {
          navigate(`/change-password?redirect=${redirectTo}`);
        } else {
          navigate(redirectTo);
        }
      }
    };
    checkLoginStatus();
  }, [navigate, redirectTo]);

  return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center p-4">
      {/* Signup Modal */}
      <Dialog open={auth.state.step === 'signup'} onOpenChange={(open) => !open && auth.goToLogin()}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0">
          <SignupForm
            defaultEmail={auth.state.email}
            onSubmit={auth.signup}
            onBackToLogin={auth.goToLogin}
            isLoading={auth.state.isLoading}
            variant="purple"
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

      <Card className="w-full max-w-md p-8 bg-[#1A0A2E] border-purple-500/20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-8 w-8 text-yellow-500" fill="currentColor" />
            <h1 className="text-3xl font-bold text-white">
              {t('premiumArea')}
            </h1>
          </div>
          <p className="text-purple-300">
            {t('premiumAreaDescription')}
          </p>
        </div>

        {auth.state.step === 'email' && (
          <>
            {/* First access notice */}
            <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
              <Info className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-sm text-yellow-400">
                <strong>{t('firstAccess.title')}?</strong> {t('loginCard.firstAccessHint')}
              </AlertDescription>
            </Alert>

            <LoginEmailStep
              email={auth.state.email}
              onEmailChange={auth.setEmail}
              onSubmit={auth.checkEmail}
              onSignupClick={auth.goToSignup}
              isLoading={auth.state.isLoading}
              variant="purple"
              labels={{
                email: t('email'),
                emailPlaceholder: t('email'),
                continue: t('continue'),
                loading: t('checking'),
                noAccountYet: t('noAccountYet'),
                createAccount: t('createAccountButton'),
              }}
            />
          </>
        )}

        {auth.state.step === 'password' && (
          <LoginPasswordStep
            email={auth.state.verifiedEmail}
            onSubmit={auth.loginWithPassword}
            onChangeEmail={auth.changeEmail}
            forgotPasswordUrl={auth.getForgotPasswordUrl()}
            isLoading={auth.state.isLoading}
            variant="purple"
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
      </Card>
    </div>
  );
};

export default UserLogin;
