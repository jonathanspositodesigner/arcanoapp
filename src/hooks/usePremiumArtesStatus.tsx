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
            checkPackAccess(currentSession.user.id).then(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUserPacks([]);
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
          await checkPackAccess(existingSession.user.id);
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

  // Legacy compatibility: isPremium = has at least one pack
  const isPremium = userPacks.length > 0;

  // Legacy compatibility: planType based on bonus access
  const planType = hasBonusAccess ? 'bonus_access' : (isPremium ? 'pack_only' : null);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserPacks([]);
    setHasBonusAccess(false);
  };

  return { 
    user, 
    session, 
    isPremium, // Has at least one pack
    planType,
    userPacks, // List of all packs user has access to
    hasBonusAccess, // Has access to bonus content
    hasAccessToPack, // Function to check specific pack access
    getPackAccessInfo, // Function to get pack details
    isLoading, 
    logout,
    refetch: () => user && checkPackAccess(user.id)
  };
};
