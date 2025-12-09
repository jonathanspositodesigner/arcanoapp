import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
}

export const usePremiumArtesStatus = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPacks, setUserPacks] = useState<PackAccess[]>([]);
  const [expiredPacks, setExpiredPacks] = useState<PackAccess[]>([]);
  const [hasBonusAccess, setHasBonusAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  const checkPackAccess = async (userId: string) => {
    try {
      // Get user's active packs using the database function
      const { data: packs, error } = await supabase.rpc('get_user_packs', {
        _user_id: userId
      });

      if (error) {
        console.error("Error fetching user packs:", error);
        setUserPacks([]);
        setHasBonusAccess(false);
        return;
      }

      const packList = (packs || []) as PackAccess[];
      setUserPacks(packList);

      // Check if user has any pack with bonus access
      const hasBonus = packList.some((p: PackAccess) => p.has_bonus);
      setHasBonusAccess(hasBonus);
    } catch (error) {
      console.error("Error checking pack access:", error);
      setUserPacks([]);
      setHasBonusAccess(false);
    }
  };

  const checkExpiredPacks = async (userId: string) => {
    try {
      const { data: expired, error } = await supabase.rpc('get_user_expired_packs', {
        _user_id: userId
      });

      if (error) {
        console.error("Error fetching expired packs:", error);
        setExpiredPacks([]);
        return;
      }

      setExpiredPacks((expired || []) as PackAccess[]);
    } catch (error) {
      console.error("Error checking expired packs:", error);
      setExpiredPacks([]);
    }
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
            Promise.all([
              checkPackAccess(currentSession.user.id),
              checkExpiredPacks(currentSession.user.id)
            ]).then(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUserPacks([]);
          setExpiredPacks([]);
          setHasBonusAccess(false);
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
          await Promise.all([
            checkPackAccess(existingSession.user.id),
            checkExpiredPacks(existingSession.user.id)
          ]);
        }
        setIsLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

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

  // Legacy compatibility: isPremium = has at least one pack
  const isPremium = userPacks.length > 0;

  // Any user with at least 1 active pack has access to all bonus and updates
  const hasAccessToBonusAndUpdates = userPacks.length > 0;

  // Legacy compatibility: planType based on bonus access
  const planType = hasBonusAccess ? 'bonus_access' : (isPremium ? 'pack_only' : null);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserPacks([]);
    setExpiredPacks([]);
    setHasBonusAccess(false);
  };

  const refetch = () => {
    if (user) {
      Promise.all([
        checkPackAccess(user.id),
        checkExpiredPacks(user.id)
      ]);
    }
  };

  return { 
    user, 
    session, 
    isPremium, // Has at least one pack
    planType,
    userPacks, // List of all packs user has access to
    expiredPacks, // List of expired packs
    hasBonusAccess, // Has access to bonus content (legacy)
    hasAccessToBonusAndUpdates, // Has at least 1 active pack = access to all bonus/updates
    hasAccessToPack, // Function to check specific pack access
    getPackAccessInfo, // Function to get pack details
    hasExpiredPack, // Function to check if pack is expired
    getExpiredPackInfo, // Function to get expired pack details
    isLoading, 
    logout,
    refetch
  };
};
