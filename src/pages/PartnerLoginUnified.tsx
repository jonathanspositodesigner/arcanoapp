import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { LoginEmailStep, LoginPasswordStep } from "@/components/auth";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const PartnerLoginUnified = () => {
  const navigate = useNavigate();

  // Unified partner validation with platform routing
  const validatePartnerUnified = async (user: User): Promise<{ valid: boolean; error?: string }> => {
    // Check if user has partner role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'partner')
      .maybeSingle();

    if (!roleData) {
      return { valid: false, error: "Você não tem acesso como colaborador" };
    }

    // Check if partner exists in partners table
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('id, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (partnerError || !partnerData) {
      return { valid: false, error: "Conta de colaborador não encontrada" };
    }

    if (!partnerData.is_active) {
      return { valid: false, error: "Sua conta de colaborador está desativada" };
    }

    // Fetch partner platforms
    const { data: platformsData } = await supabase
      .from('partner_platforms')
      .select('platform, is_active')
      .eq('partner_id', partnerData.id)
      .eq('is_active', true);

    const activePlatforms = platformsData || [];

    if (activePlatforms.length === 0) {
      return { valid: false, error: "Você não tem acesso a nenhuma plataforma. Contate o administrador." };
    }

    // Store platforms for navigation after validation
    (window as any).__partnerPlatforms = activePlatforms;

    return { valid: true };
  };

  const auth = useUnifiedAuth({
    changePasswordRoute: '/change-password',
    loginRoute: '/parceiro-login-unificado',
    forgotPasswordRoute: '/forgot-password',
    defaultRedirect: '/parceiro-plataformas', // Default, will be overridden
    postLoginValidation: validatePartnerUnified,
    onLoginSuccess: () => {
      const platforms = (window as any).__partnerPlatforms || [];
      delete (window as any).__partnerPlatforms;

      toast.success("Login realizado com sucesso!");

      if (platforms.length === 1) {
        // Redirect directly to the single platform
        const platform = platforms[0].platform;
        switch (platform) {
          case 'prompts':
            navigate('/parceiro-dashboard');
            break;
          case 'artes_eventos':
            navigate('/parceiro-dashboard-artes');
            break;
          case 'artes_musicos':
            navigate('/parceiro-dashboard-musicos');
            break;
          default:
            navigate('/parceiro-plataformas');
        }
      } else {
        // Multiple platforms - show selection
        navigate('/parceiro-plataformas');
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Área do Colaborador</CardTitle>
          <CardDescription>
            Faça login para acessar seu painel de colaborador
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

          <Button
            type="button"
            variant="ghost"
            className="w-full mt-4"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLoginUnified;
