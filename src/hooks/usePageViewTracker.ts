import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAccessTracker } from "./useAccessTracker";

export const usePageViewTracker = () => {
  const location = useLocation();
  
  // Simple access tracker - records one access per device per day
  useAccessTracker();

  // Update last activity on any navigation (for potential future use)
  useEffect(() => {
    try {
      localStorage.setItem("tracking_last_activity", Date.now().toString());
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, [location.pathname]);
};

export default usePageViewTracker;
