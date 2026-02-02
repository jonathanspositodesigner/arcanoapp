import { useAuth } from "@/contexts/AuthContext";

export const usePremiumStatus = () => {
  const { 
    user, 
    session, 
    isPremium, 
    planType, 
    isLoading, 
    hasExpiredSubscription, 
    expiredPlanType,
    expiringStatus,
    logout 
  } = useAuth();
  
  return { 
    user, 
    session, 
    isPremium, 
    planType, 
    isLoading, 
    logout, 
    hasExpiredSubscription, 
    expiredPlanType,
    expiringStatus
  };
};
