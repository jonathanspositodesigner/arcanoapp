import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/deviceUtils";

/**
 * Simple access tracker - records ONE access per device per day
 * SIMPLIFIED: Always tries to insert, uses DB to prevent true duplicates
 */
export const useAccessTracker = () => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Log immediately to confirm hook is running
    console.log("[AccessTracker] ========== HOOK MOUNTED ==========");
    console.log("[AccessTracker] User Agent:", navigator.userAgent);
    console.log("[AccessTracker] Screen:", window.innerWidth, "x", window.innerHeight);
    console.log("[AccessTracker] Touch:", 'ontouchstart' in window);
    
    if (hasTrackedRef.current) {
      console.log("[AccessTracker] Already tracked in this session, skipping");
      return;
    }

    const trackAccess = async () => {
      try {
        // 1. Detect device type
        const deviceType = getDeviceType();
        const today = new Date().toISOString().split("T")[0];
        const storageKey = `access_tracked_${deviceType}_${today}`;

        console.log("[AccessTracker] Device detected:", deviceType);
        console.log("[AccessTracker] Today:", today);

        // 2. Check localStorage (but don't rely on it completely)
        let alreadyTracked = false;
        try {
          alreadyTracked = localStorage.getItem(storageKey) === "true";
          console.log("[AccessTracker] localStorage check:", alreadyTracked);
        } catch (e) {
          console.log("[AccessTracker] localStorage unavailable");
        }

        if (alreadyTracked) {
          console.log("[AccessTracker] Skipping - already tracked today");
          hasTrackedRef.current = true;
          return;
        }

        // 3. Generate session ID and INSERT
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log("[AccessTracker] INSERTING NOW...");
        console.log("[AccessTracker] Data:", {
          session_id: sessionId,
          page_path: window.location.pathname,
          device_type: deviceType,
        });

        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            page_path: window.location.pathname,
            device_type: deviceType,
            user_agent: navigator.userAgent,
            entered_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          console.error("[AccessTracker] INSERT FAILED:", error.message);
          console.error("[AccessTracker] Full error:", JSON.stringify(error));
          return;
        }

        console.log("[AccessTracker] ✅ SUCCESS! ID:", data.id);

        // 4. Mark in localStorage
        try {
          localStorage.setItem(storageKey, "true");
        } catch (e) {
          // Ignore localStorage errors
        }

        hasTrackedRef.current = true;
      } catch (e) {
        console.error("[AccessTracker] EXCEPTION:", e);
      }
    };

    // Execute immediately
    trackAccess();
  }, []);
};

export default useAccessTracker;
