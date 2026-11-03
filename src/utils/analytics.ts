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

/**
 * Retrieve the active GA Measurement ID (from localStorage or default)
 */
export const getActiveGaMeasurementId = (): string => {
  try {
    const saved = localStorage.getItem('teefahs_ga_measurement_id');
    if (saved && saved.trim().length > 3) {
      return saved.trim();
    }
    if (window.GA_MEASUREMENT_ID) {
      return window.GA_MEASUREMENT_ID;
    }
    const envId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
    if (envId && envId.trim().length > 3) {
      return envId.trim();
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_GA_ID;
};

/**
 * Set active GA Measurement ID dynamically
 */
export const setActiveGaMeasurementId = (id: string): void => {
  try {
    const cleaned = id.trim();
    localStorage.setItem('teefahs_ga_measurement_id', cleaned);
    if (typeof window.gtag === 'function' && cleaned) {
      window.gtag('config', cleaned, {
        send_page_view: true,
      });
    }
  } catch (e) {
    console.error('Failed to set GA Measurement ID:', e);
  }
};

/**
 * Safely send a Google Analytics / Ads event
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Google Analytics Event] ${eventName}:`, params);
      }
    } catch (err) {
      console.warn(`[Google Analytics] Failed to emit event ${eventName}:`, err);
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
