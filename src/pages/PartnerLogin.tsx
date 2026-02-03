import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep } from "@/components/auth";
import { User } from "@supabase/supabase-js";

const PartnerLogin = () => {
  const navigate = useNavigate();

  // Partner-specific validation
  const validatePartner = async (user: User): Promise<{ valid: boolean; error?: string }> => {
    // Check if user has partner role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'partner')
      .maybeSingle();

    if (roleError || !roleData) {
      return { valid: false, error: "Acesso negado. Esta área é exclusiva para parceiros." };
    }

    // Check if partner is active
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (partnerError || !partnerData) {
      return { valid: false, error: "Conta de parceiro não encontrada." };
    }

    if (!partnerData.is_active) {
      return { valid: false, error: "Sua conta de parceiro está desativada. Entre em contato com o administrador." };
    }

    return { valid: true };
  };

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/parceiro-login',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: '/parceiro-dashboard',
    postLoginValidation: validatePartner,
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Área do Parceiro
            </h1>
            <p className="text-muted-foreground">
              Faça login para acessar sua dashboard
            </p>
          </div>

          {auth.state.step === 'email' && (
            <LoginEmailStep
              email={auth.state.email}
              onEmailChange={auth.setEmail}
              onSubmit={auth.checkEmail}
              onSignupClick={() => {}} // Partners can't self-register
              isLoading={auth.state.isLoading}
              labels={{
                email: 'Email',
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
                passwordPlaceholder: '••••••••',
                signIn: 'Entrar',
                signingIn: 'Entrando...',
                forgotPassword: 'Esqueci minha senha',
                changeEmail: 'Trocar',
              }}
            />
          )}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/admin-login")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Acesso Administradores
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PartnerLogin;
