import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
}

interface Planos2Subscription {
  plan_slug: string;
  is_active: boolean;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
  cost_multiplier: number;
  expires_at: string | null;
  gpt_image_free_until: string | null;
}

interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  
  // Prompts premium status
  isPremium: boolean;
  planType: string | null;
  hasExpiredSubscription: boolean;
  expiredPlanType: string | null;
  expiringStatus: 'today' | 'tomorrow' | null;
  
  // Artes packs
  userPacks: PackAccess[];
  expiredPacks: PackAccess[];
  hasBonusAccess: boolean;
  hasAccessToPack: (slug: string) => boolean;
  getPackAccessInfo: (slug: string) => PackAccess | undefined;
  hasExpiredPack: (slug: string) => boolean;
  getExpiredPackInfo: (slug: string) => PackAccess | undefined;
  
  // Musicos status  
  isMusicosPremium: boolean;
  musicosPlanType: string | null;
  musicosBillingPeriod: string | null;
  musicosExpiresAt: string | null;

  // Planos2 subscription
  planos2Subscription: Planos2Subscription | null;
  isPlanos2User: boolean;
  hasImageGeneration: boolean;
  hasVideoGeneration: boolean;
  isSubscriptionActive: boolean;
  costMultiplier: number;
  
  // Actions
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Prompts premium status
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [hasExpiredSubscription, setHasExpiredSubscription] = useState(false);
  const [expiredPlanType, setExpiredPlanType] = useState<string | null>(null);
  const [expiringStatus, setExpiringStatus] = useState<'today' | 'tomorrow' | null>(null);
  
  // Artes packs
  const [userPacks, setUserPacks] = useState<PackAccess[]>([]);
  const [expiredPacks, setExpiredPacks] = useState<PackAccess[]>([]);
  const [hasBonusAccess, setHasBonusAccess] = useState(false);
  
  // Musicos status
  const [isMusicosPremium, setIsMusicosPremium] = useState(false);
  const [musicosPlanType, setMusicosPlanType] = useState<string | null>(null);
  const [musicosBillingPeriod, setMusicosBillingPeriod] = useState<string | null>(null);
  const [musicosExpiresAt, setMusicosExpiresAt] = useState<string | null>(null);

  // Planos2 subscription
  const [planos2Subscription, setPlanos2Subscription] = useState<Planos2Subscription | null>(null);
  
  const isInitialized = useRef(false);

  // Retry helper with exponential backoff
  const retryQuery = async <T,>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
        console.warn(`[Auth] Query failed, retrying in ${Math.round(delay)}ms...`, err);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  };

  // Check all premium statuses - serialized in 2 batches to reduce connection pressure
  const checkAllStatuses = async (userId: string) => {
    try {
      // Batch 1: Critical auth queries + premium_users detail (3 connections)
      const [isPremiumResult, userPacksResult, premiumDetailResult] = await retryQuery(() =>
        Promise.all([
          supabase.rpc('is_premium'),
          supabase.rpc('get_user_packs', { _user_id: userId }),
          supabase
            .from('premium_users')
            .select('plan_type, expires_at, is_active')
            .eq('user_id', userId)
            .order('expires_at', { ascending: false })
            .limit(2),
        ])
      );

      // Batch 2: Secondary queries + planos2 (3 connections) - after batch 1 releases
      const [expiredPacksResult, musicosResult, planos2Result] = await retryQuery(() =>
        Promise.all([
          supabase.rpc('get_user_expired_packs', { _user_id: userId }),
          supabase
            .from('premium_musicos_users')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .or('expires_at.is.null,expires_at.gt.now()')
            .maybeSingle(),
          supabase
            .from('planos2_subscriptions')
            .select('plan_slug, is_active, credits_per_month, daily_prompt_limit, has_image_generation, has_video_generation, cost_multiplier, expires_at, gpt_image_free_until')
            .eq('user_id', userId)
            .maybeSingle(),
        ])
      );

      // Process prompts premium status
      const premiumStatus = !isPremiumResult.error && isPremiumResult.data === true;
      setIsPremium(premiumStatus);

      // Process premium detail from batch 1 result (no extra query needed)
      if (premiumStatus && !premiumDetailResult.error && premiumDetailResult.data) {
        const activeRecord = (premiumDetailResult.data as any[]).find((r: any) => r.is_active);
        if (activeRecord) {
          setPlanType(activeRecord.plan_type);
          
          // Check if subscription expires today or tomorrow
          if (activeRecord.expires_at) {
            const expiresDate = new Date(activeRecord.expires_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const expiresDay = new Date(expiresDate);
            expiresDay.setHours(0, 0, 0, 0);
            
            if (expiresDay.getTime() === today.getTime()) {
              setExpiringStatus('today');
            } else if (expiresDay.getTime() === tomorrow.getTime()) {
              setExpiringStatus('tomorrow');
            } else {
              setExpiringStatus(null);
            }
          } else {
            setExpiringStatus(null);
          }
          setHasExpiredSubscription(false);
          setExpiredPlanType(null);
        } else {
          setPlanType(null);
          setExpiringStatus(null);
          setHasExpiredSubscription(false);
          setExpiredPlanType(null);
        }
      } else if (!premiumStatus) {
        setPlanType(null);
        setExpiringStatus(null);
        
        // Check for expired subscription from same batch result
        if (!premiumDetailResult.error && premiumDetailResult.data) {
          const expiredRecord = (premiumDetailResult.data as any[]).find((r: any) => !r.is_active && r.expires_at);
          if (expiredRecord) {
            const expiresAt = new Date(expiredRecord.expires_at);
            const now = new Date();
            if (expiresAt < now) {
              setHasExpiredSubscription(true);
              setExpiredPlanType(expiredRecord.plan_type);
            } else {
              setHasExpiredSubscription(false);
              setExpiredPlanType(null);
            }
          } else {
            setHasExpiredSubscription(false);
            setExpiredPlanType(null);
          }
        } else {
          setHasExpiredSubscription(false);
          setExpiredPlanType(null);
        }
      }

      // Process user packs
      if (!userPacksResult.error) {
        const packList = (userPacksResult.data || []) as PackAccess[];
        setUserPacks(packList);
        setHasBonusAccess(packList.some((p: PackAccess) => p.has_bonus));
      } else {
        console.error("Error fetching user packs:", userPacksResult.error);
        setUserPacks([]);
        setHasBonusAccess(false);
      }

      // Process expired packs
      if (!expiredPacksResult.error) {
        setExpiredPacks((expiredPacksResult.data || []) as PackAccess[]);
      } else {
        console.error("Error fetching expired packs:", expiredPacksResult.error);
        setExpiredPacks([]);
      }

      // Process musicos status
      if (!musicosResult.error && musicosResult.data) {
        setIsMusicosPremium(true);
        setMusicosPlanType(musicosResult.data.plan_type);
        setMusicosBillingPeriod(musicosResult.data.billing_period);
        setMusicosExpiresAt(musicosResult.data.expires_at);
      } else {
        setIsMusicosPremium(false);
        setMusicosPlanType(null);
        setMusicosBillingPeriod(null);
        setMusicosExpiresAt(null);
      }

      // Process planos2 subscription
      if (!planos2Result.error && planos2Result.data) {
        setPlanos2Subscription(planos2Result.data as Planos2Subscription);
      } else {
        setPlanos2Subscription(null);
      }
    } catch (error) {
      console.error('Error checking statuses:', error);
      resetAllStates();
    }
  };

  const resetAllStates = () => {
    setIsPremium(false);
    setPlanType(null);
    setHasExpiredSubscription(false);
    setExpiredPlanType(null);
    setExpiringStatus(null);
    setUserPacks([]);
    setExpiredPacks([]);
    setHasBonusAccess(false);
    setIsMusicosPremium(false);
    setMusicosPlanType(null);
    setMusicosBillingPeriod(null);
    setMusicosExpiresAt(null);
    setPlanos2Subscription(null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[Auth] onAuthStateChange:', event, currentSession?.user?.email ?? 'no-user');

        if (currentSession?.user) {
          // Synchronous state updates
          setSession(currentSession);
          setUser(currentSession.user);

          // Defer async operations with setTimeout to avoid deadlocks
          setTimeout(() => {
            checkAllStatuses(currentSession.user.id)
              .catch(err => console.error('[Auth] Status check failed:', err))
              .finally(() => setIsLoading(false));
          }, 0);
        } else {
          // Session lost — but DON'T immediately reset if we had a user.
          // Try to recover the session first (handles token refresh race conditions).
          if (event === 'SIGNED_OUT') {
            // Explicit sign out — reset immediately
            console.log('[Auth] Explicit SIGNED_OUT, resetting state');
            setSession(null);
            setUser(null);
            resetAllStates();
            setIsLoading(false);
          } else {
            // Could be a transient loss (INITIAL_SESSION with null, TOKEN_REFRESHED glitch)
            // Try to recover before giving up
            console.warn('[Auth] Session lost on event:', event, '— attempting recovery');
            setTimeout(async () => {
              try {
                const { data: { session: recovered } } = await supabase.auth.getSession();
                if (recovered?.user) {
                  console.log('[Auth] Session recovered for:', recovered.user.email);
                  setSession(recovered);
                  setUser(recovered.user);
                  try {
                    await checkAllStatuses(recovered.user.id);
                  } catch (err) {
                    console.error('[Auth] Status check failed after recovery:', err);
                  }
                  setIsLoading(false);
                } else {
                  console.log('[Auth] Recovery failed, no session found — resetting');
                  setSession(null);
                  setUser(null);
                  resetAllStates();
                  setIsLoading(false);
                }
              } catch (err) {
                console.error('[Auth] Recovery attempt error:', err);
                setSession(null);
                setUser(null);
                resetAllStates();
                setIsLoading(false);
              }
            }, 100);
          }
        }
      }
    );

    // THEN check for existing session (only once) with safety timeout
    if (!isInitialized.current) {
      isInitialized.current = true;
      
      const safetyTimeout = setTimeout(() => {
        console.warn('[Auth] Safety timeout: forcing loading=false after 8s');
        setIsLoading(false);
      }, 8000);

      supabase.auth.getSession()
        .then(async ({ data: { session: existingSession } }) => {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          
          if (existingSession?.user) {
            try {
              await checkAllStatuses(existingSession.user.id);
            } catch (err) {
              console.error('[Auth] checkAllStatuses failed:', err);
            }
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('[Auth] getSession failed:', err);
          setIsLoading(false);
        })
        .finally(() => {
          clearTimeout(safetyTimeout);
        });
    }

    return () => subscription.unsubscribe();
  }, []);

  // Helper functions for packs
  const hasAccessToPack = (packSlug: string): boolean => {
    return userPacks.some(p => p.pack_slug === packSlug);
  };

  const getPackAccessInfo = (packSlug: string): PackAccess | undefined => {
    return userPacks.find(p => p.pack_slug === packSlug);
  };

  const hasExpiredPack = (packSlug: string): boolean => {
    return expiredPacks.some(p => p.pack_slug === packSlug);
  };

  const getExpiredPackInfo = (packSlug: string): PackAccess | undefined => {
    return expiredPacks.find(p => p.pack_slug === packSlug);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetAllStates();
  };

  const refetch = async () => {
    if (user) {
      await checkAllStatuses(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isPremium,
    planType,
    hasExpiredSubscription,
    expiredPlanType,
    expiringStatus,
    userPacks,
    expiredPacks,
    hasBonusAccess,
    hasAccessToPack,
    getPackAccessInfo,
    hasExpiredPack,
    getExpiredPackInfo,
    isMusicosPremium,
    musicosPlanType,
    musicosBillingPeriod,
    musicosExpiresAt,
    planos2Subscription,
    isPlanos2User: !!planos2Subscription,
    isSubscriptionActive: !!planos2Subscription && planos2Subscription.is_active === true && 
      (!planos2Subscription.expires_at || new Date(planos2Subscription.expires_at) > new Date()),
    // Acesso TOTAL: todas as ferramentas liberadas para qualquer usuário com créditos
    // (avulsos ou de plano). A cobrança de créditos já gerencia o uso.
    hasImageGeneration: true,
    hasVideoGeneration: true,
    costMultiplier: planos2Subscription?.cost_multiplier ?? 1.0,
    logout,
    refetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};