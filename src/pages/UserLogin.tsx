import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Star, Info, KeyRound, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const UserLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  
  // Signup modal state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isPremium } = await supabase.rpc('is_premium');
        if (isPremium) {
          // Check if password has been changed
          const { data: profile } = await supabase
            .from('profiles')
            .select('password_changed')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile || !profile.password_changed) {
            navigate('/change-password');
          } else {
            navigate('/biblioteca-prompts');
          }
        }
      }
    };
    checkPremiumStatus();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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

      // Check if user is premium and active using secure RPC function
      const { data: isPremium, error: premiumError } = await supabase.rpc('is_premium');

      if (premiumError || !isPremium) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Sua assinatura premium não está ativa.");
        return;
      }

      // Check if this is first login (password equals email)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('password_changed')
        .eq('id', data.user.id)
        .single();

      // If profile doesn't exist or password not changed, force password change
      if (profileError || !profile) {
        // Create profile if it doesn't exist
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            password_changed: false,
          }, { onConflict: 'id' });
        
        toast.success("Primeiro acesso! Por favor, crie uma nova senha.");
        navigate('/change-password');
        return;
      }

      if (!profile.password_changed) {
        toast.success("Primeiro acesso! Por favor, crie uma nova senha.");
        navigate('/change-password');
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate('/biblioteca-prompts');
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        email: email.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/biblioteca-prompts`
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
          email: email.trim().toLowerCase(),
          name: signupName.trim() || null,
          password_changed: true,
        }, { onConflict: 'id' });
        
        toast.success("Conta criada com sucesso! Você está logado.");
        setShowSignupModal(false);
        navigate("/biblioteca-prompts");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1a1a2e] dark:to-[#0f0f1a] border-2 border-amber-500/50 p-0 overflow-hidden">
          <div className="bg-amber-500/20 p-6 text-center border-b border-amber-500/30">
            <div className="w-20 h-20 mx-auto bg-amber-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <KeyRound className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              🔑 É o seu PRIMEIRO ACESSO?
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-foreground/90 text-center text-lg">
              No primeiro acesso, seu <strong className="text-amber-600 dark:text-amber-400">login e senha</strong> são o <strong className="text-amber-600 dark:text-amber-400">MESMO EMAIL</strong> que você usou na compra!
            </p>
            
            <div className="bg-background rounded-xl p-5 border-2 border-amber-500/40 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email:</p>
                  <p className="font-mono text-amber-600 dark:text-amber-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
              
              <div className="h-px bg-amber-500/30" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Senha:</p>
                  <p className="font-mono text-amber-600 dark:text-amber-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-center text-sm">
              Digite o <strong className="text-amber-600 dark:text-amber-400">mesmo email</strong> nos dois campos!
            </p>
            
            <Button
              onClick={() => setShowFirstAccessModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 text-lg"
            >
              ENTENDI, VOU TENTAR! ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-[#1a1a2e] dark:to-[#0f0f1a] border-2 border-emerald-500/50 p-0 overflow-hidden">
          <div className="bg-emerald-500/20 p-6 text-center border-b border-emerald-500/30">
            <div className="w-20 h-20 mx-auto bg-emerald-500/30 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Criar Conta
            </h2>
            <p className="text-foreground/70 text-sm mt-2">
              Cadastre-se para explorar a biblioteca
            </p>
          </div>
          
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div>
              <Label className="text-foreground/80">Email</Label>
              <Input
                type="email"
                value={email}
                disabled
                className="bg-muted border-emerald-500/30 text-muted-foreground mt-1"
              />
            </div>
            
            <div>
              <Label className="text-foreground/80">Nome (opcional)</Label>
              <Input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>
            
            <div className="relative">
              <Label className="text-foreground/80">Senha</Label>
              <Input
                type={showSignupPassword ? "text" : "password"}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="absolute right-3 top-[calc(50%+4px)] text-muted-foreground hover:text-foreground"
              >
                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div>
              <Label className="text-foreground/80">Confirmar Senha</Label>
              <Input
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="mt-1"
                required
              />
            </div>
            
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 dark:text-amber-200 text-xs">
                Após o cadastro, você poderá explorar a biblioteca, mas precisará de uma assinatura premium para ter acesso ao conteúdo exclusivo.
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
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Voltar ao login
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md p-8 shadow-hover">
        <Button
          variant="ghost"
          onClick={() => navigate("/biblioteca-prompts")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-8 w-8 text-yellow-500" fill="currentColor" />
            <h1 className="text-3xl font-bold text-foreground">
              Área Premium
            </h1>
          </div>
          <p className="text-muted-foreground">
            Entre com suas credenciais para acessar conteúdos exclusivos
          </p>
        </div>

        {/* First access notice */}
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm text-yellow-600 dark:text-yellow-400">
            <strong>Primeiro acesso?</strong> Sua senha inicial é o seu email.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>

          <div className="text-center">
            <Link 
              to="/forgot-password" 
              className="text-sm text-primary hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Ainda não tem conta?
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => {
                if (!email.trim()) {
                  toast.error("Digite seu email primeiro");
                  return;
                }
                setShowSignupModal(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Conta
            </Button>
            <Button 
              onClick={() => navigate("/planos")} 
              variant="outline" 
              className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            >
              <Star className="h-4 w-4 mr-2" />
              Torne-se Premium
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserLogin;
