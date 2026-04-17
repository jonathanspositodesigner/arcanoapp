import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { isDisposableEmail } from "@/utils/disposableEmailDomains";
import { getSignupDeviceFingerprint } from "@/lib/deviceFingerprint";

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
  cpf?: string;
  address_line?: string;
  address_zip?: string;
  address_city?: string;
  address_state?: string;
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
    'errors.loginTimeout': 'A autenticação demorou demais. Tente novamente.',
    'errors.passwordsDoNotMatch': 'As senhas não conferem',
    'errors.emailAlreadyRegistered': 'Este email já está cadastrado',
    'errors.signupError': 'Erro ao criar conta',
    'errors.tryWithPassword': 'Problema ao verificar seu cadastro. Tente seguir com a senha.',
    'success.loginSuccess': 'Login realizado com sucesso!',
    'success.accountCreatedSuccess': 'Conta criada com sucesso!',
    'success.linkSent': 'Link enviado para seu email!',
  };
  return messages[key] || key;
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    }),
  ]);
};

const isTimeoutError = (error: unknown, label?: string) => {
  return error instanceof Error && error.message.startsWith(`timeout:${label ?? ''}`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      let profileCheck: any = null;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { data, error } = await withTimeout(
            supabase.rpc('check_profile_exists', { check_email: normalizedEmail }),
            6000,
            'check_profile_exists'
          );

          if (!error) {
            profileCheck = data;
            lastError = null;
            break;
          }

          lastError = error;
          console.warn(`[UnifiedAuth] RPC attempt ${attempt} failed:`, error.message);
        } catch (error) {
          lastError = error;
          console.warn(`[UnifiedAuth] RPC attempt ${attempt} aborted:`, error);
        }

        if (attempt < 2) await sleep(350);
      }

      if (lastError) {
        console.error('[UnifiedAuth] RPC failed after retries, falling back to password step:', lastError);
        toast.info(t('errors.tryWithPassword'));
        setState(prev => ({
          ...prev,
          step: 'password',
          verifiedEmail: normalizedEmail,
          isLoading: false,
        }));
        return;
      }
      
      const profileExists = profileCheck?.[0]?.exists_in_db || false;
      let passwordChanged = profileCheck?.[0]?.password_changed || false;
      const profileCreatedAt = profileCheck?.[0]?.created_at;
      const hasLoggedIn = profileCheck?.[0]?.has_logged_in || false;
      const existsInAuth = profileCheck?.[0]?.exists_in_auth || false;
      
      // Legacy accounts created before 2026-03-12 should skip first-access flow
      // BUT only if they have actually logged in before
      const LEGACY_CUTOFF = new Date('2026-03-12T00:00:00Z');
      if (profileExists && !passwordChanged && profileCreatedAt && new Date(profileCreatedAt) < LEGACY_CUTOFF && hasLoggedIn) {
        console.log('[UnifiedAuth] Legacy account pre-cutoff WITH login history, skipping first-access flow');
        passwordChanged = true;
      }
      
      console.log('[UnifiedAuth] Profile check:', { profileExists, passwordChanged, hasLoggedIn, existsInAuth });
      
      // Case 0: Exists in auth but NOT in profiles → auto-create profile and go to password
      if (!profileExists && existsInAuth) {
        console.log('[UnifiedAuth] User exists in auth but missing profile, going to password step');
        setState(prev => ({
          ...prev,
          step: 'password',
          verifiedEmail: normalizedEmail,
          isLoading: false,
        }));
        return;
      }
      
      // Case 1: Email not found anywhere → go to signup
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
      
      // Case 2a: Has password_changed=true but never logged in → treat as first access
      // This catches users created by webhook with password=email and password_changed=true incorrectly
      if (profileExists && passwordChanged && !hasLoggedIn) {
        console.log('[UnifiedAuth] User never logged in despite password_changed=true, trying auto-login');
        let autoLoginError: unknown = null;

        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: normalizedEmail,
            }),
            8000,
            'first_access_auto_login'
          );
          autoLoginError = error;
        } catch (error) {
          autoLoginError = error;
        }
        
        if (!autoLoginError) {
          console.log('[UnifiedAuth] Auto-login successful for never-logged-in user');
          toast.success(t('errors.firstAccessSetPassword'));
          config.onNeedPasswordChange?.();
          navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Auto-login failed → password was changed by someone else or different, go to password step
        console.log('[UnifiedAuth] Auto-login failed for never-logged-in user, going to password step');
        setState(prev => ({
          ...prev,
          step: 'password',
          verifiedEmail: normalizedEmail,
          isLoading: false,
        }));
        return;
      }
      
      // Case 2b: First access (no password set) → try auto-login or send link
      if (profileExists && !passwordChanged) {
        console.log('[UnifiedAuth] First access flow');
        let autoLoginError: unknown = null;

        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: normalizedEmail,
            }),
            8000,
            'first_access_auto_login'
          );
          autoLoginError = error;
        } catch (error) {
          autoLoginError = error;
        }
        
        if (!autoLoginError) {
          console.log('[UnifiedAuth] Auto-login successful');
          toast.success(t('errors.firstAccessSetPassword'));
          config.onNeedPasswordChange?.();
          navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Auto-login failed
        // Primeiro acesso: NUNCA enviar link por email.
        // Sempre levar direto para cadastro de senha na tela de troca.
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
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: state.verifiedEmail,
          password,
        }),
        12000,
        'sign_in'
      );
      
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
      
      let profile: { password_changed?: boolean | null; email_verified?: boolean | null; created_at?: string | null } | null = null;

      try {
        const { data: profileData, error: profileError } = await withTimeout(
          supabase
            .from('profiles')
            .select('password_changed, email_verified, created_at')
            .eq('id', data.user.id)
            .maybeSingle(),
          6000,
          'load_profile'
        );

        if (profileError) {
          console.warn('[UnifiedAuth] Profile fetch error after login:', profileError);
        } else {
          profile = profileData;
        }
      } catch (error) {
        console.warn('[UnifiedAuth] Profile fetch timeout after login:', error);
      }
      
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
          toast.success(t('errors.firstAccessSetPassword'));
          config.onNeedPasswordChange?.();
          navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Legacy account created before 2026-03-12: auto-fix and let through
        const LEGACY_CUTOFF = new Date('2026-03-12T00:00:00Z');
        if (profile.created_at && new Date(profile.created_at) < LEGACY_CUTOFF) {
          console.log('[UnifiedAuth] Legacy account, skipping first-access flow (no DB write)');
          // Continue login normally - don't write password_changed to DB
        } else {
          toast.success(t('errors.firstAccessSetPassword'));
          config.onNeedPasswordChange?.();
          navigate(`${config.changePasswordRoute}?redirect=${encodeURIComponent(config.defaultRedirect)}`);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // Process pending referral on login (retry from signup)
      const pendingReferral = localStorage.getItem('referral_code');
      if (pendingReferral && data.user) {
        console.log('[UnifiedAuth] Found pending referral on login:', pendingReferral);
        void supabase.rpc('process_referral', {
            p_referred_user_id: data.user.id,
            p_referral_code: pendingReferral,
          })
          .then(({ data: refResult, error: refError }) => {
            console.log('[UnifiedAuth] Login referral result:', refResult, 'error:', refError);
            if (!refError) {
            localStorage.removeItem('referral_code');
            console.log('[UnifiedAuth] Referral processed on login successfully');
            }
          })
          .catch((refErr) => {
            console.error('[UnifiedAuth] Referral on login error:', refErr);
          });
      }

      // Success!
      toast.success(t('success.loginSuccess'));
      config.onLoginSuccess?.();
      navigate(config.defaultRedirect);
      setState(prev => ({ ...prev, isLoading: false }));
      
    } catch (error) {
      console.error('[UnifiedAuth] Login error:', error);
      toast.error(isTimeoutError(error, 'sign_in') ? t('errors.loginTimeout') : t('errors.loginError'));
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.verifiedEmail, navigate, config, t]);

  /**
   * SIGNUP: Create new account
   */
  const signup = useCallback(async (data: SignupData) => {
    const { email, password, name, phone, cpf, address_line, address_zip, address_city, address_state } = data;
    
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
      // Check device fingerprint limit
      const deviceFingerprint = getSignupDeviceFingerprint();
      const { data: alreadyUsed, error: deviceError } = await supabase
        .rpc('check_device_signup_limit', { p_fingerprint: deviceFingerprint });
      
      if (deviceError) {
        console.error('[UnifiedAuth] Device check error:', deviceError);
      } else if (alreadyUsed) {
        toast.error('Este dispositivo já possui uma conta cadastrada. Use sua conta existente.');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
    
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
          cpf: cpf?.replace(/\D/g, '') || null,
          address_line: address_line?.trim() || null,
          address_zip: address_zip?.replace(/\D/g, '') || null,
          address_city: address_city?.trim() || null,
          address_state: address_state?.trim() || null,
          address_country: 'BR',
          password_changed: true,
          email_verified: false,
        }, { onConflict: 'id' });
        
        // Register device fingerprint
        try {
          await supabase.rpc('register_device_signup', {
            p_fingerprint: deviceFingerprint,
            p_user_id: authData.user.id,
          });
          console.log('[UnifiedAuth] Device fingerprint registered');
        } catch (fpErr) {
          console.error('[UnifiedAuth] Failed to register device fingerprint:', fpErr);
        }
        
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
