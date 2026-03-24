import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Sparkles, ArrowRight, MessageCircle, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "email" | "password" | "not_found";

const SucessoUpscalerArcano = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";

  const [showConfetti, setShowConfetti] = useState(true);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      toast.error("Digite seu email de compra");
      return;
    }

    setIsLoading(true);
    try {
      const { data: purchaseData, error: purchaseError } = await supabase.functions.invoke(
        "check-purchase-exists",
        { body: { email: trimmed, order_id: orderId } }
      );

      if (purchaseError) throw purchaseError;

      if (!purchaseData?.exists) {
        setStep("not_found");
        return;
      }

      const { data, error } = await supabase.rpc("check_profile_exists", {
        check_email: trimmed,
      });

      if (error) throw error;

      const exists = data?.[0]?.exists_in_db || false;
      const passwordChanged = data?.[0]?.password_changed || false;
      const hasLoggedIn = data?.[0]?.has_logged_in || false;

      if (exists && passwordChanged && hasLoggedIn) {
        toast.success("Conta encontrada! Redirecionando...");
        navigate("/");
        return;
      }

      setStep("password");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao verificar acesso. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setIsLoading(true);
    try {
      const trimmed = email.trim().toLowerCase();

      const { data, error } = await supabase.functions.invoke(
        "complete-purchase-onboarding",
        {
          body: { email: trimmed, password, order_id: orderId },
        }
      );

      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao criar acesso. Tente novamente.");
        return;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (loginError) {
        toast.error("Conta criada/atualizada, mas não foi possível entrar automaticamente.");
        return;
      }

      // Marcar password_changed=true SOMENTE após cadastro real de senha
      if (loginData?.user?.id) {
        await supabase.from("profiles").update({ password_changed: true }).eq("id", loginData.user.id);
      }

      toast.success("Acesso liberado! Bem-vindo!");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar acesso. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: [
                    "#10b981",
                    "#3b82f6",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                  ][Math.floor(Math.random() * 6)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          {step === "not_found" ? (
            <>
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-10 h-10 text-foreground" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Nenhuma compra encontrada</h1>
              <p className="text-muted-foreground mb-2">
                Não encontramos nenhuma compra associada ao email <span className="text-primary font-semibold">{email}</span>.
              </p>
              <p className="text-muted-foreground text-sm mb-6">Verifique se digitou o email correto.</p>

              <p className="text-sm font-medium text-foreground mb-3">Problemas com o pagamento?</p>
              <Button asChild className="w-full gap-2" size="lg">
                <a href="https://wa.me/+5533988819891" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  Falar com o suporte
                </a>
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setEmail("");
                }}
                className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                ← Tentar outro email
              </button>
            </>
          ) : (
            <>
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <CheckCircle className="w-10 h-10 text-primary-foreground" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
                <Sparkles
                  className="absolute -bottom-1 -left-2 w-5 h-5 text-primary animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                />
              </div>

              {step === "email" ? (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Seu pagamento está sendo processado</h1>
                  <p className="text-muted-foreground mb-6">
                    Se você já pagou, seu acesso foi liberado! Coloque seu <span className="text-primary font-semibold">email de compra</span> para acessar seu conteúdo.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <Input
                      type="email"
                      placeholder="Digite seu email de compra"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-center"
                      required
                    />
                    <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
                      {isLoading ? "Verificando..." : "Acessar meu conteúdo"}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Crie sua senha</h1>
                  <p className="text-muted-foreground mb-1">Defina uma senha para acessar sua conta com o email:</p>
                  <p className="text-primary font-semibold mb-6 text-sm">{email}</p>

                  <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Crie sua senha (mín. 6 caracteres)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirme sua senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
                      {isLoading ? "Criando acesso..." : "Criar acesso e entrar"}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      ← Voltar e trocar email
                    </button>
                  </form>
                </>
              )}

              <a
                href="https://wa.me/+5533988819891"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Problemas com seu pagamento? Fale conosco no WhatsApp
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SucessoUpscalerArcano;
