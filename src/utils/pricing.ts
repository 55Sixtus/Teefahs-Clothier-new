import { Product, Category } from '../types/product';

/**
 * Standard 10% Promotional Discount Configuration
 * Teefahs Clothier
 */
export const PROMOTION_CONFIG = {
  isEnabled: true,
  discountPercentage: 10, // 10% OFF
  badgeText: '10% OFF',
  // Categories strictly excluded from promotion: Accessories and Caps
  excludedCategorySlugs: ['accessories', 'caps'],
  excludedCategoryNames: ['Accessories', 'Caps'],
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
 * Check whether a category or product is an accessory/cap (excluded from the 10% promotion).
 */
export function isAccessory(product: Partial<Product>, categories?: Category[]): boolean {
  if (!product) return false;

  // Check product name/slug hints
  const slug = (product.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  if (
    slug.includes('pin') || 
    slug.includes('brooch') || 
    slug.includes('jewel') || 
    slug.includes('accessori') ||
    slug.includes('cap')
  ) {
    return true;
  }
  if (
    name.includes('pin') || 
    name.includes('brooch') || 
    name.includes('accessories') ||
    name.includes('cap')
  ) {
    return true;
  }

  // Check category
  if (categories && product.category_id) {
    const cat = categories.find(c => c.id === product.category_id);
    if (cat) {
      const catSlug = cat.slug.toLowerCase();
      const catName = cat.name.toLowerCase();
      if (
        catSlug === 'accessories' || 
        catName === 'accessories' ||
        catSlug === 'caps' || 
        catName === 'caps'
      ) {
        return true;
      }
    }
  }

  return false;
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
