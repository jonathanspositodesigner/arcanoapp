import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, AlertCircle, Mail, Lock, UserPlus, Music } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UserLoginArtesMusicos = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  
  // Two-step login state
  const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Signup modal state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Step 1: Check email
  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(t('errors.enterEmail'));
      return;
    }
    
    setIsCheckingEmail(true);
    
    try {
      const { data: profileCheck, error } = await supabase
        .rpc('check_profile_exists', { check_email: email.trim() });
      
      if (error) throw error;
      
      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      const passwordChanged = profileCheck?.[0]?.password_changed || false;
      
      if (!profileExists) {
        toast.info(t('errors.emailNotFoundSignup'));
        setSignupEmail(email.trim());
        setShowSignupModal(true);
        return;
      }
      
      if (profileExists && !passwordChanged) {
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: email.trim()
        });
        
        if (!autoLoginError) {
          toast.success(t('errors.firstAccessSetPassword'));
          navigate(`/change-password-artes-musicos?redirect=${redirectTo}`);
        } else {
          // Enviar link para criar senha (NÃO forgot-password)
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/change-password-artes-musicos?redirect=${encodeURIComponent(redirectTo)}` }
          );
          
          if (!resetError) {
            toast.success(t('success.passwordLinkSent') || 'Enviamos um link para criar sua senha. Verifique seu email.');
          } else {
            toast.error(t('errors.errorSendingLink') || 'Erro ao enviar link. Tente novamente.');
          }
        }
        return;
      }
      
      setVerifiedEmail(email.trim());
      setLoginStep('password');
      
    } catch (error) {
      console.error('Error checking email:', error);
      toast.error(t('errors.checkRegisterError'));
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Step 2: Login with password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: verifiedEmail,
        password,
      });
      
      if (error) {
        toast.error(t('errors.invalidCredentials'));
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile || !profile.password_changed) {
          if (!profile) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email,
              password_changed: false,
            }, { onConflict: 'id' });
          }
          toast.success(t('errors.firstAccessSetPassword'));
          navigate(`/change-password-artes-musicos?redirect=${redirectTo}`);
          return;
        }

        toast.success(t('success.loginSuccess'));
        navigate(redirectTo);
      }
    } catch (error) {
      toast.error(t('errors.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setLoginStep('email');
    setPassword('');
    setVerifiedEmail('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail.trim()) {
      toast.error(t('errors.enterEmail'));
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      toast.error(t('errors.passwordsDoNotMatch'));
      return;
    }
    
    setIsSigningUp(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` }
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t('errors.emailAlreadyRegistered'));
        } else {
          toast.error(t('errors.signupError') + ": " + error.message);
        }
        return;
      }
      
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: signupEmail.trim().toLowerCase(),
          name: signupName.trim() || null,
          password_changed: true,
        }, { onConflict: 'id' });
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: signupEmail.trim(),
            password: signupPassword,
          });
          if (loginError) {
            toast.success(t('success.accountCreatedLogin'));
            setShowSignupModal(false);
            return;
          }
        }
        
        toast.success(t('success.accountCreatedSuccess'));
        setShowSignupModal(false);
        navigate(redirectTo);
      }
    } catch (error) {
      toast.error(t('errors.signupError'));
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#0f0f1a] flex items-center justify-center p-4">
      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-emerald-500/50 p-0 overflow-hidden">
          <div className="bg-emerald-500/20 p-6 text-center border-b border-emerald-500/30">
            <div className="w-20 h-20 mx-auto bg-emerald-500/30 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">{t('signupModal.title')}</h2>
            <p className="text-white/70 text-sm mt-2">{t('signupModal.subtitleMusicos')}</p>
          </div>
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div>
              <Label className="text-white/80">{t('email')}</Label>
              <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder={t('signupModal.emailPlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" required />
            </div>
            <div>
              <Label className="text-white/80">{t('signupModal.nameOptional')}</Label>
              <Input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder={t('signupModal.namePlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" />
            </div>
            <div className="relative">
              <Label className="text-white/80">{t('password')}</Label>
              <Input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder={t('signupModal.minCharacters')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1 pr-10" required />
              <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-[calc(50%+4px)] text-white/50 hover:text-white">
                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div>
              <Label className="text-white/80">{t('confirmPassword')}</Label>
              <Input type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder={t('signupModal.confirmPasswordPlaceholder')} className="bg-[#0f0f1a] border-violet-500/30 text-white mt-1" required />
            </div>
            <Alert className="bg-violet-500/10 border-violet-500/30">
              <AlertCircle className="h-4 w-4 text-violet-500" />
              <AlertDescription className="text-violet-200 text-xs">{t('signupModal.afterSignupWarningMusicos')}</AlertDescription>
            </Alert>
            <Button type="submit" disabled={isSigningUp} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 text-lg">
              {isSigningUp ? t('creatingAccount') : t('signupModal.createMyAccount')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowSignupModal(false)} className="w-full text-white/60 hover:text-white">
              {t('signupModal.backToLogin')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md bg-[#1a1a2e]/80 border-violet-500/30">
        <CardHeader className="text-center">
          <Button variant="ghost" className="absolute left-4 top-4 text-white/70 hover:text-white" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />{t('back')}
          </Button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="h-6 w-6 text-violet-400" />
            <CardTitle className="text-2xl text-white">{t('loginCard.titleMusicos')}</CardTitle>
          </div>
          <CardDescription className="text-white/60">{t('loginCard.descriptionMusicos')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Email */}
          {loginStep === 'email' && (
            <form onSubmit={handleEmailCheck} className="space-y-4">
              <div>
                <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0f0f1a] border-violet-500/30 text-white" required autoFocus />
              </div>

              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={isCheckingEmail}>
                {isCheckingEmail ? t('checking') : t('continue')}
              </Button>

              <div className="text-center pt-4 border-t border-violet-500/30">
                <p className="text-white/60 text-sm mb-2">{t('noAccountYet')}</p>
                <Button type="button" variant="outline" className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" onClick={() => setShowSignupModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />{t('createAccountButton')}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Password */}
          {loginStep === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {/* Email indicator */}
              <div className="flex items-center justify-between p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-white/80">{verifiedEmail}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleChangeEmail} className="text-violet-400 hover:text-violet-300 text-xs h-auto py-1 px-2">
                  {t('changeEmail')}
                </Button>
              </div>

              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0f0f1a] border-violet-500/30 text-white pr-10" required autoFocus />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="text-right">
                <Link to={`/forgot-password-artes-musicos?email=${encodeURIComponent(verifiedEmail)}`} className="text-sm text-violet-400 hover:text-violet-300 underline">
                  {t('forgotPassword')}
                </Link>
              </div>

              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={isLoading}>
                {isLoading ? t('signingIn') : t('signIn')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLoginArtesMusicos;
