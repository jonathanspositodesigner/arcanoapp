import { createContext, useContext, ReactNode } from 'react';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';

interface CreditsContextType {
  balance: number;
  breakdown: { total: number; monthly: number; lifetime: number };
  isLoading: boolean;
  refetch: () => Promise<void>;
  consumeCredits: (amount: number, description?: string) => Promise<{ success: boolean; error?: string; newBalance?: number; currentBalance?: number }>;
  checkBalance: () => Promise<number>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider = ({ children, userId }: { children: ReactNode; userId?: string }) => {
  const creditsData = useUpscalerCredits(userId);
  return (
    <CreditsContext.Provider value={creditsData}>
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = (): CreditsContextType => {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    // Fallback for components rendered outside CreditsProvider
    return {
      balance: 0,
      breakdown: { total: 0, monthly: 0, lifetime: 0 },
      isLoading: true,
      refetch: async () => {},
      consumeCredits: async () => ({ success: false, error: 'No CreditsProvider' }),
      checkBalance: async () => 0,
    };
  }
  return ctx;
};
