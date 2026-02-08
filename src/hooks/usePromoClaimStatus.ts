import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePromoClaimStatus = (userId: string | undefined, promoCode: string = 'UPSCALER_1500') => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['promo-claim-status', userId, promoCode],
    queryFn: async () => {
      if (!userId) return { hasClaimed: false };
      
      const { data, error } = await supabase
        .from('promo_claims')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_code', promoCode)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking promo claim status:', error);
        return { hasClaimed: false };
      }
      
      return { hasClaimed: !!data };
    },
    enabled: !!userId,
  });
  
  return {
    hasClaimed: data?.hasClaimed ?? false,
    isLoading,
    refetch,
  };
};
