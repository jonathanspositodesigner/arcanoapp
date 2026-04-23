import { createContext, useContext, ReactNode } from "react";
import { usePremiumPromptLimit } from "@/hooks/usePremiumPromptLimit";
import { User } from "@supabase/supabase-js";

interface PremiumPromptContextValue {
  unlocksUsed: number;
  remainingUnlocks: number;
  dailyLimit: number;
  hasReachedLimit: boolean;
  isUnlimited: boolean;
  isLoading: boolean;
  unlockedPromptIds: Set<string>;
  isPromptUnlocked: (promptId: string) => boolean;
  unlockPrompt: (promptId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const PremiumPromptContext = createContext<PremiumPromptContextValue | null>(null);

interface PremiumPromptProviderProps {
  user: User | null;
  isPremium: boolean;
  planType: string | null;
  children: ReactNode;
}

export const PremiumPromptProvider = ({ user, isPremium, planType, children }: PremiumPromptProviderProps) => {
  const value = usePremiumPromptLimit(user, isPremium, planType);
  return (
    <PremiumPromptContext.Provider value={value}>
      {children}
    </PremiumPromptContext.Provider>
  );
};

export const usePremiumPromptContext = (): PremiumPromptContextValue => {
  const ctx = useContext(PremiumPromptContext);
  if (!ctx) {
    throw new Error("usePremiumPromptContext must be used within PremiumPromptProvider");
  }
  return ctx;
};