import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const PartnerLoginUnified = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      // Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error("Erro ao fazer login");
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao autenticar");
        setIsLoading(false);
        return;
      }

      // Check if user has partner role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'partner')
        .maybeSingle();

      if (!roleData) {
        toast.error("Você não tem acesso como colaborador");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Check if partner exists in partners table
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, is_active')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (partnerError || !partnerData) {
        toast.error("Conta de colaborador não encontrada");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (!partnerData.is_active) {
        toast.error("Sua conta de colaborador está desativada");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Fetch partner platforms
      const { data: platformsData, error: platformsError } = await supabase
        .from('partner_platforms')
        .select('platform, is_active')
        .eq('partner_id', partnerData.id)
        .eq('is_active', true);

      if (platformsError) {
        console.error("Error fetching platforms:", platformsError);
      }

      const activePlatforms = platformsData || [];

      toast.success("Login realizado com sucesso!");

      // Navigate based on number of active platforms
      if (activePlatforms.length === 0) {
        toast.error("Você não tem acesso a nenhuma plataforma. Contate o administrador.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      if (activePlatforms.length === 1) {
        // Redirect directly to the single platform
        const platform = activePlatforms[0].platform;
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
            navigate('/parceiro-selecionar-plataforma');
        }
      } else {
        // Multiple platforms - show selection
        navigate('/parceiro-selecionar-plataforma');
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/")}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLoginUnified;