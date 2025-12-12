/**
 * Device detection utility - matches Lovable Analytics methodology
 * Prioritizes user agent detection for consistency
 */

export const getDeviceType = (): "mobile" | "desktop" => {
  const userAgent = navigator.userAgent;
  
  // Same patterns that Lovable Analytics uses
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
    /Opera Mini/i,
    /IEMobile/i
  ];
  
  const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));
  
  if (isMobile) {
    console.log("[DeviceUtils] Mobile detected via user agent");
    return "mobile";
  }
  
  console.log("[DeviceUtils] Desktop detected");
  return "desktop";
};

export const isMobileDevice = (): boolean => {
  return getDeviceType() === "mobile";
};
