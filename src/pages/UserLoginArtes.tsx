import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, AlertCircle, KeyRound, Mail, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const UserLoginArtes = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Check if this email belongs to a first-time user (password_changed = false)
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (profile && profile.password_changed === false) {
          // First-time user with wrong password - show modal immediately
          toast.error("Este é seu primeiro acesso! Use seu email como senha.");
          setShowFirstAccessModal(true);
        } else {
          // Regular wrong password or email not found
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          toast.error("Email ou senha incorretos");
          
          // Show modal after 2 failed attempts as fallback
          if (newAttempts >= 2) {
            setShowFirstAccessModal(true);
          }
        }
        
        setIsLoading(false);
        return;
      }

      // Reset attempts on successful login
      setFailedAttempts(0);

      if (data.user) {
        // Check if first login (password not changed)
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('id', data.user.id)
          .maybeSingle();

        // CORREÇÃO: Se profile não existe OU password_changed = false, forçar mudança de senha
        if (!profile || !profile.password_changed) {
          // Criar/atualizar perfil se não existe
          if (!profile) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email,
              password_changed: false,
            }, { onConflict: 'id' });
          }
          toast.success("Primeiro acesso! Por favor, altere sua senha.");
          navigate("/change-password-artes");
          return;
        }

        toast.success("Login realizado com sucesso!");
        navigate("/biblioteca-artes");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const displayEmail = email.trim() || "seuemail@exemplo.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-amber-500/50 p-0 overflow-hidden">
          <div className="bg-amber-500/20 p-6 text-center border-b border-amber-500/30">
            <div className="w-20 h-20 mx-auto bg-amber-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <KeyRound className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-amber-400">
              🔑 É o seu PRIMEIRO ACESSO?
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-white/90 text-center text-lg">
              No primeiro acesso, seu <strong className="text-amber-400">login e senha</strong> são o <strong className="text-amber-400">MESMO EMAIL</strong> que você usou na compra pela Greenn!
            </p>
            
            <div className="bg-[#0f0f1a] rounded-xl p-5 border-2 border-amber-500/40 space-y-3">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-white/60">Email:</p>
                  <p className="font-mono text-amber-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
              
              <div className="h-px bg-amber-500/30" />
              
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-white/60">Senha:</p>
                  <p className="font-mono text-amber-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
            </div>
            
            <p className="text-white/60 text-center text-sm">
              Digite o <strong className="text-amber-400">mesmo email</strong> nos dois campos!
            </p>
            
            <Button
              onClick={() => setShowFirstAccessModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-lg"
            >
              ENTENDI, VOU TENTAR! ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
