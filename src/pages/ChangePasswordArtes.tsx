import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
import { resendPasswordLink } from "@/lib/firstAccess";

const ChangePasswordArtes = () => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const sentParam = searchParams.get('sent');
  const emailParam = searchParams.get('email');
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setHasSession(true);
      } else if (!sentParam || !emailParam) {
        // No session and no sent param - redirect to login
        toast.error(t('errors.needLoginFirst'));
        const redirectParam = searchParams.get('redirect');
        navigate(redirectParam ? `/login-artes?redirect=${redirectParam}` : '/login-artes');
        return;
      }
      
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [navigate, t, searchParams, sentParam, emailParam]);

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
    const result = await resendPasswordLink(emailParam, '/change-password-artes', redirectTo);
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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  // Show "waiting for link" state when sent=1 and no session
  if (sentParam === '1' && emailParam && !hasSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#2d4a5e] rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Primeiro Acesso</CardTitle>
            <CardDescription className="text-white/60">
              Enviamos um link para criar sua senha para:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white font-medium bg-[#2d4a5e]/30 py-2 px-4 rounded-lg text-center">
              {emailParam}
            </p>
            <p className="text-white/50 text-sm text-center">
              Clique no link do email para voltar aqui e cadastrar sua senha.
            </p>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleRefreshSession}
                variant="outline"
                className="w-full border-[#2d4a5e]/50 text-white hover:bg-[#2d4a5e]/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Já cliquei no link
              </Button>
              
              <Button
                onClick={handleResendLink}
                disabled={resendCooldown > 0 || isResending}
                variant="ghost"
                className="w-full text-white/60 hover:text-white"
              >
                {isResending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {resendCooldown > 0 
                  ? `Reenviar em ${resendCooldown}s` 
                  : 'Reenviar link'}
              </Button>
              
              <Button
                onClick={() => navigate('/login-artes')}
                variant="ghost"
                className="w-full text-white/40 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Usar outro email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('errors.sessionExpired'));
        navigate("/login-artes");
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast.error(t('errors.passwordChangeError'));
        return;
      }

      // Mark password as changed in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      toast.success(t('success.passwordChanged'));
      navigate(redirectTo);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t('errors.passwordChangeError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-[#2d4a5e]/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#2d4a5e] rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">{t('changePassword')}</CardTitle>
          <CardDescription className="text-white/60">
            {t('changePasswordDescription') || 'Por segurança, crie uma nova senha para sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder={t('newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t('confirmNewPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#0f0f1a] border-[#2d4a5e]/50 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-white/50 text-sm">
              {t('passwordHint')}
            </p>

            <Button
              type="submit"
              className="w-full bg-[#2d4a5e] hover:bg-[#3d5a6e] text-white"
              disabled={isLoading}
            >
              {isLoading ? t('changing') : t('changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePasswordArtes;
