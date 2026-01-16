import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import ptCommon from '@/locales/pt/common.json';
import ptPlans from '@/locales/pt/plans.json';
import ptLibrary from '@/locales/pt/library.json';
import ptAuth from '@/locales/pt/auth.json';
import ptPrompts from '@/locales/pt/prompts.json';
import ptIndex from '@/locales/pt/index.json';
import ptTools from '@/locales/pt/tools.json';

import esCommon from '@/locales/es/common.json';
import esPlans from '@/locales/es/plans.json';
import esLibrary from '@/locales/es/library.json';
import esAuth from '@/locales/es/auth.json';
import esPrompts from '@/locales/es/prompts.json';
import esIndex from '@/locales/es/index.json';
import esTools from '@/locales/es/tools.json';

const resources = {
  pt: {
    common: ptCommon,
    plans: ptPlans,
    library: ptLibrary,
    auth: ptAuth,
    prompts: ptPrompts,
    index: ptIndex,
    tools: ptTools,
  },
  es: {
    common: esCommon,
    plans: esPlans,
    library: esLibrary,
    auth: esAuth,
    prompts: esPrompts,
    index: esIndex,
    tools: esTools,
  },
};

// LATAM domains configuration
const LATAM_DOMAINS = [
  'arcanoappes.voxvisual.com.br',
];

// Custom detector for subdomain
const subdomainDetector = {
  name: 'subdomain',
  lookup() {
    if (typeof window === 'undefined') return 'pt';
    
    // Check URL parameter first (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam === 'es') {
      console.log('[i18n] Forced to ES via URL param');
      return 'es';
    }
    if (langParam === 'pt') {
      console.log('[i18n] Forced to PT via URL param');
      return 'pt';
    }
    
    const hostname = window.location.hostname;
    console.log('[i18n] Hostname detected:', hostname);
    
    // Check for specific LATAM domain
    const isLatamDomain = LATAM_DOMAINS.some(domain => hostname.includes(domain));
    console.log('[i18n] Is LATAM domain:', isLatamDomain);
    
    if (isLatamDomain) {
      console.log('[i18n] Returning ES for LATAM domain');
      return 'es';
    }
    
    // Legacy: Check for es. subdomain
    if (hostname.startsWith('es.')) {
      console.log('[i18n] Returning ES for es. subdomain');
      return 'es';
    }
    
    return undefined; // Let other detectors handle it
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(subdomainDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    defaultNS: 'common',
    ns: ['common', 'plans', 'library', 'auth', 'prompts', 'index', 'tools'],
    
    detection: {
      order: ['subdomain', 'navigator', 'htmlTag'],
      caches: [],
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
