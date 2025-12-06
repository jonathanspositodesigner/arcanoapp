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
      setIsPremium(!isPremiumError && isPremiumData === true);

      // Get plan type
      if (!isPremiumError && isPremiumData === true) {
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_users')
          .select('plan_type')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (!premiumError && premiumData) {
          setPlanType(premiumData.plan_type);
        }
      } else {
        setPlanType(null);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            checkPremiumStatus(session.user.id);
          }, 0);
        } else {
          setIsPremium(false);
          setPlanType(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkPremiumStatus(session.user.id);
      }
      setIsLoading(false);
    });

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
