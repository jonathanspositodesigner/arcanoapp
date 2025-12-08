import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPasswordArtes = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password-artes`,
      });

      if (error) {
        toast.error("Erro ao enviar email de recuperação");
        return;
      }

      setEmailSent(true);
      toast.success("Email de recuperação enviado!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Erro ao enviar email");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email Enviado!</h2>
            <p className="text-white/60 mb-6">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <Button
              variant="outline"
              className="border-[#2d4a5e] text-[#2d4a5e]"
              onClick={() => navigate("/login-artes")}
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-white/70 hover:text-white"
            onClick={() => navigate("/login-artes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-2xl text-white">Recuperar Senha</CardTitle>
          <CardDescription className="text-white/60">
            Informe seu email para receber as instruções
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <Input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white"
              required
            />

            <Button
              type="submit"
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar Email de Recuperação"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordArtes;
