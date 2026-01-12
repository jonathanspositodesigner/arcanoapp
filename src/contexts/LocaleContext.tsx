import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Locale = 'pt' | 'es';
type Currency = 'BRL' | 'USD';

interface LocaleContextType {
  locale: Locale;
  currency: Currency;
  isLatam: boolean;
  setLocale: (locale: Locale) => void;
  formatPrice: (valueBRL: number | null | undefined, valueUSD?: number | null) => string;
  getPrice: (valueBRL: number | null | undefined, valueUSD?: number | null) => number | null;
  getCheckoutLink: (linkBR: string | null | undefined, linkLatam?: string | null) => string | null;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const getLocaleFromSubdomain = (): Locale => {
  if (typeof window === 'undefined') return 'pt';
  
  const hostname = window.location.hostname;
  
  // Check for es. subdomain
  if (hostname.startsWith('es.')) {
    return 'es';
  }
  
  return 'pt';
};

const getLocaleFromNavigator = (): Locale => {
  if (typeof navigator === 'undefined') return 'pt';
  
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Spanish speaking countries
  if (langCode === 'es') {
    return 'es';
  }
  
  return 'pt';
};

const detectLocale = (): Locale => {
  // Priority: subdomain > navigator
  const subdomainLocale = getLocaleFromSubdomain();
  if (subdomainLocale === 'es') {
    return 'es';
  }
  
  // Fallback to navigator if not on es. subdomain
  // But only on the main domain (not es. subdomain)
  const hostname = window.location.hostname;
  if (!hostname.startsWith('es.')) {
    return getLocaleFromNavigator();
  }
  
  return 'pt';
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>('pt');
  
  useEffect(() => {
    const detectedLocale = detectLocale();
    setLocaleState(detectedLocale);
    i18n.changeLanguage(detectedLocale);
  }, [i18n]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    i18n.changeLanguage(newLocale);
  };

  const currency: Currency = locale === 'es' ? 'USD' : 'BRL';
  const isLatam = locale === 'es';

  const formatPrice = (valueBRL: number | null | undefined, valueUSD?: number | null): string => {
    if (isLatam) {
      const value = valueUSD ?? valueBRL;
      if (value == null) return '$0.00';
      return `$${value.toFixed(2)}`;
    } else {
      if (valueBRL == null) return 'R$ 0,00';
      return `R$ ${valueBRL.toFixed(2).replace('.', ',')}`;
    }
  };

  const getPrice = (valueBRL: number | null | undefined, valueUSD?: number | null): number | null => {
    if (isLatam) {
      return valueUSD ?? valueBRL ?? null;
    }
    return valueBRL ?? null;
  };

  const getCheckoutLink = (linkBR: string | null | undefined, linkLatam?: string | null): string | null => {
    if (isLatam && linkLatam) {
      return linkLatam;
    }
    return linkBR ?? null;
  };

  const value = useMemo(() => ({
    locale,
    currency,
    isLatam,
    setLocale,
    formatPrice,
    getPrice,
    getCheckoutLink,
  }), [locale, currency, isLatam]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
