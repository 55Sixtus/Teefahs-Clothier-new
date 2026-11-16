import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { DeliveryZone } from '../types/order';
import { getPublicDeliveryZones } from '../lib/ordersApi';

export type SupportedCountryCode = 'NG' | 'GB' | 'US' | 'CA' | 'EU' | 'AE';
export type DisplayCurrencyCode = 'NGN' | 'GBP' | 'USD' | 'CAD' | 'EUR';

export interface CountryOption {
  code: SupportedCountryCode;
  name: string;
  regionLabel: string;
  defaultCurrency: DisplayCurrencyCode;
  fallbackTimeline: string;
  fallbackCustomsNote: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    regionLabel: 'Domestic Dispatch (Lagos & Nationwide)',
    defaultCurrency: 'NGN',
    fallbackTimeline: 'Lagos & Nationwide dispatch timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'No domestic customs duties within Nigeria.',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    regionLabel: 'International Inquiries',
    defaultCurrency: 'GBP',
    fallbackTimeline: 'Courier eligibility, quote, and timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'Any applicable import duties or local customs charges are determined by the destination country and payable by the recipient.',
  },
  {
    code: 'US',
    name: 'United States',
    regionLabel: 'International Inquiries',
    defaultCurrency: 'USD',
    fallbackTimeline: 'Courier eligibility, quote, and timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'Any applicable import duties or local customs charges are determined by the destination country and payable by the recipient.',
  },
  {
    code: 'CA',
    name: 'Canada',
    regionLabel: 'International Inquiries',
    defaultCurrency: 'CAD',
    fallbackTimeline: 'Courier eligibility, quote, and timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'Any applicable import duties or local customs charges are determined by the destination country and payable by the recipient.',
  },
  {
    code: 'EU',
    name: 'European Union',
    regionLabel: 'International Inquiries',
    defaultCurrency: 'EUR',
    fallbackTimeline: 'Courier eligibility, quote, and timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'Any applicable import duties or local customs charges are determined by the destination country and payable by the recipient.',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    regionLabel: 'International Inquiries',
    defaultCurrency: 'USD',
    fallbackTimeline: 'Courier eligibility, quote, and timeline confirmed via WhatsApp prior to payment',
    fallbackCustomsNote: 'Any applicable import duties or local customs charges are determined by the destination country and payable by the recipient.',
  },
];

export const CURRENCY_OPTIONS: { code: DisplayCurrencyCode; symbol: string; label: string }[] = [
  { code: 'NGN', symbol: '₦', label: 'NGN (₦) — Base Store Currency' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — Indicative' },
  { code: 'USD', symbol: '$', label: 'USD ($) — Indicative' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$) — Indicative' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Indicative' },
];

export interface FormattedDisplayPrice {
  primaryNgn: string;
  indicativeForeign: string | null;
  currency: DisplayCurrencyCode;
  rateUsed: number | null;
  disclaimer: string | null;
}

interface LocaleContextType {
  country: SupportedCountryCode;
  setCountry: (code: SupportedCountryCode) => void;
  countryInfo: CountryOption;
  displayCurrency: DisplayCurrencyCode;
  setDisplayCurrency: (code: DisplayCurrencyCode) => void;
  fxRates: Record<string, number> | null;
  fxStatus: 'loading' | 'live' | 'unavailable';
  fxUpdatedAt: string | null;
  fxProvider: string;
  deliveryZones: DeliveryZone[];
  activeDeliveryZone: DeliveryZone | null;
  formatDisplayPrice: (ngnAmount: number) => FormattedDisplayPrice;
  refreshDeliveryZones: () => Promise<void>;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const COUNTRY_PREF_KEY = 'teefahs_country_pref_v1';
const CURRENCY_PREF_KEY = 'teefahs_currency_pref_v1';

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<SupportedCountryCode>(() => {
    try {
      const saved = localStorage.getItem(COUNTRY_PREF_KEY) as SupportedCountryCode;
      if (SUPPORTED_COUNTRIES.some((c) => c.code === saved)) return saved;
    } catch {
      // ignore
    }
    return 'NG';
  });

  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_PREF_KEY) as DisplayCurrencyCode;
      if (CURRENCY_OPTIONS.some((c) => c.code === saved)) return saved;
    } catch {
      // ignore
    }
    return 'NGN';
  });

  const [fxRates, setFxRates] = useState<Record<string, number> | null>(null);
  const [fxStatus, setFxStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);

  const setCountry = useCallback((code: SupportedCountryCode) => {
    setCountryState(code);
    try {
      localStorage.setItem(COUNTRY_PREF_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const setDisplayCurrency = useCallback((code: DisplayCurrencyCode) => {
    setDisplayCurrencyState(code);
    try {
      localStorage.setItem(CURRENCY_PREF_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const refreshDeliveryZones = useCallback(async () => {
    try {
      const zones = await getPublicDeliveryZones();
      setDeliveryZones(zones);
    } catch {
      setDeliveryZones([]);
    }
  }, []);

  useEffect(() => {
    refreshDeliveryZones();
  }, [refreshDeliveryZones]);

  // Fetch live NGN conversion rates from public FX endpoint (never fabricate offline numbers)
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('FX endpoint unavailable');
        return res.json();
      })
      .then((data) => {
        if (data?.result === 'success' && data?.rates && typeof data.rates.USD === 'number') {
          setFxRates(data.rates);
          setFxUpdatedAt(data.time_last_update_utc || new Date().toISOString());
          setFxStatus('live');
        } else {
          setFxStatus('unavailable');
        }
      })
      .catch(() => {
        setFxStatus('unavailable');
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const countryInfo =
    SUPPORTED_COUNTRIES.find((c) => c.code === country) || SUPPORTED_COUNTRIES[0];

  const activeDeliveryZone =
    deliveryZones.find((z) => z.country_code.toUpperCase() === country) || null;

  const formatDisplayPrice = useCallback(
    (ngnAmount: number): FormattedDisplayPrice => {
      const cleanNgn = Math.max(0, Math.round(Number(ngnAmount) || 0));
      const primaryNgn = `₦${cleanNgn.toLocaleString()}`;

      if (displayCurrency === 'NGN' || fxStatus !== 'live' || !fxRates) {
        return {
          primaryNgn,
          indicativeForeign: null,
          currency: displayCurrency,
          rateUsed: null,
          disclaimer: null,
        };
      }

      const rate = fxRates[displayCurrency];
      if (!rate || !Number.isFinite(rate) || rate <= 0) {
        return {
          primaryNgn,
          indicativeForeign: null,
          currency: displayCurrency,
          rateUsed: null,
          disclaimer: null,
        };
      }

      const meta = CURRENCY_OPTIONS.find((c) => c.code === displayCurrency);
      const converted = cleanNgn * rate;
      const formattedForeign = `${meta?.symbol || displayCurrency + ' '}${converted.toLocaleString(
        'en-US',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`;

      return {
        primaryNgn,
        indicativeForeign: `Approx. ${formattedForeign}`,
        currency: displayCurrency,
        rateUsed: rate,
        disclaimer: `Base price is ${primaryNgn} (NGN). Converted ${displayCurrency} equivalent is indicative only; final total is confirmed in NGN before payment.`,
      };
    },
    [displayCurrency, fxRates, fxStatus]
  );

  return (
    <LocaleContext.Provider
      value={{
        country,
        setCountry,
        countryInfo,
        displayCurrency,
        setDisplayCurrency,
        fxRates,
        fxStatus,
        fxUpdatedAt,
        fxProvider: 'ExchangeRate-API (open.er-api.com)',
        deliveryZones,
        activeDeliveryZone,
        formatDisplayPrice,
        refreshDeliveryZones,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
};
