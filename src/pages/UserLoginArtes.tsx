import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const UserLoginArtes = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in - go directly to biblioteca
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Usuário já logado, vai direto para biblioteca
        navigate("/biblioteca-artes");
      }
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error("Email ou senha incorretos");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check if first login (password not changed)
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile && !profile.password_changed) {
          toast.success("Primeiro acesso! Por favor, altere sua senha.");
          navigate("/change-password-artes");
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/biblioteca-artes");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

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
          <CardTitle className="text-2xl text-white">Área Premium - Artes</CardTitle>
          <CardDescription className="text-white/60">
            Acesse sua conta premium da Biblioteca de Artes Arcanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-200 text-sm">
              Primeiro acesso? Sua senha inicial é o seu email.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
                required
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password-artes")}
                className="text-sm text-[#2d4a5e] hover:text-[#3d5a6e] underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center pt-4 border-t border-[#2d4a5e]/30">
              <p className="text-white/60 text-sm mb-2">Ainda não é premium?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#2d4a5e] text-[#2d4a5e] hover:bg-[#2d4a5e] hover:text-white"
                onClick={() => navigate("/planos-artes")}
              >
                Ver Planos
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLoginArtes;
