import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSessionTracker } from "./useSessionTracker";

export const usePageViewTracker = () => {
  const location = useLocation();
  
  // Use the session tracker - it handles all tracking logic now
  useSessionTracker();

  // Update last activity on any navigation
  useEffect(() => {
    sessionStorage.setItem("tracking_last_activity", Date.now().toString());
  }, [location.pathname]);
};

export default usePageViewTracker;
