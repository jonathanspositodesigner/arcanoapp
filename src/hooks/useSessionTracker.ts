import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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

const getOrCreateSession = (): { sessionId: string; isNew: boolean } => {
  const storedSession = sessionStorage.getItem("tracking_session_id");
  const lastActivityStr = sessionStorage.getItem("tracking_last_activity");
  const now = Date.now();

  // Check if session exists and is still valid (within 30 min timeout)
  if (storedSession && lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity < SESSION_TIMEOUT_MS) {
      // Session still valid, update last activity
      sessionStorage.setItem("tracking_last_activity", now.toString());
      return { sessionId: storedSession, isNew: false };
    }
  }

  // Create new session (either no session exists or it expired)
  const newSessionId = generateSessionId();
  sessionStorage.setItem("tracking_session_id", newSessionId);
  sessionStorage.setItem("tracking_last_activity", now.toString());
  return { sessionId: newSessionId, isNew: true };
};

export const useSessionTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const enteredAtRef = useRef<Date | null>(null);
  const sessionRecordIdRef = useRef<string | null>(null);
  const hasRecordedSession = useRef<boolean>(false);

  useEffect(() => {
    // Get or create session with 30-min timeout logic
    const { sessionId, isNew } = getOrCreateSession();
    sessionIdRef.current = sessionId;

    // Only record a new session entry if this is a new session
    if (isNew && !hasRecordedSession.current) {
      hasRecordedSession.current = true;
      enteredAtRef.current = new Date();
      
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;

      // Record session entry (one record per session)
      const recordEntry = async () => {
        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            page_path: location.pathname, // First page visited
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
    } else {
      // For existing sessions, just update last activity
      sessionStorage.setItem("tracking_last_activity", Date.now().toString());
    }
  }, []); // Only run once on mount

  // Update duration periodically for the session
  useEffect(() => {
    if (!sessionRecordIdRef.current || !enteredAtRef.current) return;

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
      // Also update last activity timestamp
      sessionStorage.setItem("tracking_last_activity", Date.now().toString());
    }, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateDuration();
      } else {
        // User came back - update last activity
        sessionStorage.setItem("tracking_last_activity", Date.now().toString());
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
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
  }, [sessionRecordIdRef.current]);

  return sessionIdRef.current;
};

export default useSessionTracker;
