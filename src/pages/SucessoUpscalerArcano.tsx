import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Sparkles, ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SucessoUpscalerArcano = () => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [email, setEmail] = useState("");
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
      const { data, error } = await supabase.rpc("check_profile_exists", {
        check_email: trimmed,
      });

      if (error) throw error;

      const exists = data?.[0]?.exists_in_db || false;
      const passwordChanged = data?.[0]?.password_changed || false;

      if (!exists) {
        toast.info(
          "Seu pagamento ainda está sendo processado. Tente novamente em alguns minutos."
        );
      } else if (!passwordChanged) {
        // First access — auto-login with email as temp password then redirect
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password: trimmed,
        });
        if (!loginError) {
          toast.success("Bem-vindo! Defina sua senha.");
          navigate("/change-password");
        } else {
          toast.success("Conta encontrada! Faça login com sua senha.");
          navigate("/login");
        }
      } else {
        toast.success("Conta encontrada! Faça login para acessar.");
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao verificar email. Tente novamente.");
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
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
            <Sparkles
              className="absolute -bottom-1 -left-2 w-5 h-5 text-primary animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Seu pagamento está sendo processado
          </h1>
          <p className="text-muted-foreground mb-6">
            Se você já pagou, seu acesso foi liberado! Coloque seu{" "}
            <span className="text-primary font-semibold">email de compra</span>{" "}
            para acessar seu conteúdo.
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
            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Verificando..." : "Acessar meu conteúdo"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <a
            href="https://wa.me/33988819891"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Problemas com seu pagamento? Fale conosco no WhatsApp
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default SucessoUpscalerArcano;
