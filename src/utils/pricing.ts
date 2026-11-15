import { Product, Category } from '../types/product';

/**
 * Storefront Pricing & Discount Configuration
 * Teefahs Clothier
 *
 * Rules:
 * - Supabase `products.base_price` is ALWAYS the authoritative selling price.
 * - Optional original / pre-discount strike-through price comes strictly from
 *   `product.sale_price` when `sale_price > base_price` (never hardcoded by slug).
 * - Accessories (Hijabs, Veils, Khimars, Caps, Accessories) never display discount badges.
 */
export const PROMOTION_CONFIG = {
  isEnabled: true,
  eligibleCategorySlugs: ['abayas', 'occasion-wear', 'prayer-wear'],
  eligibleCategoryNames: ['Abayas', 'Occasion Wear', 'Prayer Wear'],
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

const EXCLUDED_KEYWORDS = ['hijab', 'veil', 'khimar', 'cap', 'pin', 'brooch', 'jewel', 'accessori'];

/**
 * Determine whether a product is an accessory/headwear excluded from promotional discount UI.
 */
export function isAccessory(product: Partial<Product>, categories?: Category[]): boolean {
  if (!product) return true;

  const name = (product.name || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();

  // Check category first when category metadata is available
  if (categories && product.category_id) {
    const cat = categories.find(c => c.id === product.category_id || c.slug === product.category_id);
    if (cat) {
      const catSlug = (cat.slug || '').toLowerCase();
      const catName = (cat.name || '').toLowerCase();

      if (
        PROMOTION_CONFIG.excludedCategorySlugs.includes(catSlug) ||
        PROMOTION_CONFIG.excludedCategoryNames.some(n => n.toLowerCase() === catName)
      ) {
        return true;
      }

      // If category is explicitly eligible (e.g., Abayas, Occasion Wear, Prayer Wear),
      // only exclude if the product's own display name explicitly denotes headwear/accessories.
      if (
        PROMOTION_CONFIG.eligibleCategorySlugs.includes(catSlug) ||
        PROMOTION_CONFIG.eligibleCategoryNames.some(n => n.toLowerCase() === catName)
      ) {
        return EXCLUDED_KEYWORDS.some(kw => name.includes(kw));
      }
    }
  }

  // Fallback when category metadata isn't available
  if (EXCLUDED_KEYWORDS.some(kw => name.includes(kw) || slug.includes(kw))) {
    return true;
  }

  const eligibleKeywords = ['abaya', 'dress', 'gown', 'kimono', 'kaftan', 'coord', 'robe'];
  if (eligibleKeywords.some(kw => name.includes(kw) || slug.includes(kw))) {
    return false;
  }

  return true;
}

export function isEligibleForPromotion(product: Partial<Product>, categories?: Category[]): boolean {
  return !isAccessory(product, categories);
}

/**
 * Authoritative selling price calculation.
 * `base_price` from Supabase is used directly without secret multipliers.
 * If `sale_price` (stored as optional original strike-through price) is higher than `base_price`,
 * the discount badge & savings are computed dynamically for non-accessory items.
 */
export function calculateProductPricing(
  product: Partial<Product>,
  categories?: Category[],
  options?: { disablePromotion?: boolean }
): ProductPricing {
  const sellingPrice = Math.max(0, Math.round(Number(product?.base_price) || 0));
  const rawOriginal = Number(product?.sale_price);
  const hasHigherOriginal =
    Number.isFinite(rawOriginal) && Math.round(rawOriginal) > sellingPrice && sellingPrice > 0;

  const promoAllowed = !options?.disablePromotion && PROMOTION_CONFIG.isEnabled;
  const excluded = isAccessory(product, categories);

  if (!promoAllowed || excluded || !hasHigherOriginal) {
    return {
      originalPrice: sellingPrice,
      sellingPrice,
      discountAmount: 0,
      hasDiscount: false,
      discountPercentage: 0,
      formattedOriginalPrice: `₦${sellingPrice.toLocaleString()}`,
      formattedSellingPrice: `₦${sellingPrice.toLocaleString()}`,
      formattedDiscountAmount: `₦0`,
    };
  }

  const originalPrice = Math.round(rawOriginal);
  const discountAmount = originalPrice - sellingPrice;
  const discountPercentage = Math.max(1, Math.round((discountAmount / originalPrice) * 100));

  return {
    originalPrice,
    sellingPrice,
    discountAmount,
    hasDiscount: true,
    discountPercentage,
    formattedOriginalPrice: `₦${originalPrice.toLocaleString()}`,
    formattedSellingPrice: `₦${sellingPrice.toLocaleString()}`,
    formattedDiscountAmount: `₦${discountAmount.toLocaleString()}`,
  };
}
