import { useAuth } from "@/contexts/AuthContext";

export const usePackAccess = () => {
  const { 
    user, 
    userPacks, 
    hasBonusAccess, 
    isLoading,
    hasAccessToPack, 
    getPackAccessInfo, 
    logout, 
    refetch
  } = useAuth();
  
  return {
    user,
    userPacks,
    hasBonusAccess,
    isLoading,
    hasAccessToPack,
    getPackAccessInfo,
    logout,
    refetch
  };
};
