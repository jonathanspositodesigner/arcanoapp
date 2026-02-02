import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
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
  
  const isInitialized = useRef(false);

  // Check all premium statuses in parallel
  const checkAllStatuses = async (userId: string) => {
    try {
      // Run all queries in parallel
      const [
        isPremiumResult,
        userPacksResult,
        expiredPacksResult,
        musicosResult
      ] = await Promise.all([
        // 1. Check prompts premium status
        supabase.rpc('is_premium'),
        // 2. Get user packs
        supabase.rpc('get_user_packs', { _user_id: userId }),
        // 3. Get expired packs
        supabase.rpc('get_user_expired_packs', { _user_id: userId }),
        // 4. Check musicos premium status
        supabase
          .from('premium_musicos_users')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.now()')
          .maybeSingle()
      ]);

      // Process prompts premium status
      const premiumStatus = !isPremiumResult.error && isPremiumResult.data === true;
      setIsPremium(premiumStatus);

      if (premiumStatus) {
        // Get detailed plan info
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_users')
          .select('plan_type, expires_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (!premiumError && premiumData) {
          setPlanType(premiumData.plan_type);
          
          // Check if subscription expires today or tomorrow
          if (premiumData.expires_at) {
            const expiresDate = new Date(premiumData.expires_at);
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
        } else {
          setPlanType(null);
          setExpiringStatus(null);
        }
        setHasExpiredSubscription(false);
        setExpiredPlanType(null);
      } else {
        setPlanType(null);
        setExpiringStatus(null);
        
        // Check for expired subscription
        const { data: expiredData, error: expiredError } = await supabase
          .from('premium_users')
          .select('plan_type, expires_at')
          .eq('user_id', userId)
          .eq('is_active', false)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!expiredError && expiredData && expiredData.expires_at) {
          const expiresAt = new Date(expiredData.expires_at);
          const now = new Date();
          if (expiresAt < now) {
            setHasExpiredSubscription(true);
            setExpiredPlanType(expiredData.plan_type);
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
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Synchronous state updates only
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer async operations with setTimeout to avoid deadlocks
        if (currentSession?.user) {
          setTimeout(() => {
            checkAllStatuses(currentSession.user.id).then(() => {
              setIsLoading(false);
            });
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
      supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        if (existingSession?.user) {
          await checkAllStatuses(existingSession.user.id);
        }
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
    logout,
    refetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
