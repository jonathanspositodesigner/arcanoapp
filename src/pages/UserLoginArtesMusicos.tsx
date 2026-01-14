import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, AlertCircle, KeyRound, Mail, Lock, UserPlus, Music } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UserLoginArtesMusicos = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const { data: profileCheck, error: rpcError } = await supabase.rpc('check_profile_exists', { check_email: email.trim() });
        if (rpcError) { toast.error(t('errors.checkRegisterError')); setIsLoading(false); return; }
        const profileExists = profileCheck?.[0]?.exists_in_db || false;
        const passwordChanged = profileCheck?.[0]?.password_changed || false;
        if (profileExists && !passwordChanged) { toast.error(t('errors.firstAccessUseEmail')); setShowFirstAccessModal(true); }
        else if (!profileExists) { toast.info(t('errors.emailNotFoundSignup')); setShowSignupModal(true); }
        else { const newAttempts = failedAttempts + 1; setFailedAttempts(newAttempts); toast.error(t('errors.invalidCredentials')); if (newAttempts >= 2) { setShowFirstAccessModal(true); } }
        setIsLoading(false); return;
      }
      setFailedAttempts(0);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('password_changed').eq('id', data.user.id).maybeSingle();
        if (!profile || !profile.password_changed) {
          if (!profile) { await supabase.from('profiles').upsert({ id: data.user.id, email: data.user.email, password_changed: false }, { onConflict: 'id' }); }
          toast.success(t('errors.firstAccessSetPassword'));
          navigate("/change-password-artes-musicos"); return;
        }
        toast.success(t('success.loginSuccess'));
        navigate("/biblioteca-artes-musicos");
      }
    } catch (error) { toast.error(t('errors.loginError')); } finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail.trim()) { toast.error(t('errors.enterEmail')); return; }
    if (signupPassword.length < 6) { toast.error(t('errors.passwordMinLength')); return; }
    if (signupPassword !== signupConfirmPassword) { toast.error(t('errors.passwordsDoNotMatch')); return; }
    setIsSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: signupEmail.trim(), password: signupPassword, options: { emailRedirectTo: `${window.location.origin}/biblioteca-artes-musicos` } });
      if (error) { if (error.message.includes("already registered")) { toast.error(t('errors.emailAlreadyRegistered')); } else { toast.error(t('errors.signupError') + ": " + error.message); } return; }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email: signupEmail.trim().toLowerCase(), name: signupName.trim() || null, password_changed: true }, { onConflict: 'id' });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { const { error: loginError } = await supabase.auth.signInWithPassword({ email: signupEmail.trim(), password: signupPassword }); if (loginError) { toast.success(t('success.accountCreatedLogin')); setShowSignupModal(false); return; } }
        toast.success(t('success.accountCreatedSuccess'));
        setShowSignupModal(false);
        navigate("/biblioteca-artes-musicos");
      }
    } catch (error) { toast.error(t('errors.signupError')); } finally { setIsSigningUp(false); }
  };

  const displayEmail = email.trim() || "seuemail@exemplo.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-violet-500/50 p-0 overflow-hidden">
          <div className="bg-violet-500/20 p-6 text-center border-b border-violet-500/30">
            <div className="w-20 h-20 mx-auto bg-violet-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse"><KeyRound className="w-10 h-10 text-violet-400" /></div>
            <h2 className="text-2xl font-bold text-violet-400">{t('firstAccessModal.title')}</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-white/90 text-center text-lg">{t('firstAccessModal.explanationGreenn')}</p>
            <div className="bg-[#0f0f1a] rounded-xl p-5 border-2 border-violet-500/40 space-y-3">
              <div className="flex items-center gap-3 text-white"><div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center"><Mail className="w-5 h-5 text-violet-400" /></div><div><p className="text-xs text-white/60">{t('firstAccessModal.emailLabel')}</p><p className="font-mono text-violet-300 text-sm break-all">{displayEmail}</p></div></div>
              <div className="h-px bg-violet-500/30" />
              <div className="flex items-center gap-3 text-white"><div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center"><Lock className="w-5 h-5 text-violet-400" /></div><div><p className="text-xs text-white/60">{t('firstAccessModal.passwordLabel')}</p><p className="font-mono text-violet-300 text-sm break-all">{displayEmail}</p></div></div>
            </div>
            <p className="text-white/60 text-center text-sm">{t('firstAccessModal.sameEmailTip')}</p>
            <Button onClick={() => setShowFirstAccessModal(false)} className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-6 text-lg">{t('firstAccessModal.understood')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-emerald-500/50 p-0 overflow-hidden">
          <div className="bg-emerald-500/20 p-6 text-center border-b border-emerald-500/30">
            <div className="w-20 h-20 mx-auto bg-emerald-500/30 rounded-full flex items-center justify-center mb-4"><UserPlus className="w-10 h-10 text-emerald-400" /></div>
            <h2 className="text-2xl font-bold text-emerald-400">{t('signupModal.title')}</h2>
            <p className="text-white/70 text-sm mt-2">{t('signupModal.subtitleMusicos')}</p>
          </div>
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div><Label className="text-white/80">{t('email')}</Label><Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder={t('signupModal.emailPlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" required /></div>
            <div><Label className="text-white/80">{t('signupModal.nameOptional')}</Label><Input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder={t('signupModal.namePlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" /></div>
            <div className="relative"><Label className="text-white/80">{t('password')}</Label><Input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder={t('signupModal.minCharacters')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1 pr-10" required /><button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-[calc(50%+4px)] text-white/50 hover:text-white">{showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <div><Label className="text-white/80">{t('confirmPassword')}</Label><Input type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder={t('signupModal.confirmPasswordPlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" required /></div>
            <Alert className="bg-violet-500/10 border-violet-500/30"><AlertCircle className="h-4 w-4 text-violet-500" /><AlertDescription className="text-violet-200 text-xs">{t('signupModal.afterSignupWarningMusicos')}</AlertDescription></Alert>
            <Button type="submit" disabled={isSigningUp} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 text-lg">{isSigningUp ? t('creatingAccount') : t('signupModal.createMyAccount')}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowSignupModal(false)} className="w-full text-white/60 hover:text-white">{t('signupModal.backToLogin')}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-violet-500/30">
        <CardHeader className="text-center">
          <Button variant="ghost" className="absolute left-4 top-4 text-white/70 hover:text-white" onClick={() => navigate("/biblioteca-artes-musicos")}><ArrowLeft className="h-4 w-4 mr-2" />{t('back')}</Button>
          <div className="flex items-center justify-center gap-2 mb-2"><Music className="h-6 w-6 text-violet-400" /><CardTitle className="text-2xl text-white">{t('loginCard.titleMusicos')}</CardTitle></div>
          <CardDescription className="text-white/60">{t('loginCard.descriptionMusicos')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-violet-500/10 border-violet-500/30"><AlertCircle className="h-4 w-4 text-violet-500" /><AlertDescription className="text-violet-200 text-sm">{t('loginCard.firstAccessHint')}</AlertDescription></Alert>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0f0f1a] border-violet-500/30 text-white" required /></div>
            <div className="relative"><Input type={showPassword ? "text" : "password"} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0f0f1a] border-violet-500/30 text-white pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <div className="text-right"><button type="button" onClick={() => navigate("/forgot-password-artes-musicos")} className="text-sm text-violet-400 hover:text-violet-300 underline">{t('forgotPassword')}</button></div>
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={isLoading}>{isLoading ? t('signingIn') : t('signIn')}</Button>
            <div className="text-center pt-4 border-t border-violet-500/30">
              <p className="text-white/60 text-sm mb-2">{t('noAccountYet')}</p>
              <Button type="button" variant="outline" className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" onClick={() => setShowSignupModal(true)}><UserPlus className="h-4 w-4 mr-2" />{t('createAccountButton')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLoginArtesMusicos;