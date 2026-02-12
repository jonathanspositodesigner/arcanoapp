import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_KEY = 'ai_tools_free_trial_modal_shown';
const SHOW_DELAY_MS = 2000;

interface UseAIToolsAuthModalOptions {
  user: any;
  refetchCredits?: () => void;
}

export function useAIToolsAuthModal({ user, refetchCredits }: UseAIToolsAuthModalOptions) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show modal after 2s if user is not logged in and hasn't seen it this session
  useEffect(() => {
    if (user) return;

    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      setShowAuthModal(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user]);

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false);

    try {
      const { data, error } = await supabase.functions.invoke('claim-arcano-free-trial');

      if (error) {
        console.error('[AIToolsAuth] Claim error:', error);
        return;
      }

      // Marcar sessionStorage DEPOIS do claim (sucesso ou já resgatado)
      if (!error) {
        sessionStorage.setItem(SESSION_KEY, 'true');
      }

      if (data?.success) {
        toast.success(`🎉 ${data.credits_granted} créditos gratuitos adicionados!`);
        refetchCredits?.();
      } else if (data?.already_claimed) {
        toast.info('Você já resgatou suas gerações gratuitas anteriormente.');
      }
    } catch (err) {
      console.error('[AIToolsAuth] Claim error:', err);
    }
  }, [refetchCredits]);

  return {
    showAuthModal,
    setShowAuthModal,
    handleAuthSuccess,
  };
}
