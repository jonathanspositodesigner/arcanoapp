import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type TutorialEventType = 
  | "started" 
  | "step_1_completed" 
  | "step_2_completed" 
  | "step_3_completed" 
  | "completed" 
  | "skipped";

const getDeviceType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|tablet/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
};

export const useTutorialTracker = () => {
  const trackEvent = useCallback(async (eventType: TutorialEventType, stepId?: number) => {
    const sessionId = sessionStorage.getItem("tracking_session_id") || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure session ID exists
    if (!sessionStorage.getItem("tracking_session_id")) {
      sessionStorage.setItem("tracking_session_id", sessionId);
    }

    const deviceType = getDeviceType();

    try {
      await supabase.from("tutorial_events").insert({
        session_id: sessionId,
        event_type: eventType,
        step_id: stepId,
        device_type: deviceType,
      });
    } catch (error) {
      console.error("Error tracking tutorial event:", error);
    }
  }, []);

  return { trackEvent };
};

export default useTutorialTracker;
