import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = "1162356848586894";

/**
 * Re-initializes Meta Pixel with user email for Advanced Matching
 * when the user is logged in. This improves Event Match Quality (EMQ).
 */
export function useMetaPixelAdvancedMatching() {
  useEffect(() => {
    const updatePixel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email && window.fbq) {
        window.fbq("init", PIXEL_ID, { em: email });
        console.log("📊 Meta Pixel: Advanced Matching ativado com email");
      }
    };

    updatePixel();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && window.fbq) {
        window.fbq("init", PIXEL_ID, { em: session.user.email });
        console.log("📊 Meta Pixel: Advanced Matching atualizado (auth change)");
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
