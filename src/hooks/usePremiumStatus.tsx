import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const usePremiumStatus = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    const checkPremiumStatus = async (userId: string) => {
      try {
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
      } catch (error) {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
        setPlanType(null);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Synchronous state updates only
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer async operations with setTimeout to avoid deadlocks
        if (currentSession?.user) {
          setTimeout(() => {
            checkPremiumStatus(currentSession.user.id).then(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setIsPremium(false);
          setPlanType(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session (only once)
    if (!isInitialized.current) {
      isInitialized.current = true;
      supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        if (existingSession?.user) {
          await checkPremiumStatus(existingSession.user.id);
        }
        setIsLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsPremium(false);
    setPlanType(null);
  };

  return { user, session, isPremium, planType, isLoading, logout };
};
