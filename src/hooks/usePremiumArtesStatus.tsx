import { useAuth } from "@/contexts/AuthContext";

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
}

export const usePremiumArtesStatus = () => {
  const { 
    user, 
    session, 
    userPacks, 
    expiredPacks, 
    hasBonusAccess,
    hasAccessToPack, 
    getPackAccessInfo, 
    hasExpiredPack, 
    getExpiredPackInfo, 
    isLoading, 
    logout, 
    refetch
  } = useAuth();
  
  // Legacy compatibility: isPremium = has at least one pack
  const isPremium = userPacks.length > 0;
  
  // Any user with at least 1 active pack has access to all bonus and updates
  const hasAccessToBonusAndUpdates = userPacks.length > 0;
  
  // Legacy compatibility: planType based on bonus access
  const planType = hasBonusAccess ? 'bonus_access' : (isPremium ? 'pack_only' : null);
  
  return { 
    user, 
    session, 
    isPremium,
    planType,
    userPacks,
    expiredPacks,
    hasBonusAccess,
    hasAccessToBonusAndUpdates,
    hasAccessToPack,
    getPackAccessInfo,
    hasExpiredPack,
    getExpiredPackInfo,
    isLoading, 
    logout,
    refetch
  };
};
