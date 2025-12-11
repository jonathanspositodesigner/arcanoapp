/**
 * Shared device detection utility - IMPROVED VERSION
 * Uses multiple detection methods for maximum reliability
 */

export const getDeviceType = (): "mobile" | "desktop" => {
  // 1. Check touch capability first (most reliable for mobile)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 2. Check user agent with EXPANDED patterns
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'mobi', 'android', 'iphone', 'ipad', 'ipod', 'webos', 
    'blackberry', 'iemobile', 'opera mini', 'windows phone',
    'mobile safari', 'samsung', 'lg-', 'htc', 'nokia', 
    'silk', 'kindle', 'fennec', 'arm', 'touch'
  ];
  
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  if (isMobileUA) {
    console.log("[DeviceUtils] Mobile detected via user agent");
    return "mobile";
  }
  
  // 3. Small screen + touch = definitely mobile
  if (hasTouch && window.innerWidth <= 1024) {
    console.log("[DeviceUtils] Mobile detected via touch + screen width");
    return "mobile";
  }
  
  // 4. Very small screen = mobile regardless
  if (window.innerWidth <= 768) {
    console.log("[DeviceUtils] Mobile detected via small screen");
    return "mobile";
  }
  
  // 5. Check orientation API (mobile devices support this)
  if (typeof window.orientation !== 'undefined') {
    console.log("[DeviceUtils] Mobile detected via orientation API");
    return "mobile";
  }
  
  console.log("[DeviceUtils] Desktop detected");
  return "desktop";
};

export const isMobileDevice = (): boolean => {
  return getDeviceType() === "mobile";
};
