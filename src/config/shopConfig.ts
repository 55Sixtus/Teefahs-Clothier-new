// Official Store and Business Configuration for Teefahs Clothier
// Central business truth used across storefront, cart, contact, and WhatsApp flows

export const SHOP_CONFIG = {
  brandName: 'Teefahs Clothier',
  tagline: 'Timeless Modesty & Grace',
  currencySymbol: '₦',
  currencyCode: 'NGN',

  // Official Verified WhatsApp Contact
  whatsappDisplay: '+234 802 899 1921',
  whatsappNumber: '2348028991921',
  whatsappChatUrl: 'https://wa.me/2348028991921',

  // Official Verified Email Address
  email: 'queenlateefalive@yahoo.com',

  // Physical Store Address
  address: '165 Ekoro Road, Ekoro Junction, Abule Egba, Ikeja, Lagos, Nigeria.',
  city: 'Lagos',
  country: 'Nigeria',

  // Google Maps Integration
  mapsEmbedUrl: 'https://www.google.com/maps?q=165%20Ekoro%20Road%2C%20Ekoro%20Junction%2C%20Abule%20Egba%2C%20Ikeja%2C%20Lagos%2C%20Nigeria&output=embed',
  mapsDirectionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=165%20Ekoro%20Road%2C%20Ekoro%20Junction%2C%20Abule%20Egba%2C%20Ikeja%2C%20Lagos%2C%20Nigeria',

  // Official Web & Social Channels
  officialWebsite: 'https://teefahsclothier.bumpa.shop',
  instagramHandle: '@teefahs_clothier',
  instagramUrl: 'https://instagram.com/teefahs_clothier',

  // Customer Care Hours
  businessHours: 'Monday – Saturday: 8:00 AM – 8:00 PM (WAT)',
};

/**
 * Returns the active WhatsApp checkout destination digits.
 * Defaults to the verified 2348028991921.
 */
export const getActiveWhatsAppChatNumber = (): string => {
  try {
    const custom = localStorage.getItem('teefahs_whatsapp_checkout_number');
    if (custom && custom.trim().length >= 10) {
      return custom.trim().replace(/[^0-9]/g, '');
    }
  } catch (e) {
    console.warn('Error reading custom whatsapp number:', e);
  }
  return SHOP_CONFIG.whatsappNumber;
};

export const setActiveWhatsAppChatNumber = (number: string): void => {
  try {
    const cleaned = number.replace(/[^0-9]/g, '');
    localStorage.setItem('teefahs_whatsapp_checkout_number', cleaned);
  } catch (e) {
    console.error('Error saving whatsapp checkout number:', e);
  }
};
