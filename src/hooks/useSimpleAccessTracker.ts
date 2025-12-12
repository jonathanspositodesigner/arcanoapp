import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/deviceUtils";

/**
 * Simple access tracker - records ONE access per page navigation
 * Uses useLocation to detect route changes and track each page view
 */
export const useSimpleAccessTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackAccess = async () => {
      try {
        const deviceType = getDeviceType();
        
        await supabase.from("page_views").insert({
          page_path: location.pathname,
          device_type: deviceType,
          user_agent: navigator.userAgent,
        });
        
        console.log(`[AccessTracker] Registered ${deviceType} access to ${location.pathname}`);
      } catch (error) {
        console.error("[AccessTracker] Error:", error);
      }
    };

    trackAccess();
  }, [location.pathname]);
};
