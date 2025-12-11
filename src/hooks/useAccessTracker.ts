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
        console.log(`[AccessTracker] Storage key: ${storageKey}`);

        // 2. Check if already tracked today for this device
        let alreadyTracked = false;
        try {
          alreadyTracked = localStorage.getItem(storageKey) === "true";
          console.log(`[AccessTracker] Already tracked today: ${alreadyTracked}`);
        } catch (e) {
          console.log("[AccessTracker] localStorage not available, proceeding anyway");
        }

        if (alreadyTracked) {
          console.log(`[AccessTracker] Already tracked ${deviceType} access today, skipping`);
          hasTrackedRef.current = true;
          return;
        }

        // 3. Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const userAgent = navigator.userAgent;
        const pagePath = window.location.pathname;

        console.log(`[AccessTracker] Recording new ${deviceType} access...`);
        console.log(`[AccessTracker] Session ID: ${sessionId}`);
        console.log(`[AccessTracker] Page: ${pagePath}`);
        console.log(`[AccessTracker] User Agent: ${userAgent.substring(0, 50)}...`);

        // 4. Insert into database
        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            page_path: pagePath,
            device_type: deviceType,
            user_agent: userAgent,
            entered_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          console.error("[AccessTracker] ERROR inserting:", error.message);
          console.error("[AccessTracker] Error details:", JSON.stringify(error));
          return;
        }

        console.log(`[AccessTracker] SUCCESS! Recorded ${deviceType} access with ID: ${data.id}`);

        // 5. Mark as tracked for today
        try {
          localStorage.setItem(storageKey, "true");
          console.log(`[AccessTracker] Marked as tracked in localStorage`);
        } catch (e) {
          console.log("[AccessTracker] Could not save to localStorage");
        }

        hasTrackedRef.current = true;
      } catch (e) {
        console.error("[AccessTracker] EXCEPTION:", e);
      }
    };

    // Execute immediately
    console.log("[AccessTracker] Hook mounted, starting tracking...");
    trackAccess();
  }, []);
};

export default useAccessTracker;
