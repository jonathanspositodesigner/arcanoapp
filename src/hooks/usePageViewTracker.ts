import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const detectDeviceType = (): "mobile" | "desktop" => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "webos",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "mobile",
  ];
  return mobileKeywords.some((keyword) => userAgent.includes(keyword))
    ? "mobile"
    : "desktop";
};

export const usePageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        await supabase.from("page_views").insert({
          page_path: location.pathname,
          user_agent: navigator.userAgent,
          device_type: detectDeviceType(),
        });
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};
