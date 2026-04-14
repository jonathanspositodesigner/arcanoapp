import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Music } from "lucide-react";

const ResetPasswordArtesMusicos = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "recovery") {
        console.log("[ResetPasswordMusicos] Verifying token_hash via verifyOtp...");
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          console.error("[ResetPasswordMusicos] verifyOtp error:", error);
          toast.error(t('errors.invalidResetLink'));
          navigate("/forgot-password-artes-musicos");
          return;
        }
        console.log("[ResetPasswordMusicos] Token verified successfully");
        setIsVerifying(false);
        return;
      }

      // Fallback: check hash errors or existing session
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get('error');
      if (hashError) {
        toast.error(hashParams.get('error_description') || t('errors.invalidResetLink'));
        navigate("/forgot-password-artes-musicos");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.invalidResetLink'));
        navigate("/forgot-password-artes-musicos");
        return;
      }
      setIsVerifying(false);
    };
    verifyToken();
  }, [navigate, t]);

  const handleResetPassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(t('errors.passwordChangeError'));
        return;
      }

      // Get current user and update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);
      }

      toast.success(t('success.passwordResetSuccess'));
      navigate("/login-artes-musicos");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(t('errors.passwordChangeError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-500/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="h-5 w-5 text-gray-400" />
          </div>
          <CardTitle className="text-2xl text-white">{t('createNewPassword')}</CardTitle>
          <CardDescription className="text-white/60">
            {t('createNewPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder={t('newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#0f0f1a] border-white/10 text-white pr-10"
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
                className="bg-[#0f0f1a] border-white/10 text-white pr-10"
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
              className="w-full bg-slate-600 hover:bg-slate-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? t('saving') : t('saveNewPassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordArtesMusicos;
