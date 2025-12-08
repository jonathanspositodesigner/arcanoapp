import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Shield } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const PartnerLoginArtes = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validation = loginSchema.safeParse({ email: email.trim(), password });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      // Sign in
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
        // Check if user has partner_artes role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'partner')
          .maybeSingle();

        if (roleError || !roleData) {
          await supabase.auth.signOut();
          toast.error("Você não possui acesso de colaborador para Artes");
          setIsLoading(false);
          return;
        }

        // Check if partner is active in partners_artes table
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners_artes')
          .select('is_active')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (partnerError || !partnerData) {
          await supabase.auth.signOut();
          toast.error("Conta de colaborador de Artes não encontrada");
          setIsLoading(false);
          return;
        }

        if (!partnerData.is_active) {
          await supabase.auth.signOut();
          toast.error("Sua conta de colaborador de Artes está desativada");
          setIsLoading(false);
          return;
        }

        toast.success("Login realizado com sucesso!");
        navigate("/parceiro-dashboard-artes");
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
          <CardTitle className="text-2xl text-white">Área do Colaborador - Artes</CardTitle>
          <CardDescription className="text-white/60">
            Acesse sua conta de colaborador da Biblioteca de Artes
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button
              type="submit"
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center pt-4 border-t border-[#2d4a5e]/30">
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLoginArtes;
