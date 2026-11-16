import { Product, Category, ProductVariation } from '../types/product';

/**
 * Storefront Pricing & Discount Configuration
 * Teefahs Clothier
 *
 * Rules:
 * - Supabase `products.base_price` is ALWAYS the authoritative base selling price.
 * - Optional variation overrides (`variation.price_override`) or adjustments
 *   (`variation.price_adjustment`) apply dynamically when a variation is selected.
 * - Optional original / pre-discount strike-through price comes strictly from
 *   `product.sale_price` when `sale_price > sellingPrice` (never hardcoded by slug).
 * - Accessories (Hijabs, Veils, Khimars, Caps, Accessories) never display discount badges.
 */
export const PROMOTION_CONFIG = {
  isEnabled: true,
  eligibleCategorySlugs: ['abayas', 'occasion-wear', 'prayer-wear', 'workwear', 'work-wear'],
  eligibleCategoryNames: ['Abayas', 'Occasion Wear', 'Prayer Wear', 'Workwear', 'WORK WEAR'],
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

  if (categories && product.category_id) {
    const cat = categories.find((c) => c.id === product.category_id || c.slug === product.category_id);
    if (cat) {
      const catSlug = (cat.slug || '').toLowerCase();
      const catName = (cat.name || '').toLowerCase();

      if (
        PROMOTION_CONFIG.excludedCategorySlugs.includes(catSlug) ||
        PROMOTION_CONFIG.excludedCategoryNames.some((n) => n.toLowerCase() === catName)
      ) {
        return true;
      }

      if (
        PROMOTION_CONFIG.eligibleCategorySlugs.includes(catSlug) ||
        PROMOTION_CONFIG.eligibleCategoryNames.some((n) => n.toLowerCase() === catName)
      ) {
        return EXCLUDED_KEYWORDS.some((kw) => name.includes(kw));
      }
    }
  }

  if (EXCLUDED_KEYWORDS.some((kw) => name.includes(kw) || slug.includes(kw))) {
    return true;
  }

  const eligibleKeywords = ['abaya', 'dress', 'gown', 'kimono', 'kaftan', 'coord', 'robe', 'workwear', 'set'];
  if (eligibleKeywords.some((kw) => name.includes(kw) || slug.includes(kw))) {
    return false;
  }

  return true;
}

export function isEligibleForPromotion(product: Partial<Product>, categories?: Category[]): boolean {
  return !isAccessory(product, categories);
}

export function findMatchingVariation(
  product?: Partial<Product> | null,
  selectedSize?: string,
  selectedColour?: string
): ProductVariation | undefined {
  const variations = product?.variations || [];
  if (variations.length === 0) return undefined;

  return variations.find((v) => {
    const sizeMatch =
      !v.size ||
      !selectedSize ||
      v.size.trim().toLowerCase() === selectedSize.trim().toLowerCase();
    const colourMatch =
      !v.colour ||
      !selectedColour ||
      v.colour.trim().toLowerCase() === selectedColour.trim().toLowerCase();
    return sizeMatch && colourMatch;
  });
}

/**
 * Authoritative selling price calculation.
 * `base_price` from Supabase is used directly, plus optional variation override/adjustment.
 */
export function calculateProductPricing(
  product: Partial<Product>,
  categories?: Category[],
  options?: { disablePromotion?: boolean; variation?: ProductVariation | null }
): ProductPricing {
  const basePrice = Math.max(0, Math.round(Number(product?.base_price) || 0));
  const variation = options?.variation;

  let sellingPrice = basePrice;
  if (variation) {
    if (variation.price_override !== null && variation.price_override !== undefined && Number.isFinite(Number(variation.price_override))) {
      sellingPrice = Math.max(0, Math.round(Number(variation.price_override)));
    } else if (Number.isFinite(Number(variation.price_adjustment)) && Number(variation.price_adjustment) !== 0) {
      sellingPrice = Math.max(0, Math.round(basePrice + Number(variation.price_adjustment)));
    }
  }

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
