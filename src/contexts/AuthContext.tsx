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
  const enrichingRef = useRef(false);

  // Check all premium statuses - runs in BACKGROUND, does NOT block render
  const checkAllStatuses = async (userId: string) => {
    // Prevent duplicate concurrent enrichment
    if (enrichingRef.current) return;
    enrichingRef.current = true;
    
    try {
      // Run ALL 6 queries in parallel (single batch) - no retry, no serialization
      const [isPremiumResult, userPacksResult, premiumDetailResult, expiredPacksResult, musicosResult, planos2Result] = await Promise.allSettled([
        supabase.rpc('is_premium'),
        supabase.rpc('get_user_packs', { _user_id: userId }),
        supabase
          .from('premium_users')
          .select('plan_type, expires_at, is_active')
          .eq('user_id', userId)
          .order('expires_at', { ascending: false })
          .limit(2),
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
          .select('plan_slug, is_active, credits_per_month, daily_prompt_limit, has_image_generation, has_video_generation, cost_multiplier')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      // Process prompts premium status
      const isPremRes = isPremiumResult.status === 'fulfilled' ? isPremiumResult.value : null;
      const premiumStatus = isPremRes && !isPremRes.error && isPremRes.data === true;
      setIsPremium(!!premiumStatus);

      // Process premium detail
      const premDetailRes = premiumDetailResult.status === 'fulfilled' ? premiumDetailResult.value : null;
      if (premiumStatus && premDetailRes && !premDetailRes.error && premDetailRes.data) {
        const activeRecord = (premDetailRes.data as any[]).find((r: any) => r.is_active);
        if (activeRecord) {
          setPlanType(activeRecord.plan_type);
          
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
        
        if (premDetailRes && !premDetailRes.error && premDetailRes.data) {
          const expiredRecord = (premDetailRes.data as any[]).find((r: any) => !r.is_active && r.expires_at);
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
      const packsRes = userPacksResult.status === 'fulfilled' ? userPacksResult.value : null;
      if (packsRes && !packsRes.error) {
        const packList = (packsRes.data || []) as PackAccess[];
        setUserPacks(packList);
        setHasBonusAccess(packList.some((p: PackAccess) => p.has_bonus));
      } else {
        setUserPacks([]);
        setHasBonusAccess(false);
      }

      // Process expired packs
      const expPacksRes = expiredPacksResult.status === 'fulfilled' ? expiredPacksResult.value : null;
      if (expPacksRes && !expPacksRes.error) {
        setExpiredPacks((expPacksRes.data || []) as PackAccess[]);
      } else {
        setExpiredPacks([]);
      }

      // Process musicos status
      const musicosRes = musicosResult.status === 'fulfilled' ? musicosResult.value : null;
      if (musicosRes && !musicosRes.error && musicosRes.data) {
        setIsMusicosPremium(true);
        setMusicosPlanType(musicosRes.data.plan_type);
        setMusicosBillingPeriod(musicosRes.data.billing_period);
        setMusicosExpiresAt(musicosRes.data.expires_at);
      } else {
        setIsMusicosPremium(false);
        setMusicosPlanType(null);
        setMusicosBillingPeriod(null);
        setMusicosExpiresAt(null);
      }

      // Process planos2 subscription
      const planos2Res = planos2Result.status === 'fulfilled' ? planos2Result.value : null;
      if (planos2Res && !planos2Res.error && planos2Res.data) {
        setPlanos2Subscription(planos2Res.data as Planos2Subscription);
      } else {
        setPlanos2Subscription(null);
      }
    } catch (error) {
      console.error('Error checking statuses:', error);
      // Don't reset states on error - keep whatever was loaded
    } finally {
      enrichingRef.current = false;
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
        // Synchronous state updates only
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Release loading immediately - enrichment happens in background
          setIsLoading(false);
          // Defer async operations with setTimeout to avoid deadlocks
          setTimeout(() => {
            checkAllStatuses(currentSession.user.id)
              .catch(err => console.error('[Auth] Status check failed:', err));
          }, 0);
        } else {
          resetAllStates();
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session (only once)
    if (!isInitialized.current) {
      isInitialized.current = true;
      
      // Safety timeout reduced to 3s
      const safetyTimeout = setTimeout(() => {
        console.warn('[Auth] Safety timeout: forcing loading=false after 3s');
        setIsLoading(false);
      }, 3000);

      supabase.auth.getSession()
        .then(({ data: { session: existingSession } }) => {
          clearTimeout(safetyTimeout);
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          
          // Release loading IMMEDIATELY after session is known
          setIsLoading(false);
          
          if (existingSession?.user) {
            // Enrich in background - don't block render
            checkAllStatuses(existingSession.user.id)
              .catch(err => console.error('[Auth] checkAllStatuses failed:', err));
          }
        })
        .catch((err) => {
          clearTimeout(safetyTimeout);
          console.error('[Auth] getSession failed:', err);
          setIsLoading(false);
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
    hasImageGeneration: planos2Subscription?.has_image_generation ?? true,
    hasVideoGeneration: planos2Subscription?.has_video_generation ?? true,
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
