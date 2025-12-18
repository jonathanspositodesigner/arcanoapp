import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface PremiumMusicosStatus {
  user: User | null;
  session: Session | null;
  isPremium: boolean;
  planType: string | null;
  billingPeriod: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const usePremiumMusicosStatus = (): PremiumMusicosStatus => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkPremiumStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('premium_musicos_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .maybeSingle();

      if (error) {
        console.error('Error checking premium musicos status:', error);
        setIsPremium(false);
        setPlanType(null);
        setBillingPeriod(null);
        setExpiresAt(null);
        return;
      }

      if (data) {
        setIsPremium(true);
        setPlanType(data.plan_type);
        setBillingPeriod(data.billing_period);
        setExpiresAt(data.expires_at);
      } else {
        setIsPremium(false);
        setPlanType(null);
        setBillingPeriod(null);
        setExpiresAt(null);
      }
    } catch (error) {
      console.error('Error checking premium musicos status:', error);
      setIsPremium(false);
      setPlanType(null);
      setBillingPeriod(null);
      setExpiresAt(null);
    }
  };

  const refetch = async () => {
    if (user) {
      await checkPremiumStatus(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer the premium check to avoid deadlock
          setTimeout(() => {
            checkPremiumStatus(session.user.id);
          }, 0);
        } else {
          setIsPremium(false);
          setPlanType(null);
          setBillingPeriod(null);
          setExpiresAt(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
    setSession(null);
    setIsPremium(false);
    setPlanType(null);
    setBillingPeriod(null);
    setExpiresAt(null);
  };

  return {
    user,
    session,
    isPremium,
    planType,
    billingPeriod,
    expiresAt,
    isLoading,
    logout,
    refetch,
  };
};
