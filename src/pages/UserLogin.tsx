import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Star, Info, KeyRound, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const UserLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  
  // Signup modal state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isPremium } = await supabase.rpc('is_premium');
        if (isPremium) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('password_changed')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile || !profile.password_changed) {
            navigate(`/change-password?redirect=${redirectTo}`);
          } else {
            navigate(redirectTo);
          }
        }
      }
    };
    checkPremiumStatus();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const { data: profileCheck, error: rpcError } = await supabase
          .rpc('check_profile_exists', { check_email: email.trim() });

        if (rpcError) {
          console.error('Erro ao verificar perfil:', rpcError);
          toast.error(t('errors.checkRegisterError'));
          setIsLoading(false);
          return;
        }

        const profileExists = profileCheck?.[0]?.exists_in_db || false;
        const passwordChanged = profileCheck?.[0]?.password_changed || false;

        if (profileExists && !passwordChanged) {
          toast.error(t('errors.firstAccessUseEmail'));
          setShowFirstAccessModal(true);
        } else if (!profileExists) {
          toast.info(t('errors.emailNotFoundSignup'));
          setShowSignupModal(true);
        } else {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          toast.error(t('errors.invalidCredentials'));
          
          if (newAttempts >= 2) {
            setShowFirstAccessModal(true);
          }
        }
        
        setIsLoading(false);
        return;
      }

      const { data: isPremium, error: premiumError } = await supabase.rpc('is_premium');

      if (premiumError || !isPremium) {
        await supabase.auth.signOut();
        toast.error(t('errors.accessDenied'));
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('password_changed')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            password_changed: false,
          }, { onConflict: 'id' });
        
        toast.success(t('errors.firstAccessSetPassword'));
        navigate(`/change-password?redirect=${redirectTo}`);
        return;
      }

      if (!profile.password_changed) {
        toast.success(t('errors.firstAccessSetPassword'));
        navigate(`/change-password?redirect=${redirectTo}`);
        return;
      }

      toast.success(t('success.loginSuccess'));
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message || t('errors.loginError'));
    } finally {
      setIsLoading(false);
    }
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
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`
        }
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
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: signupEmail.trim().toLowerCase(),
          name: signupName.trim() || null,
          password_changed: true,
        }, { onConflict: 'id' });
        
        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
        
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
      console.error("Signup error:", error);
      toast.error(t('errors.signupError'));
    } finally {
      setIsSigningUp(false);
    }
  };

  const displayEmail = email.trim() || "seuemail@exemplo.com";

  return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center p-4">
      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-md bg-[#1A0A2E] border-purple-500/20 p-0 overflow-hidden">
          <div className="bg-purple-500/20 p-6 text-center border-b border-purple-500/30">
            <div className="w-20 h-20 mx-auto bg-purple-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <KeyRound className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-purple-400">
              {t('firstAccessModal.title')}
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-purple-200 text-center text-lg">
              {t('firstAccessModal.explanation')}
            </p>
            
            <div className="bg-[#0D0221] rounded-xl p-5 border-2 border-purple-500/40 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-400">{t('firstAccessModal.emailLabel')}</p>
                  <p className="font-mono text-purple-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
              
              <div className="h-px bg-purple-500/30" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-400">{t('firstAccessModal.passwordLabel')}</p>
                  <p className="font-mono text-purple-300 text-sm break-all">{displayEmail}</p>
                </div>
              </div>
            </div>
            
            <p className="text-purple-400 text-center text-sm">
              {t('firstAccessModal.sameEmailTip')}
            </p>
            
            <Button
              onClick={() => setShowFirstAccessModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-lg"
            >
              {t('firstAccessModal.understood')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="max-w-md bg-[#1A0A2E] border-purple-500/20 p-0 overflow-hidden">
          <div className="bg-green-500/20 p-6 text-center border-b border-green-500/30">
            <div className="w-20 h-20 mx-auto bg-green-500/30 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-400">
              {t('signupModal.title')}
            </h2>
            <p className="text-purple-300 text-sm mt-2">
              {t('signupModal.subtitle')}
            </p>
          </div>
          
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div>
              <Label className="text-purple-200">{t('email')}</Label>
              <Input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder={t('signupModal.emailPlaceholder')}
                className="mt-1 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                required
              />
            </div>
            
            <div>
              <Label className="text-purple-200">{t('signupModal.nameOptional')}</Label>
              <Input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder={t('signupModal.namePlaceholder')}
                className="mt-1 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              />
            </div>
            
            <div className="relative">
              <Label className="text-purple-200">{t('password')}</Label>
              <Input
                type={showSignupPassword ? "text" : "password"}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder={t('signupModal.minCharacters')}
                className="mt-1 pr-10 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="absolute right-3 top-[calc(50%+4px)] text-purple-400 hover:text-white"
              >
                {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div>
              <Label className="text-purple-200">{t('confirmPassword')}</Label>
              <Input
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                placeholder={t('signupModal.confirmPasswordPlaceholder')}
                className="mt-1 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
                required
              />
            </div>
            
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-400 text-xs">
                {t('signupModal.afterSignupWarning')}
              </AlertDescription>
            </Alert>
            
            <Button
              type="submit"
              disabled={isSigningUp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
            >
              {isSigningUp ? t('creatingAccount') : t('signupModal.createMyAccount')}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowSignupModal(false)}
              className="w-full text-purple-400 hover:text-white hover:bg-purple-500/20"
            >
              {t('signupModal.backToLogin')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md p-8 bg-[#1A0A2E] border-purple-500/20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-8 w-8 text-yellow-500" fill="currentColor" />
            <h1 className="text-3xl font-bold text-white">
              {t('premiumArea')}
            </h1>
          </div>
          <p className="text-purple-300">
            {t('premiumAreaDescription')}
          </p>
        </div>

        {/* First access notice */}
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm text-yellow-400">
            <strong>{t('firstAccess.title')}?</strong> {t('loginCard.firstAccessHint')}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-purple-200">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              className="mt-2 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-purple-200">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 bg-[#0D0221] border-purple-500/30 text-white placeholder:text-purple-400"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
          >
            {isLoading ? t('signingIn') : t('login')}
          </Button>

          <div className="text-center">
            <Link 
              to="/forgot-password" 
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              {t('forgotPassword')}
            </Link>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-purple-500/20 text-center">
          <p className="text-sm text-purple-400 mb-4">
            {t('noAccount')}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
              onClick={() => setShowSignupModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('createAccount')}
            </Button>
            <Button 
              onClick={() => navigate("/planos")} 
              variant="outline" 
              className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Star className="h-4 w-4 mr-2" />
              {t('becomePremium')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserLogin;
