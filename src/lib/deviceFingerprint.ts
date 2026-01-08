// Gera um fingerprint único para identificar o dispositivo
export function generateFingerprint(): string {
  const components: string[] = [];
  
  // User Agent
  components.push(navigator.userAgent);
  
  // Screen resolution
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Language
  components.push(navigator.language);
  
  // Platform
  components.push(navigator.platform);
  
  // Concatena e gera hash simples
  const raw = components.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36) + Date.now().toString(36).slice(-4);
}

export function getDeviceFingerprint(): string {
  const storageKey = 'admin_device_fp';
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    return stored;
  }
  
  const fp = generateFingerprint();
  localStorage.setItem(storageKey, fp);
  return fp;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Detecta browser
  let browser = 'Navegador';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  }
  
  // Detecta OS
  let os = '';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'Mac';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }
  
  return os ? `${browser} no ${os}` : browser;
}
