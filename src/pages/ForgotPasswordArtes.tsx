import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPasswordArtes = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const getRecoveryErrorMessage = (data?: { success?: boolean; error?: string } | null, error?: { message?: string } | null) => {
    return data?.error || error?.message || t('errors.sendRecoveryEmailError');
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email: email.trim().toLowerCase(), redirect_url: `${window.location.origin}/reset-password-artes` }
      });

      if (error || (data && !data.success)) {
        toast.error(getRecoveryErrorMessage(data, error));
        return;
      }

      setEmailSent(true);
      toast.success(t('success.recoveryEmailSent'));
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error(error instanceof Error ? error.message : t('errors.sendRecoveryEmailError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 border-border/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t('emailSent.title')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('emailSent.checkInboxInstructions')}
            </p>
            <Button
              variant="outline"
              className="border-border text-[#2d4a5e]"
              onClick={() => navigate("/login-artes")}
            >
              {t('emailSent.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/80 border-border/30">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/login-artes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <CardTitle className="text-2xl text-foreground">{t('resetPassword')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('forgotPasswordCard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <Input
              type="email"
              placeholder={t('forgotPasswordCard.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card border-border/50 text-foreground"
              required
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/80 text-foreground"
              disabled={isLoading}
            >
              {isLoading ? t('sending') : t('sendRecoveryEmail')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordArtes;
