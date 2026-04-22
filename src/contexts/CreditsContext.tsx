import { createContext, useContext, ReactNode } from 'react';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useAuth } from '@/contexts/AuthContext';

interface CreditsContextType {
  balance: number;
  breakdown: { total: number; monthly: number; lifetime: number };
  isLoading: boolean;
  hasError: boolean;
  isUnlimited: boolean;
  isGptImageFreeTrial: boolean;
  gptImageFreeUntil: string | null;
  refetch: () => Promise<void>;
  consumeCredits: (amount: number, description?: string) => Promise<{ success: boolean; error?: string; newBalance?: number; currentBalance?: number }>;
  checkBalance: () => Promise<number>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider = ({ children, userId }: { children: ReactNode; userId?: string }) => {
  const creditsData = useUpscalerCredits(userId);
  const { planos2Subscription } = useAuth();
  
  const isUnlimited = !!(planos2Subscription?.plan_slug === 'unlimited' && planos2Subscription?.is_active);
  const gptImageFreeUntil = planos2Subscription?.gpt_image_free_until || null;
  const isGptImageFreeTrial = !isUnlimited && !!gptImageFreeUntil && new Date(gptImageFreeUntil) > new Date();

  return (
    <CreditsContext.Provider value={{ ...creditsData, isUnlimited, isGptImageFreeTrial, gptImageFreeUntil }}>
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = (): CreditsContextType => {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    return {
      balance: 0,
      breakdown: { total: 0, monthly: 0, lifetime: 0 },
      isLoading: true,
      hasError: false,
      isUnlimited: false,
      isGptImageFreeTrial: false,
      gptImageFreeUntil: null,
      refetch: async () => {},
      consumeCredits: async () => ({ success: false, error: 'No CreditsProvider' }),
      checkBalance: async () => 0,
    };
  }
  return ctx;
};
