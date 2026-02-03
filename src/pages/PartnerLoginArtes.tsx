import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep } from "@/components/auth";
import { User } from "@supabase/supabase-js";

const PartnerLoginArtes = () => {
  const navigate = useNavigate();

  // Partner-specific validation for Artes
  const validatePartnerArtes = async (user: User): Promise<{ valid: boolean; error?: string }> => {
    // Check if user has partner role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'partner')
      .maybeSingle();

    if (roleError || !roleData) {
      return { valid: false, error: "Você não possui acesso de colaborador para Artes" };
    }

    // Check if partner is active in partners_artes table
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners_artes')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (partnerError || !partnerData) {
      return { valid: false, error: "Conta de colaborador de Artes não encontrada" };
    }

    if (!partnerData.is_active) {
      return { valid: false, error: "Sua conta de colaborador de Artes está desativada" };
    }

    return { valid: true };
  };

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password-artes',
    loginRoute: '/parceiro-login-artes',
    forgotPasswordRoute: '/forgot-password-artes',
    defaultRedirect: '/parceiro-dashboard-artes',
    postLoginValidation: validatePartnerArtes,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-white/70 hover:text-white"
            onClick={() => navigate("/biblioteca-artes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-2xl text-white">Área do Colaborador - Artes</CardTitle>
          <CardDescription className="text-white/60">
            Acesse sua conta de colaborador da Biblioteca de Artes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auth.state.step === 'email' && (
            <LoginEmailStep
              email={auth.state.email}
              onEmailChange={auth.setEmail}
              onSubmit={auth.checkEmail}
              onSignupClick={() => {}} // Partners can't self-register
              isLoading={auth.state.isLoading}
              variant="dark"
              labels={{
                email: 'Email',
                emailPlaceholder: 'Email',
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
              variant="dark"
              labels={{
                password: 'Senha',
                passwordPlaceholder: 'Senha',
                signIn: 'Entrar',
                signingIn: 'Entrando...',
                forgotPassword: 'Esqueci minha senha',
                changeEmail: 'Trocar',
              }}
            />
          )}

          <div className="text-center pt-4 border-t border-[#2d4a5e]/30 mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:text-white text-sm"
              onClick={() => navigate("/admin-login")}
            >
              <Shield className="h-4 w-4 mr-2" />
              Login de Administrador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLoginArtes;
