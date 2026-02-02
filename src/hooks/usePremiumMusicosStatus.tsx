import { useAuth } from "@/contexts/AuthContext";

export const usePremiumMusicosStatus = () => {
  const { 
    user, 
    session, 
    isMusicosPremium, 
    musicosPlanType,
    musicosBillingPeriod, 
    musicosExpiresAt, 
    isLoading,
    logout, 
    refetch
  } = useAuth();
  
  return {
    user,
    session,
    isPremium: isMusicosPremium,
    planType: musicosPlanType,
    billingPeriod: musicosBillingPeriod,
    expiresAt: musicosExpiresAt,
    isLoading,
    logout,
    refetch
  };
};
