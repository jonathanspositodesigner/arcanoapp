import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { isDisposableEmail } from "@/utils/disposableEmailDomains";

export type AuthStep = 'email' | 'password' | 'signup' | 'waiting-link';

export interface AuthState {
  step: AuthStep;
  email: string;
  verifiedEmail: string;
  isLoading: boolean;
  error: string | null;
}

export interface SignupData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface AuthConfig {
  // Route configuration
  changePasswordRoute: string;
  loginRoute: string;
  forgotPasswordRoute: string;
  defaultRedirect: string;
  
  // Callbacks
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
  onNeedPasswordChange?: () => void;
  onClose?: () => void;
  
  // Post-login validation (for partner/admin logins)
  postLoginValidation?: (user: User) => Promise<{ valid: boolean; error?: string }>;
  
  // Translation function (optional)
  t?: (key: string) => string;
}

export interface UseUnifiedAuthReturn {
  state: AuthState;
  
  // Actions
  checkEmail: (email?: string) => Promise<void>;
  loginWithPassword: (password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  resendLink: () => Promise<void>;
  
  // Navigation
  changeEmail: () => void;
  goToSignup: () => void;
  goToLogin: () => void;
  
  // Helpers
  setEmail: (email: string) => void;
  getForgotPasswordUrl: () => string;
}

const defaultT = (key: string) => {
  const messages: Record<string, string> = {
    'errors.enterEmail': 'Digite seu email',
    'errors.emailNotFoundSignup': 'Email não encontrado. Crie uma conta.',
    'errors.firstAccessSetPassword': 'Primeiro acesso! Cadastre sua senha.',
    'errors.errorSendingLink': 'Erro ao enviar link. Tente novamente.',
    'errors.passwordMinLength': 'Senha deve ter pelo menos 6 caracteres',
    'errors.invalidCredentials': 'Email ou senha incorretos',
    'errors.checkRegisterError': 'Erro ao verificar cadastro',
    'errors.loginError': 'Erro ao fazer login',
    'errors.passwordsDoNotMatch': 'As senhas não conferem',
    'errors.emailAlreadyRegistered': 'Este email já está cadastrado',
    'errors.signupError': 'Erro ao criar conta',
    'success.loginSuccess': 'Login realizado com sucesso!',
    'success.accountCreatedSuccess': 'Conta criada com sucesso!',
    'success.linkSent': 'Link enviado para seu email!',
  };
  return messages[key] || key;
};

export function useUnifiedAuth(config: AuthConfig): UseUnifiedAuthReturn {
  const navigate = useNavigate();
  const t = config.t || defaultT;
  
  const [state, setState] = useState<AuthState>({
    step: 'email',
    email: '',
    verifiedEmail: '',
    isLoading: false,
    error: null,
  });

  const setEmail = useCallback((email: string) => {
    setState(prev => ({ ...prev, email }));
  }, []);

  const changeEmail = useCallback(() => {
    setState({
      step: 'email',
      email: state.email,
      verifiedEmail: '',
      isLoading: false,
      error: null,
    });
  }, [state.email]);

  const goToSignup = useCallback(() => {
    setState(prev => ({ ...prev, step: 'signup' }));
  }, []);

  const goToLogin = useCallback(() => {
    setState(prev => ({ ...prev, step: 'email' }));
  }, []);

  const getForgotPasswordUrl = useCallback(() => {
    const email = state.verifiedEmail || state.email;
    return `${config.forgotPasswordRoute}?email=${encodeURIComponent(email)}`;
  }, [state.verifiedEmail, state.email, config.forgotPasswordRoute]);

  /**
   * STEP 1: Check email
   * - Not found → go to signup
   * - Found + no password → auto-login or send link
   * - Found + has password → go to password step
   */
  const checkEmail = useCallback(async (emailParam?: string) => {
    const emailToCheck = emailParam || state.email;
    
    if (!emailToCheck.trim()) {
      toast.error(t('errors.enterEmail'));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const normalizedEmail = emailToCheck.trim().toLowerCase();
    
    console.log('[UnifiedAuth] Checking email:', normalizedEmail);
    
    try {
      const { data: profileCheck, error } = await supabase
        .rpc('check_profile_exists', { check_email: normalizedEmail });
      
      if (error) {
        console.error('[UnifiedAuth] RPC error:', error);
        throw error;
      }
      
      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      const passwordChanged = profileCheck?.[0]?.password_changed || false;
      
      console.log('[UnifiedAuth] Profile check:', { profileExists, passwordChanged });
      
      // Case 1: Email not found → go to signup
      if (!profileExists) {
        console.log('[UnifiedAuth] Email not found, going to signup');
        toast.info(t('errors.emailNotFoundSignup'));
        setState(prev => ({
          ...prev,
          step: 'signup',
          email: normalizedEmail,
          isLoading: false,
        }));
        return;
      }
      
      // Case 2: First access (no password set) → try auto-login or send link
      if (profileExists && !passwordChanged) {
        console.log('[UnifiedAuth] First access flow');
        
        // Try auto-login with email as password
        const { error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedEmail,
        });
        
        if (!autoLoginError) {
          console.log('[UnifiedAuth] Auto-login successful');
          toast.success(t('errors.firstAccessSetPassword'));
          config.onNeedPasswordChange?.();
          navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Auto-login failed → send password creation link via SendPulse
        console.log('[UnifiedAuth] Auto-login failed, sending link via send-recovery-email');
        const redirectUrl = `${window.location.origin}${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`;
        
        const { data: recoveryData, error: recoveryError } = await supabase.functions.invoke('send-recovery-email', {
          body: { email: normalizedEmail, redirect_url: redirectUrl }
        });
        
        if (recoveryError || (recoveryData && !recoveryData.success)) {
          console.error('[UnifiedAuth] Recovery email error:', recoveryError || recoveryData?.error);
          toast.info('Problema ao enviar link. Tente com sua senha.');
          // Go to password step instead of blocking user
          setState(prev => ({
            ...prev,
            step: 'password',
            verifiedEmail: normalizedEmail,
            isLoading: false,
          }));
          return;
        }
        
        // Navigate to change-password with waiting state
        const waitingUrl = `${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}&sent=1&email=${encodeURIComponent(normalizedEmail)}`;
        navigate(waitingUrl);
        config.onClose?.();
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Case 3: Email exists and has password → go to password step
      console.log('[UnifiedAuth] Going to password step');
      setState(prev => ({
        ...prev,
        step: 'password',
        verifiedEmail: normalizedEmail,
        isLoading: false,
      }));
      
    } catch (error) {
      console.error('[UnifiedAuth] Check email error:', error);
      toast.error(t('errors.checkRegisterError'));
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.email, navigate, config, t]);

  /**
   * STEP 2: Login with password
   */
  const loginWithPassword = useCallback(async (password: string) => {
    if (!password) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: state.verifiedEmail,
        password,
      });
      
       if (error) {
         console.error('[UnifiedAuth] Login error:', error);
         const msg = (error.message || '').toLowerCase();
         if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
           toast.error('Confirme seu email antes de entrar.');
         } else {
           toast.error(t('errors.invalidCredentials'));
         }
         setState(prev => ({ ...prev, isLoading: false }));
         return;
       }
      
      if (!data.user) {
        toast.error(t('errors.loginError'));
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Run post-login validation if provided (for partner/admin logins)
      if (config.postLoginValidation) {
        const validation = await config.postLoginValidation(data.user);
        if (!validation.valid) {
          await supabase.auth.signOut();
          toast.error(validation.error || t('errors.loginError'));
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // Check if user needs to change password AND if email is verified
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_changed, email_verified')
        .eq('id', data.user.id)
        .maybeSingle();
      
      // Block login if email not verified
      if (profile && profile.email_verified === false) {
        console.log('[UnifiedAuth] Email not verified, blocking login');
        await supabase.auth.signOut();
        toast.error('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      if (!profile || !profile.password_changed) {
        // Create profile if doesn't exist
        if (!profile) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            password_changed: false,
          }, { onConflict: 'id' });
        }
        toast.success(t('errors.firstAccessSetPassword'));
        config.onNeedPasswordChange?.();
        navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Process pending referral on login (retry from signup)
      const pendingReferral = localStorage.getItem('referral_code');
      if (pendingReferral && data.user) {
        console.log('[UnifiedAuth] Found pending referral on login:', pendingReferral);
        try {
          const { data: refResult, error: refError } = await supabase.rpc('process_referral', {
            p_referred_user_id: data.user.id,
            p_referral_code: pendingReferral,
          });
          console.log('[UnifiedAuth] Login referral result:', refResult, 'error:', refError);
          if (!refError) {
            localStorage.removeItem('referral_code');
            console.log('[UnifiedAuth] Referral processed on login successfully');
          }
        } catch (refErr) {
          console.error('[UnifiedAuth] Referral on login error:', refErr);
        }
      }

      // Success!
      toast.success(t('success.loginSuccess'));
      config.onLoginSuccess?.();
      navigate(config.defaultRedirect);
      setState(prev => ({ ...prev, isLoading: false }));
      
    } catch (error) {
      console.error('[UnifiedAuth] Login error:', error);
      toast.error(t('errors.loginError'));
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.verifiedEmail, navigate, config, t]);

  /**
   * SIGNUP: Create new account
   */
  const signup = useCallback(async (data: SignupData) => {
    const { email, password, name, phone } = data;
    
    if (!email.trim()) {
      toast.error(t('errors.enterEmail'));
      return;
    }
    
    if (isDisposableEmail(email)) {
      toast.error('Emails temporários não são permitidos. Use um email real.');
      return;
    }
    
    if (password.length < 6) {
      toast.error(t('errors.passwordMinLength'));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const normalizedEmail = email.trim().toLowerCase();
    
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${config.defaultRedirect}`,
        },
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t('errors.emailAlreadyRegistered'));
        } else {
          toast.error(`${t('errors.signupError')}: ${error.message}`);
        }
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      if (authData.user) {
        // Create profile with email_verified = false
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: normalizedEmail,
          name: name?.trim() || null,
          phone: phone?.trim() || null,
          password_changed: true,
          email_verified: false,
        }, { onConflict: 'id' });
        
        // Referral code stays in localStorage - will be processed on first login after email confirmation
        
        // Send confirmation email via SendPulse
        try {
          const { data: confirmData, error: confirmError } = await supabase.functions.invoke('send-confirmation-email', {
            body: { email: normalizedEmail, user_id: authData.user.id }
          });
          
          if (confirmError || (confirmData && !confirmData.success)) {
            console.error('[UnifiedAuth] Error sending confirmation email:', confirmError || confirmData?.error);
          } else {
            console.log('[UnifiedAuth] Confirmation email sent successfully');
          }
        } catch (e) {
          console.error('[UnifiedAuth] Failed to send confirmation email:', e);
        }
        
        // Notify success BEFORE sign out to prevent auth state change from closing UI
        toast.success('Conta criada com sucesso! Verifique seu email.');
        config.onSignupSuccess?.();
        
        // Sign out immediately - user must confirm email before logging in
        await supabase.auth.signOut();
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      
    } catch (error) {
      console.error('[UnifiedAuth] Signup error:', error);
      toast.error(t('errors.signupError'));
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigate, config, t]);

  /**
   * RESEND: Resend password creation link
   */
  const resendLink = useCallback(async () => {
    const email = state.verifiedEmail || state.email;
    if (!email) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const redirectUrl = `${window.location.origin}${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`;
      
      const { data: recoveryData, error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email: email.trim().toLowerCase(), redirect_url: redirectUrl }
      });
      
      if (error || (recoveryData && !recoveryData.success)) {
        toast.error(t('errors.errorSendingLink'));
      } else {
        toast.success(t('success.linkSent'));
      }
    } catch (error) {
      toast.error(t('errors.errorSendingLink'));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.verifiedEmail, state.email, config, t]);

  return {
    state,
    checkEmail,
    loginWithPassword,
    signup,
    resendLink,
    changeEmail,
    goToSignup,
    goToLogin,
    setEmail,
    getForgotPasswordUrl,
  };
}
