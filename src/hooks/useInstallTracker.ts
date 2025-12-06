import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
};

export const useInstallTracker = () => {
  useEffect(() => {
    const handleAppInstalled = async () => {
      const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
      const userAgent = navigator.userAgent;

      console.log(`App installed on ${deviceType}`);

      try {
        const { error } = await supabase
          .from('app_installations')
          .insert({
            device_type: deviceType,
            user_agent: userAgent,
          });

        if (error) {
          console.error('Error tracking installation:', error);
        } else {
          console.log('Installation tracked successfully');
        }
      } catch (err) {
        console.error('Failed to track installation:', err);
      }
    };

    // Listen for the appinstalled event (fires when PWA is installed)
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
};
