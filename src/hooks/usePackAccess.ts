import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
}

export const usePackAccess = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userPacks, setUserPacks] = useState<PackAccess[]>([]);
  const [hasBonusAccess, setHasBonusAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPackAccess = async (userId: string) => {
    try {
      // Get user's active packs using the database function
      const { data: packs, error } = await supabase.rpc('get_user_packs', {
        _user_id: userId
      });

      if (error) {
        console.error("Error fetching user packs:", error);
        return;
      }

      setUserPacks(packs || []);

      // Check if user has any pack with bonus access
      const hasBonus = packs?.some((p: PackAccess) => p.has_bonus) || false;
      setHasBonusAccess(hasBonus);
    } catch (error) {
      console.error("Error checking pack access:", error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            await checkPackAccess(session.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setUserPacks([]);
          setHasBonusAccess(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkPackAccess(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccessToPack = (packSlug: string): boolean => {
    return userPacks.some(p => p.pack_slug === packSlug);
  };

  const getPackAccessInfo = (packSlug: string): PackAccess | undefined => {
    return userPacks.find(p => p.pack_slug === packSlug);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserPacks([]);
    setHasBonusAccess(false);
  };

  return {
    user,
    userPacks,
    hasBonusAccess,
    isLoading,
    hasAccessToPack,
    getPackAccessInfo,
    logout,
    refetch: () => user && checkPackAccess(user.id)
  };
};
