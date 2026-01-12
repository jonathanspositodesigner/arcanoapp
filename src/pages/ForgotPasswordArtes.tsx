import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const ForgotPasswordArtes = () => {
  const { t } = useTranslation('auth');
  const { isLatam } = useLocale();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `https://arcanolab.voxvisual.com.br/reset-password-artes`,
      });

      if (error) {
        toast.error(isLatam ? "Error al enviar email de recuperación" : "Erro ao enviar email de recuperação");
        return;
      }

      setEmailSent(true);
      toast.success(isLatam ? "¡Email de recuperación enviado!" : "Email de recuperação enviado!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error(isLatam ? "Error al enviar email" : "Erro ao enviar email");
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
            <h2 className="text-xl font-bold text-white mb-2">
              {isLatam ? '¡Email Enviado!' : 'Email Enviado!'}
            </h2>
            <p className="text-white/60 mb-6">
              {isLatam 
                ? 'Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.'
                : 'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.'
              }
            </p>
            <Button
              variant="outline"
              className="border-[#2d4a5e] text-[#2d4a5e]"
              onClick={() => navigate("/login-artes")}
            >
              {isLatam ? 'Volver al Login' : 'Voltar ao Login'}
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
            {isLatam ? 'Volver' : 'Voltar'}
          </Button>
          <CardTitle className="text-2xl text-white">{t('resetPassword')}</CardTitle>
          <CardDescription className="text-white/60">
            {isLatam 
              ? 'Ingresa tu email para recibir las instrucciones'
              : 'Informe seu email para receber as instruções'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <Input
              type="email"
              placeholder={isLatam ? "Tu email" : "Seu email"}
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
              {isLoading 
                ? (isLatam ? "Enviando..." : "Enviando...") 
                : (isLatam ? "Enviar Email de Recuperación" : "Enviar Email de Recuperação")
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordArtes;
