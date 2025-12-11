import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { getDeviceType } from "@/lib/deviceUtils";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_STORAGE_KEY = "tracking_session_id";
const SESSION_ACTIVITY_KEY = "tracking_last_activity";
const SESSION_RECORDED_KEY = "tracking_session_recorded";
const SESSION_RECORD_ID_KEY = "tracking_session_record_id";

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Use localStorage as fallback for mobile browsers where sessionStorage can be unreliable
const getStorage = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  } catch {
    // Silently fail
  }
};

const removeStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
};

const getOrCreateSession = (): { sessionId: string; isNew: boolean; alreadyRecorded: boolean; recordId: string | null } => {
  const storedSession = getStorage(SESSION_STORAGE_KEY);
  const lastActivityStr = getStorage(SESSION_ACTIVITY_KEY);
  const wasRecorded = getStorage(SESSION_RECORDED_KEY) === "true";
  const storedRecordId = getStorage(SESSION_RECORD_ID_KEY);
  const now = Date.now();

  // Check if session exists and is still valid (within 30 min timeout)
  if (storedSession && lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity < SESSION_TIMEOUT_MS) {
      // Session still valid, update last activity
      setStorage(SESSION_ACTIVITY_KEY, now.toString());
      return { sessionId: storedSession, isNew: false, alreadyRecorded: wasRecorded, recordId: storedRecordId };
    }
  }

  // Create new session (either no session exists or it expired)
  const newSessionId = generateSessionId();
  setStorage(SESSION_STORAGE_KEY, newSessionId);
  setStorage(SESSION_ACTIVITY_KEY, now.toString());
  removeStorage(SESSION_RECORDED_KEY);
  removeStorage(SESSION_RECORD_ID_KEY);
  return { sessionId: newSessionId, isNew: true, alreadyRecorded: false, recordId: null };
};

export const useSessionTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const enteredAtRef = useRef<Date | null>(null);
  const sessionRecordIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get or create session with 30-min timeout logic
    const { sessionId, isNew, alreadyRecorded, recordId } = getOrCreateSession();
    sessionIdRef.current = sessionId;

    // If we have a stored record ID from a previous page load, use it
    if (recordId) {
      sessionRecordIdRef.current = recordId;
      enteredAtRef.current = new Date();
    }

    // Only record a new session entry if this is a new session AND not already recorded
    if (isNew && !alreadyRecorded) {
      enteredAtRef.current = new Date();
      
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;

      console.log(`[SessionTracker] New session - Device: ${deviceType}, UserAgent: ${userAgent.substring(0, 50)}...`);

      // Record session entry (one record per session)
      const recordEntry = async () => {
        try {
          const { data, error } = await supabase
            .from("user_sessions")
            .insert({
              session_id: sessionId,
              page_path: location.pathname,
              device_type: deviceType,
              user_agent: userAgent,
              entered_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (error) {
            console.error("[SessionTracker] Insert error:", error);
          } else if (data) {
            console.log(`[SessionTracker] Session recorded: ${data.id} (${deviceType})`);
            sessionRecordIdRef.current = data.id;
            setStorage(SESSION_RECORDED_KEY, "true");
            setStorage(SESSION_RECORD_ID_KEY, data.id);
          }
        } catch (e) {
          console.error("[SessionTracker] Exception:", e);
        }
      };

      recordEntry();
    } else {
      // For existing sessions, just update last activity
      setStorage(SESSION_ACTIVITY_KEY, Date.now().toString());
    }
  }, []); // Only run once on mount

  // Update duration periodically for the session
  useEffect(() => {
    if (!sessionRecordIdRef.current || !enteredAtRef.current) return;

    const updateDuration = async () => {
      if (!sessionRecordIdRef.current || !enteredAtRef.current) return;

      try {
        const now = new Date();
        const durationSeconds = Math.round((now.getTime() - enteredAtRef.current.getTime()) / 1000);

        await supabase
          .from("user_sessions")
          .update({
            exited_at: now.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq("id", sessionRecordIdRef.current);
      } catch (e) {
        // Silently fail
      }
    };

    // Heartbeat every 30 seconds to update duration
    const heartbeat = setInterval(() => {
      updateDuration();
      // Also update last activity timestamp
      setStorage(SESSION_ACTIVITY_KEY, Date.now().toString());
    }, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateDuration();
      } else {
        // User came back - update last activity
        setStorage(SESSION_ACTIVITY_KEY, Date.now().toString());
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
