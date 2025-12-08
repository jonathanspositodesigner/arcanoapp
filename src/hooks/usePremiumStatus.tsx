import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const usePremiumStatus = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPremiumStatus = async (userId: string) => {
      // Check if premium
      const { data: isPremiumData, error: isPremiumError } = await supabase.rpc('is_premium');
      const premiumStatus = !isPremiumError && isPremiumData === true;
      setIsPremium(premiumStatus);

      // Get plan type
      if (premiumStatus) {
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_users')
          .select('plan_type')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (!premiumError && premiumData) {
          setPlanType(premiumData.plan_type);
        } else {
          setPlanType(null);
        }
      } else {
        setPlanType(null);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkPremiumStatus(session.user.id);
        } else {
          setIsPremium(false);
          setPlanType(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkPremiumStatus(session.user.id);
      }
      setIsLoading(false);
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(false);
    setPlanType(null);
  };

  return { user, isPremium, planType, isLoading, logout };
};
