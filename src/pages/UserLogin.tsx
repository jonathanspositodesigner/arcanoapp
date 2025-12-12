import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Star, Info, KeyRound, Mail, Lock } from "lucide-react";
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
            .single();

          if (profile && !profile.password_changed) {
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
            Ainda não é premium?
          </p>
          <Button 
            onClick={() => navigate("/planos")} 
            variant="outline" 
            className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          >
            <Star className="h-4 w-4 mr-2" />
            Torne-se Premium
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UserLogin;
