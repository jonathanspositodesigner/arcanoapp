/**
 * Shared device detection utility
 * Used by both useInstallTracker and useSessionTracker for consistency
 */

export const getDeviceType = (): "mobile" | "desktop" => {
  const userAgent = navigator.userAgent;
  
  // Check user agent for mobile patterns
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
  if (mobileRegex.test(userAgent)) {
    return "mobile";
  }
  
  // Check screen width as fallback for PWA installed on mobile
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return "mobile";
  }
  
  // Check if running as standalone PWA on mobile
  if (typeof window !== 'undefined') {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isSmallScreen = window.innerWidth <= 768;
    if (isStandalone && isSmallScreen) {
      return "mobile";
    }
  }
  
  return "desktop";
};

export const isMobileDevice = (): boolean => {
  return getDeviceType() === "mobile";
};
