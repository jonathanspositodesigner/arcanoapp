import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Music } from "lucide-react";

const ResetPasswordArtesMusicos = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há erro no hash da URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      toast.error(errorDescription || "Link inválido ou expirado");
      navigate("/forgot-password-artes-musicos");
      return;
    }

    // Escutar mudanças de autenticação para detectar recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery session detected');
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          return;
        }
      }
    );

    // Dar tempo para o Supabase processar os tokens do hash antes de verificar sessão
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Link inválido ou expirado. Solicite um novo link.");
        navigate("/forgot-password-artes-musicos");
      }
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error("Erro ao redefinir senha");
        return;
      }

      // Get current user and update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);
      }

      toast.success("Senha redefinida com sucesso!");
      navigate("/login-artes-musicos");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erro ao redefinir senha");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-violet-500/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-violet-500/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-violet-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="h-5 w-5 text-violet-400" />
          </div>
          <CardTitle className="text-2xl text-white">Nova Senha</CardTitle>
          <CardDescription className="text-white/60">
            Defina sua nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#0f0f1a] border-violet-500/30 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#0f0f1a] border-violet-500/30 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-white/50 text-sm">
              A senha deve ter pelo menos 6 caracteres
            </p>

            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordArtesMusicos;
