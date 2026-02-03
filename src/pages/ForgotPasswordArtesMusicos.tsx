import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, Music } from "lucide-react";

const ForgotPasswordArtesMusicos = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password-artes-musicos`,
      });
      if (error) { toast.error(t('errors.sendRecoveryEmailError')); return; }
      setEmailSent(true);
      toast.success(t('success.recoveryEmailSent'));
    } catch (error) { toast.error(t('errors.sendRecoveryEmailError')); } finally { setIsLoading(false); }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-violet-500/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4"><Mail className="h-8 w-8 text-green-400" /></div>
            <h2 className="text-xl font-bold text-white mb-2">{t('emailSent.title')}</h2>
            <p className="text-white/60 mb-6">{t('emailSent.checkInboxInstructionsMusicos')}</p>
            <Button variant="outline" className="border-violet-500 text-violet-400 hover:bg-violet-500/20" onClick={() => navigate("/login-artes-musicos")}>{t('emailSent.backToLogin')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-violet-500/30 relative">
        <CardHeader className="text-center">
          <Button variant="ghost" className="absolute left-4 top-4 text-white/70 hover:text-white" onClick={() => navigate("/login-artes-musicos")}><ArrowLeft className="h-4 w-4 mr-2" />{t('back')}</Button>
          <div className="flex items-center justify-center gap-2 mb-2 mt-4"><Music className="h-5 w-5 text-violet-400" /></div>
          <CardTitle className="text-2xl text-white">{t('forgotPasswordCard.title')}</CardTitle>
          <CardDescription className="text-white/60">{t('forgotPasswordCard.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <Input type="email" placeholder={t('forgotPasswordCard.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0f0f1a] border-violet-500/30 text-white" required />
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={isLoading}>{isLoading ? t('sending') : t('forgotPasswordCard.sendRecoveryEmail')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordArtesMusicos;