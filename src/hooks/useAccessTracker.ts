import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/deviceUtils";

/**
 * Simple access tracker - records ONE access per device per day
 * No complex session logic - just counts accesses
 */
export const useAccessTracker = () => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple tracking calls
    if (hasTrackedRef.current) {
      console.log("[AccessTracker] Already tracked in this render, skipping");
      return;
    }

    const trackAccess = async () => {
      try {
        // 1. Detect device type
        const deviceType = getDeviceType();
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const storageKey = `access_tracked_${deviceType}_${today}`;

        console.log(`[AccessTracker] Device: ${deviceType}, Date: ${today}`);

        // 2. Check if already tracked today for this device
        let alreadyTracked = false;
        try {
          alreadyTracked = localStorage.getItem(storageKey) === "true";
        } catch {
          // localStorage might not be available
        }

        if (alreadyTracked) {
          console.log(`[AccessTracker] Already tracked ${deviceType} access today, skipping`);
          hasTrackedRef.current = true;
          return;
        }

        // 3. Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const userAgent = navigator.userAgent;

        console.log(`[AccessTracker] Recording new ${deviceType} access...`);

        // 4. Insert into database
        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            page_path: window.location.pathname,
            device_type: deviceType,
            user_agent: userAgent,
            entered_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          console.error("[AccessTracker] ERROR inserting:", error.message);
          return;
        }

        console.log(`[AccessTracker] SUCCESS! Recorded ${deviceType} access with ID: ${data.id}`);

        // 5. Mark as tracked for today
        try {
          localStorage.setItem(storageKey, "true");
        } catch {
          // localStorage might not be available
        }

        hasTrackedRef.current = true;
      } catch (e) {
        console.error("[AccessTracker] EXCEPTION:", e);
      }
    };

    trackAccess();
  }, []);
};

export default useAccessTracker;
