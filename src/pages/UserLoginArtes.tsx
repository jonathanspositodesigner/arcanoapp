import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, AlertCircle, KeyRound, Mail, Lock, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UserLoginArtes = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  
  // Signup modal state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
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
        // Check if this email exists in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (profile && profile.password_changed === false) {
          // First-time user with wrong password - show modal immediately
          toast.error("Este é seu primeiro acesso! Use seu email como senha.");
          setShowFirstAccessModal(true);
        } else if (!profile) {
          // Email doesn't exist - offer signup
          toast.info("Email não encontrado. Deseja criar uma conta?");
          setShowSignupModal(true);
        } else {
          // Regular wrong password
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

        // Se profile não existe OU password_changed = false, forçar mudança de senha
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail.trim()) {
      toast.error("Digite seu email");
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setIsSigningUp(true);
    
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/biblioteca-artes`
        }
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado. Tente fazer login.");
        } else {
          toast.error("Erro ao criar conta: " + error.message);
        }
        return;
      }
      
      if (data.user) {
        // Create profile with password_changed = true (user chose their own password)
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: signupEmail.trim().toLowerCase(),
          name: signupName.trim() || null,
          password_changed: true,
        }, { onConflict: 'id' });
        
        toast.success("Conta criada com sucesso! Você está logado.");
        setShowSignupModal(false);
        navigate("/biblioteca-artes");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Erro ao criar conta");
    } finally {
      setIsSigningUp(false);
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

      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-emerald-500/50 p-0 overflow-hidden">
          <div className="bg-emerald-500/20 p-6 text-center border-b border-emerald-500/30">
            <div className="w-20 h-20 mx-auto bg-emerald-500/30 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">
              Criar Conta
            </h2>
            <p className="text-white/70 text-sm mt-2">
              Cadastre-se para explorar a biblioteca
            </p>
          </div>
          
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div>
              <Label className="text-white/80">Email</Label>
              <Input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white mt-1"
                required
              />
            </div>
            
            <div>
              <Label className="text-white/80">Nome (opcional)</Label>
              <Input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Seu nome"
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white mt-1"
              />
            </div>
            
            <div className="relative">
              <Label className="text-white/80">Senha</Label>
              <Input
                type={showSignupPassword ? "text" : "password"}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white mt-1 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="absolute right-3 top-[calc(50%+4px)] text-white/50 hover:text-white"
              >
                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div>
              <Label className="text-white/80">Confirmar Senha</Label>
              <Input
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white mt-1"
                required
              />
            </div>
            
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-200 text-xs">
                Após o cadastro, você poderá explorar a biblioteca, mas precisará comprar um pack para ter acesso ao conteúdo premium.
              </AlertDescription>
            </Alert>
            
            <Button
              type="submit"
              disabled={isSigningUp}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 text-lg"
            >
              {isSigningUp ? "Criando conta..." : "Criar minha conta"}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowSignupModal(false)}
              className="w-full text-white/60 hover:text-white"
            >
              Voltar ao login
            </Button>
          </form>
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
              <p className="text-white/60 text-sm mb-2">Ainda não tem conta?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                onClick={() => setShowSignupModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Conta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLoginArtes;
