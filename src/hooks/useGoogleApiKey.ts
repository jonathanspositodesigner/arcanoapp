import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleApiKeyData {
  api_key: string;
  total_credits: number;
  used_credits: number;
}

export function useGoogleApiKey() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [keyData, setKeyData] = useState<GoogleApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKey = useCallback(async () => {
    if (!userId) { setKeyData(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_google_api_keys' as any)
      .select('api_key, total_credits, used_credits')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      setKeyData(data as any);
    } else {
      setKeyData(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const saveKey = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'Não autenticado' };

    // Validate key with a simple test call
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(testUrl);
      if (!res.ok) {
        return { success: false, error: 'Chave API inválida. Verifique e tente novamente.' };
      }
    } catch {
      return { success: false, error: 'Erro ao validar a chave. Tente novamente.' };
    }

    // Upsert via edge function for security - but since we have RLS, we can insert directly
    // The key will be stored as-is (in a real production app you'd encrypt it)
    const { error } = await supabase
      .from('user_google_api_keys' as any)
      .upsert({
        user_id: userId,
        api_key: apiKey,
        total_credits: 1800.00,
        used_credits: 0,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id' });

    if (error) {
      return { success: false, error: 'Erro ao salvar chave.' };
    }
    
    await fetchKey();
    return { success: true };
  };

  const removeKey = async (): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase
      .from('user_google_api_keys' as any)
      .delete()
      .eq('user_id', userId);
    if (!error) {
      setKeyData(null);
      return true;
    }
    return false;
  };

  return {
    hasKey: !!keyData,
    keyData,
    loading,
    saveKey,
    removeKey,
    refetch: fetchKey,
    maskedKey: keyData?.api_key
      ? `${keyData.api_key.slice(0, 6)}${'•'.repeat(20)}${keyData.api_key.slice(-4)}`
      : null,
  };
}
