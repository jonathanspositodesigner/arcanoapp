import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
// Inline resend function via SendPulse edge function
const resendPasswordLink = async (
  email: string,
  changePasswordRoute: string,
  redirectAfterPassword: string = '/'
): Promise<{ success: boolean; error?: string }> => {
  const redirectUrl = `${window.location.origin}${changePasswordRoute}?redirect=${encodeURIComponent(redirectAfterPassword)}`;
  const { data, error } = await supabase.functions.invoke('send-recovery-email', {
    body: { email: email.trim().toLowerCase(), redirect_url: redirectUrl }
  });
  if (error || (data && !data.success)) return { success: false, error: 'Erro ao reenviar link' };
  return { success: true };
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const sentParam = searchParams.get('sent');
  const emailParam = searchParams.get('email');
  const { t } = useTranslation('auth');
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  
  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setHasSession(true);
      } else if (!sentParam || !emailParam) {
        // No session and no sent param - redirect to login
        toast.info(t('errors.needLogin') || 'Você precisa estar logado para alterar a senha.');
        navigate(`/login?redirect=${encodeURIComponent('/change-password?redirect=' + redirectTo)}`);
        return;
      }
      
      setIsCheckingSession(false);
    };
    
    checkSession();
  }, [navigate, redirectTo, t, sentParam, emailParam]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendLink = async () => {
    if (!emailParam || resendCooldown > 0) return;
    
    setIsResending(true);
    const result = await resendPasswordLink(emailParam, '/change-password', redirectTo);
    setIsResending(false);
    
    if (result.success) {
      toast.success('Link reenviado! Verifique seu email.');
      setResendCooldown(60);
    } else {
      toast.error(result.error || 'Erro ao reenviar link');
    }
  };

  const handleRefreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setHasSession(true);
      toast.success('Sessão detectada! Você pode criar sua senha agora.');
    } else {
      toast.info('Ainda não detectamos sua sessão. Clique no link do email.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('errors.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Mark password as changed in profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);
      }

      toast.success(t('success.passwordChanged'));
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message || t('errors.passwordChangeError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Show "waiting for link" state when sent=1 and no session
  if (sentParam === '1' && emailParam && !hasSession) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-[#1A0A2E] border-purple-500/20">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="h-8 w-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">
                Primeiro Acesso
              </h1>
            </div>
            <p className="text-purple-300 mb-4">
              Enviamos um link para criar sua senha para:
            </p>
            <p className="text-white font-medium bg-purple-500/20 py-2 px-4 rounded-lg inline-block mb-4">
              {emailParam}
            </p>
            <p className="text-purple-300/70 text-sm">
              Clique no link do email para voltar aqui e cadastrar sua senha.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRefreshSession}
              variant="outline"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Já cliquei no link
            </Button>
            
            <Button
              onClick={handleResendLink}
              disabled={resendCooldown > 0 || isResending}
              variant="ghost"
              className="w-full text-purple-400 hover:text-purple-300"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {resendCooldown > 0 
                ? `Reenviar em ${resendCooldown}s` 
                : 'Reenviar link'}
            </Button>
            
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="w-full text-purple-400/70 hover:text-purple-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Usar outro email
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show password form when session exists
  return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-[#1A0A2E] border-purple-500/20">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="h-8 w-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">
              {t('createNewPassword')}
            </h1>
          </div>
          <p className="text-purple-300">
            {t('createNewPasswordDescription')}
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <Label htmlFor="newPassword" className="text-purple-200">{t('newPassword')}</Label>
            <div className="relative mt-2">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-purple-200">{t('confirmNewPassword')}</Label>
            <div className="relative mt-2">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
          >
            {isLoading ? t('saving') : t('saveNewPassword')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
