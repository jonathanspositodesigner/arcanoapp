import { useState, useEffect } from 'react';

interface CurrencyConversion {
  localCurrency: string;
  localPrice: number;
  formattedLocalPrice: string;
  loading: boolean;
}

const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  AR: { code: 'ARS', symbol: 'ARS' },
  CO: { code: 'COP', symbol: 'COP' },
  MX: { code: 'MXN', symbol: 'MXN' },
  CL: { code: 'CLP', symbol: 'CLP' },
  PE: { code: 'PEN', symbol: 'PEN' },
  BR: { code: 'BRL', symbol: 'BRL' },
  UY: { code: 'UYU', symbol: 'UYU' },
  PY: { code: 'PYG', symbol: 'PYG' },
  BO: { code: 'BOB', symbol: 'BOB' },
  EC: { code: 'USD', symbol: 'USD' },
  VE: { code: 'VES', symbol: 'VES' },
  CR: { code: 'CRC', symbol: 'CRC' },
  GT: { code: 'GTQ', symbol: 'GTQ' },
  HN: { code: 'HNL', symbol: 'HNL' },
  NI: { code: 'NIO', symbol: 'NIO' },
  PA: { code: 'USD', symbol: 'USD' },
  DO: { code: 'DOP', symbol: 'DOP' },
  SV: { code: 'USD', symbol: 'USD' },
};

const CACHE_KEY = 'currency_conversion_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CacheData {
  country: string;
  rates: Record<string, number>;
  timestamp: number;
}

const getCache = (): CacheData | null => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CacheData = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCache = (data: CacheData) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
};

const formatLocalPrice = (price: number, currencyCode: string): string => {
  // Currencies with no decimals
  const noDecimalCurrencies = ['CLP', 'COP', 'PYG', 'VES', 'CRC', 'GTQ'];
  
  if (noDecimalCurrencies.includes(currencyCode) || price >= 1000) {
    return Math.round(price).toLocaleString('es');
  }
  return price.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const useCurrencyConversion = (priceUSD: number): CurrencyConversion | null => {
  const [result, setResult] = useState<CurrencyConversion | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchConversion = async () => {
      try {
        const cached = getCache();
        let country: string;
        let rates: Record<string, number>;

        if (cached) {
          country = cached.country;
          rates = cached.rates;
        } else {
          // Fetch country
          const geoRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
          if (!geoRes.ok) return;
          const geoData = await geoRes.json();
          country = geoData.country_code;

          // Fetch rates
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
          if (!rateRes.ok) return;
          const rateData = await rateRes.json();
          rates = rateData.rates;

          setCache({ country, rates, timestamp: Date.now() });
        }

        if (cancelled) return;

        const currencyInfo = COUNTRY_CURRENCY_MAP[country];
        if (!currencyInfo || currencyInfo.code === 'USD') return;

        const rate = rates[currencyInfo.code];
        if (!rate) return;

        const localPrice = priceUSD * rate;

        setResult({
          localCurrency: currencyInfo.code,
          localPrice,
          formattedLocalPrice: formatLocalPrice(localPrice, currencyInfo.code),
          loading: false,
        });
      } catch {
        // Graceful fallback - don't show conversion
      }
    };

    fetchConversion();
    return () => { cancelled = true; };
  }, [priceUSD]);

  return result;
};
