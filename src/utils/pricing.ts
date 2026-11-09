import { Product, Category } from '../types/product';

/**
 * Standard 10% Promotional Discount Configuration
 * Teefahs Clothier
 */
export const PROMOTION_CONFIG = {
  isEnabled: true,
  discountPercentage: 10, // 10% OFF
  badgeText: '10% OFF',
  // Strictly eligible categories: dresses and abayas only
  eligibleCategorySlugs: ['abayas', 'occasion-wear', 'prayer-wear'],
  eligibleCategoryNames: ['Abayas', 'Occasion Wear', 'Prayer Wear'],
  // Excluded categories per owner explicit instruction: Hijabs, Veils, Khimars, Caps, Accessories
  excludedCategorySlugs: ['hijabs', 'veils', 'khimars', 'caps', 'accessories'],
  excludedCategoryNames: ['Hijabs', 'Veils', 'Khimars', 'Caps', 'Accessories'],
};

export interface ProductPricing {
  originalPrice: number;
  sellingPrice: number;
  discountAmount: number;
  hasDiscount: boolean;
  discountPercentage: number;
  formattedOriginalPrice: string;
  formattedSellingPrice: string;
  formattedDiscountAmount: string;
}

/**
 * Check whether a product is eligible for the 10% promotion.
 * Rule: ONLY dresses / abayas / occasion gowns / prayer dresses are eligible.
 * Hijabs, veils, khimars, caps, and accessories are strictly EXCLUDED.
 */
export function isEligibleForPromotion(product: Partial<Product>, categories?: Category[]): boolean {
  if (!product) return false;

  const slug = (product.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();

  // Explicitly check for excluded terms in name/slug
  if (
    slug.includes('hijab') ||
    slug.includes('veil') ||
    slug.includes('khimar') ||
    slug.includes('cap') ||
    slug.includes('pin') ||
    slug.includes('brooch') ||
    slug.includes('jewel') ||
    slug.includes('accessori')
  ) {
    return false;
  }

  if (
    name.includes('hijab') ||
    name.includes('veil') ||
    name.includes('khimar') ||
    name.includes('cap') ||
    name.includes('pin') ||
    name.includes('brooch') ||
    name.includes('accessories')
  ) {
    return false;
  }

  // Check category if available
  if (categories && product.category_id) {
    const cat = categories.find(c => c.id === product.category_id);
    if (cat) {
      const catSlug = cat.slug.toLowerCase();
      const catName = cat.name.toLowerCase();

      // Check if explicitly excluded category
      if (PROMOTION_CONFIG.excludedCategorySlugs.includes(catSlug) || 
          PROMOTION_CONFIG.excludedCategoryNames.some(n => n.toLowerCase() === catName)) {
        return false;
      }

      // Check if explicitly eligible category
      if (PROMOTION_CONFIG.eligibleCategorySlugs.includes(catSlug) || 
          PROMOTION_CONFIG.eligibleCategoryNames.some(n => n.toLowerCase() === catName)) {
        return true;
      }
    }
  }

  // Fallback to name/slug match for dresses / abayas / gowns / kimonos / kaftans / coords
  if (
    name.includes('abaya') ||
    name.includes('dress') ||
    name.includes('gown') ||
    name.includes('kimono') ||
    name.includes('kaftan') ||
    name.includes('coord') ||
    name.includes('robe') ||
    slug.includes('abaya') ||
    slug.includes('dress') ||
    slug.includes('gown') ||
    slug.includes('kimono') ||
    slug.includes('kaftan') ||
    slug.includes('coord') ||
    slug.includes('robe')
  ) {
    return true;
  }

  return false;
}

/**
 * Backward compatibility helper
 */
export function isAccessory(product: Partial<Product>, categories?: Category[]): boolean {
  return !isEligibleForPromotion(product, categories);
}

/**
 * Calculate the verified pricing for any product, enforcing the 10% promotional discount rules.
 *
 * Rules:
 * - Original price must be displayed with a strikethrough.
 * - Discounted price must be displayed as the main selling price.
 * - Visible "10% OFF" badge.
 * - Accessories are strictly EXCLUDED.
 * - Discount amount = Original price * 0.10
 * - Discounted price = Original price - Discount amount (rounded integer-safe)
 * - Never reverses original and selling prices.
 */
export function calculateProductPricing(
  product: Partial<Product>,
  categories?: Category[],
  options?: { disablePromotion?: boolean }
): ProductPricing {
  const originalPrice = Math.max(0, Math.round(Number(product?.base_price) || 0));

  // Determine if eligible for 10% promo
  const promoAllowed = !options?.disablePromotion && PROMOTION_CONFIG.isEnabled;
  const isExcluded = isAccessory(product, categories);

  if (!promoAllowed || isExcluded || originalPrice <= 0) {
    return {
      originalPrice,
      sellingPrice: originalPrice,
      discountAmount: 0,
      hasDiscount: false,
      discountPercentage: 0,
      formattedOriginalPrice: `₦${originalPrice.toLocaleString()}`,
      formattedSellingPrice: `₦${originalPrice.toLocaleString()}`,
      formattedDiscountAmount: `₦0`,
    };
  }

  // Calculate 10% discount
  // Discount amount = Original price * 0.10
  const discountAmount = Math.round(originalPrice * 0.10);
  const sellingPrice = originalPrice - discountAmount;

  return {
    originalPrice,
    sellingPrice,
    discountAmount,
    hasDiscount: true,
    discountPercentage: 10,
    formattedOriginalPrice: `₦${originalPrice.toLocaleString()}`,
    formattedSellingPrice: `₦${sellingPrice.toLocaleString()}`,
    formattedDiscountAmount: `₦${discountAmount.toLocaleString()}`,
  };
}
