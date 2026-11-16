// Google Analytics & Google Ads Event Tracking for Teefahs Clothier
// Synchronized with gtag.js in index.html for ad performance tracking and e-commerce insights

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

export const DEFAULT_GA_ID = 'G-TEEFAHS2026';
const GA_MEASUREMENT_ID_PATTERN = /^(G|AW|GT)-[A-Z0-9]{6,16}$/i;
const GA_MEASUREMENT_ID_EXTRACT = /\b(G|AW|GT)-[A-Z0-9]{6,16}\b/i;

export const isValidGaMeasurementId = (id: string): boolean => {
  return GA_MEASUREMENT_ID_PATTERN.test(id.trim());
};

const extractGaMeasurementId = (raw?: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().toUpperCase().match(GA_MEASUREMENT_ID_EXTRACT);
  return match ? match[0] : null;
};

const isAdminPath = (): boolean => {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
};

/**
 * Retrieve the active validated GA Measurement ID (from localStorage, env, or default)
 */
export const getActiveGaMeasurementId = (): string => {
  try {
    const saved = extractGaMeasurementId(localStorage.getItem('teefahs_ga_measurement_id'));
    if (saved) return saved;

    const winId = extractGaMeasurementId(window.GA_MEASUREMENT_ID);
    if (winId) return winId;

    const envId = extractGaMeasurementId((import.meta as any).env?.VITE_GA_MEASUREMENT_ID);
    if (envId) return envId;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_GA_ID;
};

/**
 * Initialize Google Analytics on public storefront routes (skipped on /admin/*)
 */
export const initializeAnalytics = (): void => {
  if (typeof window === 'undefined' || isAdminPath()) return;
  try {
    const activeId = getActiveGaMeasurementId();
    if (
      activeId !== DEFAULT_GA_ID &&
      !document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${activeId}"]`)
    ) {
      const gtagScript = document.createElement('script');
      gtagScript.async = true;
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${activeId}`;
      document.head.appendChild(gtagScript);
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
    }
    window.gtag('js', new Date());
    window.gtag('config', activeId, {
      page_path: window.location.pathname,
      send_page_view: true,
    });
  } catch {
    // ignore analytics errors
  }
};

/**
 * Set active GA Measurement ID dynamically with strict format validation
 */
export const setActiveGaMeasurementId = (id: string): boolean => {
  const cleaned = id.trim().toUpperCase();
  if (!isValidGaMeasurementId(cleaned)) {
    return false;
  }
  try {
    localStorage.setItem('teefahs_ga_measurement_id', cleaned);
    if (!isAdminPath() && typeof window.gtag === 'function') {
      window.gtag('config', cleaned, {
        send_page_view: true,
      });
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Safely send a Google Analytics / Ads event (suppressed on /admin/* routes)
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (isAdminPath()) return;
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch {
      // analytics optional
    }
  }
};

/**
 * Track SPA Route Pageview
 */
export const trackPageView = (pageTitle?: string, pagePath?: string) => {
  const currentPath = pagePath || (window.location.pathname + window.location.search);
  const currentTitle = pageTitle || document.title;
  const measurementId = getActiveGaMeasurementId();

  trackEvent('page_view', {
    page_title: currentTitle,
    page_location: window.location.href,
    page_path: currentPath,
    send_to: measurementId,
  });
};

/**
 * Track Product View (GA4 E-commerce view_item)
 */
export const trackProductView = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  trackEvent('view_item', {
    currency: 'NGN',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || 'Modest Wear',
        price: product.price,
        quantity: 1,
      },
    ],
  });
};

/**
 * Track Add to Cart (GA4 E-commerce add_to_cart)
 */
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  size?: string;
  color?: string;
  category?: string;
}) => {
  const qty = product.quantity || 1;
  trackEvent('add_to_cart', {
    currency: 'NGN',
    value: product.price * qty,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || 'Modest Wear',
        item_variant: [product.size, product.color].filter(Boolean).join(' / ') || undefined,
        price: product.price,
        quantity: qty,
      },
    ],
  });
};

/**
 * Track Begin Checkout (GA4 E-commerce begin_checkout)
 */
export const trackBeginCheckout = (
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalAmount: number
) => {
  trackEvent('begin_checkout', {
    currency: 'NGN',
    value: totalAmount,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

/**
 * Track WhatsApp Inquiries & Conversion Orders (Google Ads Ad Performance)
 */
export const trackWhatsAppConversion = (action: string, metadata: Record<string, any> = {}) => {
  trackEvent('contact_whatsapp', {
    event_category: 'Lead Generation',
    event_label: action,
    ...metadata,
  });

  // Google Ads conversion lead event
  trackEvent('generate_lead', {
    currency: 'NGN',
    value: metadata.value || 0,
    lead_type: 'whatsapp_order',
    ...metadata,
  });
};
