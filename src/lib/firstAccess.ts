import { supabase } from "@/integrations/supabase/client";

export type FirstAccessResult =
  | { status: 'AUTOLOGIN_OK' }
  | { status: 'LINK_SENT'; email: string }
  | { status: 'EMAIL_NOT_FOUND' }
  | { status: 'HAS_PASSWORD' }
  | { status: 'ERROR'; message: string };

/**
 * Handle first access flow for users with password_changed = false
 * 
 * 1. If auto-login (email=password) works → returns AUTOLOGIN_OK
 * 2. If auto-login fails → sends reset link and returns LINK_SENT
 * 3. If email not found → returns EMAIL_NOT_FOUND
 * 4. If user already has password → returns HAS_PASSWORD
 */
export async function handleFirstAccess(
  email: string,
  changePasswordRoute: string,
  redirectAfterPassword: string = '/'
): Promise<FirstAccessResult> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!normalizedEmail || normalizedEmail.length < 3) {
    return { status: 'ERROR', message: 'Email inválido' };
  }
  
  console.log('[FirstAccess] Checking email:', normalizedEmail);
  
  try {
    // Check if profile exists
    const { data: profileCheck, error: rpcError } = await supabase
      .rpc('check_profile_exists', { check_email: normalizedEmail });
    
    if (rpcError) {
      console.error('[FirstAccess] RPC error:', rpcError);
      return { status: 'ERROR', message: 'Erro ao verificar email' };
    }
    
    const profileExists = profileCheck?.[0]?.exists_in_db || false;
    const passwordChanged = profileCheck?.[0]?.password_changed || false;
    
    console.log('[FirstAccess] Profile check result:', { profileExists, passwordChanged });
    
    if (!profileExists) {
      console.log('[FirstAccess] Email not found');
      return { status: 'EMAIL_NOT_FOUND' };
    }
    
    if (passwordChanged) {
      console.log('[FirstAccess] User already has password');
      return { status: 'HAS_PASSWORD' };
    }
    
    // Try auto-login with email as password
    console.log('[FirstAccess] Attempting auto-login...');
    const { error: autoLoginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedEmail,
    });
    
    if (!autoLoginError) {
      console.log('[FirstAccess] Auto-login successful!');
      return { status: 'AUTOLOGIN_OK' };
    }
    
    // Auto-login failed - send password creation link
    console.log('[FirstAccess] Auto-login failed, sending recovery link...');
    
    const redirectUrl = `${window.location.origin}${changePasswordRoute}?redirect=${encodeURIComponent(redirectAfterPassword)}`;
    console.log('[FirstAccess] Recovery redirect URL:', redirectUrl);
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: redirectUrl }
    );
    
    if (resetError) {
      console.error('[FirstAccess] Reset email error:', resetError);
      return { status: 'ERROR', message: 'Erro ao enviar link' };
    }
    
    console.log('[FirstAccess] Recovery link sent successfully');
    return { status: 'LINK_SENT', email: normalizedEmail };
    
  } catch (error) {
    console.error('[FirstAccess] Unexpected error:', error);
    return { status: 'ERROR', message: 'Erro inesperado' };
  }
}

/**
 * Resend the password creation link
 */
export async function resendPasswordLink(
  email: string,
  changePasswordRoute: string,
  redirectAfterPassword: string = '/'
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const redirectUrl = `${window.location.origin}${changePasswordRoute}?redirect=${encodeURIComponent(redirectAfterPassword)}`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    { redirectTo: redirectUrl }
  );
  
  if (error) {
    console.error('[FirstAccess] Resend error:', error);
    return { success: false, error: 'Erro ao reenviar link' };
  }
  
  return { success: true };
}
