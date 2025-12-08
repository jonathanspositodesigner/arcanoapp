import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getDeviceType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|tablet/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
};

export const useSessionTracker = (pagePath: string) => {
  const sessionIdRef = useRef<string | null>(null);
  const enteredAtRef = useRef<Date | null>(null);
  const sessionRecordIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get or create session ID for this visit
    let sessionId = sessionStorage.getItem("tracking_session_id");
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem("tracking_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;
    enteredAtRef.current = new Date();

    const deviceType = getDeviceType();
    const userAgent = navigator.userAgent;

    // Record session entry
    const recordEntry = async () => {
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

      if (!error && data) {
        sessionRecordIdRef.current = data.id;
      }
    };

    recordEntry();

    // Update duration on visibility change or unload
    const updateDuration = async () => {
      if (!sessionRecordIdRef.current || !enteredAtRef.current) return;

      const now = new Date();
      const durationSeconds = Math.round((now.getTime() - enteredAtRef.current.getTime()) / 1000);

      await supabase
        .from("user_sessions")
        .update({
          exited_at: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", sessionRecordIdRef.current);
    };

    // Heartbeat every 30 seconds to update duration
    const heartbeat = setInterval(() => {
      updateDuration();
    }, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateDuration();
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      if (!sessionRecordIdRef.current || !enteredAtRef.current) return;

      const now = new Date();
      const durationSeconds = Math.round((now.getTime() - enteredAtRef.current.getTime()) / 1000);

      // Use sendBeacon for reliable unload tracking
      const payload = JSON.stringify({
        exited_at: now.toISOString(),
        duration_seconds: durationSeconds,
      });

      // Note: sendBeacon doesn't work with Supabase client, so we use the update method
      // This may not always succeed on page unload, but heartbeat + visibilitychange should cover most cases
      updateDuration();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateDuration();
    };
  }, [pagePath]);

  return sessionIdRef.current;
};

export default useSessionTracker;
