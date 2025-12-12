import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/deviceUtils";

/**
 * Simple access tracker - records ONE access per page load
 * No session logic, no localStorage, no complexity
 * Each page load = 1 access record
 */
export const useSimpleAccessTracker = () => {
  useEffect(() => {
    const trackAccess = async () => {
      try {
        const deviceType = getDeviceType();
        
        await supabase.from("page_views").insert({
          page_path: window.location.pathname,
          device_type: deviceType,
          user_agent: navigator.userAgent,
        });
        
        console.log(`[AccessTracker] Registered ${deviceType} access`);
      } catch (error) {
        console.error("[AccessTracker] Error:", error);
      }
    };

    trackAccess();
  }, []);
};
