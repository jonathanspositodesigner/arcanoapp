import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/deviceUtils";

const VISITOR_ID_KEY = "arcano_visitor_id";

/**
 * Get or create a unique visitor ID stored in localStorage
 */
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

/**
 * Simple access tracker - records ONE access per page navigation
 * Uses useLocation to detect route changes and track each page view
 * Includes visitor_id for unique visitor counting
 */
export const useSimpleAccessTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackAccess = async () => {
      try {
        const deviceType = getDeviceType();
        const visitorId = getVisitorId();
        
        await supabase.from("page_views").insert({
          page_path: location.pathname,
          device_type: deviceType,
          user_agent: navigator.userAgent,
          visitor_id: visitorId,
        });
        
        console.log(`[AccessTracker] Registered ${deviceType} access to ${location.pathname} (visitor: ${visitorId.slice(0, 8)}...)`);
      } catch (error) {
        console.error("[AccessTracker] Error:", error);
      }
    };

    trackAccess();
  }, [location.pathname]);
};
