import { useState } from 'react';
import { ShoppingBag, Eye, Check, Play, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Category, Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import ProductModal from './ProductModal';
import { trackAddToCart } from '../utils/analytics';
import { calculateProductPricing, findMatchingVariation } from '../utils/pricing';

const COLOR_HEX_FALLBACK: Record<string, string> = {
  black: '#171717',
  white: '#fafaf9',
  cream: '#f5f5dc',
  beige: '#d6c6b2',
  brown: '#5c4033',
  chocolate: '#4a2c2a',
  navy: '#1e293b',
  blue: '#1d4ed8',
  teal: '#0f766e',
  emerald: '#065f46',
  green: '#166534',
  olive: '#4d5d2f',
  burgundy: '#6b1d2f',
  wine: '#722f37',
  maroon: '#661a24',
  pink: '#db7093',
  rose: '#be123c',
  purple: '#581c87',
  grey: '#71717a',
  gray: '#71717a',
  gold: '#b45309',
};

function resolveSwatchHex(colourName: string, explicitHex?: string): string {
  if (explicitHex && /^#[0-9a-f]{3,8}$/i.test(explicitHex.trim())) return explicitHex;
  const lower = colourName.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_HEX_FALLBACK)) {
    if (lower.includes(key)) return hex;
  }
  return '#a8a29e';
}

export default function ProductCard({
  product,
  categories,
}: {
  product: Product;
  categories?: Category[];
}) {
  const { addToCart } = useCart();
  const { formatDisplayPrice } = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const variations = (product.variations || []).filter((v) => v.is_active !== false);
  const hasVariations = variations.length > 0;
  const sizes = Array.from(new Set(variations.map((v) => v.size).filter(Boolean))) as string[];

  const colourMap = new Map<string, string>();
  variations.forEach((v) => {
    if (v.colour && !colourMap.has(v.colour)) {
      colourMap.set(v.colour, resolveSwatchHex(v.colour, v.colour_hex));
    }
  });
  const colours = Array.from(colourMap.entries());

  const defaultSize = sizes[0] || 'To Confirm';
  const defaultColour = colours[0]?.[0] || 'As Pictured';
  const defaultVar = findMatchingVariation(product, sizes[0], colours[0]?.[0]);

  const pricing = calculateProductPricing(product, categories, { variation: defaultVar });
  const priceDisplay = formatDisplayPrice(pricing.sellingPrice);

  const totalStock = variations.reduce(
    (sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0),
    0
  );
  const isOutOfStock = hasVariations && totalStock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      product,
      selectedSize: defaultSize,
      selectedColour: defaultColour,
      quantity: 1,
    });
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: pricing.sellingPrice,
      quantity: 1,
      size: defaultSize,
      color: defaultColour,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const categoryObj = categories?.find(
    (c) => c.id === product.category_id || c.slug === product.category_id
  );

  const imageSrc =
    !imgError && product.main_image_url
      ? product.main_image_url
      : !imgError && product.images?.[0]?.image_url
        ? product.images[0].image_url
        : '';

  const hoverImageSrc =
    !imgError
      ? product.images?.find((img) => img.image_url && img.image_url !== imageSrc)?.image_url || ''
      : '';

  return (
    <>
      <article className="flex flex-col group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-md transition-all duration-300">
        {/* Uncropped Full-Garment Image Link */}
        <Link
          to={`/product/${product.slug || product.id}`}
          className="aspect-[3/4] bg-stone-100/80 dark:bg-stone-950 relative overflow-hidden flex items-center justify-center p-2"
        >
          {imageSrc ? (
            <>
              <img
                src={imageSrc}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className={`w-full h-full object-contain transition-all duration-500 ease-out ${
                  hoverImageSrc ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
                }`}
                loading="lazy"
              />
              {hoverImageSrc && (
                <img
                  src={hoverImageSrc}
                  alt={`${product.name} — Alternate View`}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-stone-400 dark:text-stone-600 text-center px-4">
              <ImageOff size={28} strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-widest font-medium">
                Photo Unavailable
              </span>
            </div>
          )}

          {/* Slide-Up Quick View Bar on Hover */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowModal(true);
            }}
            className="absolute inset-x-0 bottom-0 z-20 py-2.5 bg-stone-900/90 dark:bg-amber-400/95 text-white dark:text-stone-950 text-[11px] font-semibold uppercase tracking-[0.18em] text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out cursor-pointer"
          >
            Quick View
          </button>

          {/* Single subtle top-left corner status */}
          {(pricing.hasDiscount || product.is_new_arrival) && (
            <div className="absolute top-2.5 left-2.5 z-10">
              {pricing.hasDiscount ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white">
                  {pricing.discountPercentage}% OFF
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-900 text-white">
                  New
                </span>
              )}
            </div>
          )}

          {/* Video indicator when video exists */}
          {product.video_url && (
            <div
              className="absolute bottom-2.5 right-2.5 z-10 bg-stone-950/75 text-white px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-200"
              title="Product video available"
            >
              <Play size={10} className="fill-current" />
              <span>Video</span>
            </div>
          )}
        </Link>

        {/* Details & Actions */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1.5">
            {categoryObj && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400 block">
                {categoryObj.name}
                {product.country_of_origin ? ` · ${product.country_of_origin}` : ''}
              </span>
            )}

            <Link
              to={`/product/${product.slug || product.id}`}
              className="block text-sm md:text-[15px] font-serif text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-emerald-800 dark:group-hover:text-amber-300 transition-colors"
            >
              {product.name}
            </Link>

            {/* Swatches & Typographic Sizes */}
            {(colours.length > 0 || sizes.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {colours.length > 0 && (
                  <div className="flex items-center gap-1" title={colours.map((c) => c[0]).join(', ')}>
                    {colours.slice(0, 4).map(([colName, hex]) => (
                      <span
                        key={colName}
                        className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 inline-block"
                        style={{ backgroundColor: hex }}
                        title={colName}
                      />
                    ))}
                    {colours.length > 4 && (
                      <span className="text-[10px] text-stone-400">+{colours.length - 4}</span>
                    )}
                  </div>
                )}
                {colours.length > 0 && sizes.length > 0 && (
                  <span className="text-stone-300 dark:text-stone-700">·</span>
                )}
                {sizes.length > 0 && (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {sizes.slice(0, 4).join(' / ')}
                    {sizes.length > 4 ? ` +${sizes.length - 4}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
            <div className="flex items-baseline justify-between gap-2 tabular-nums">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    {priceDisplay.primaryNgn}
                  </span>
                  {pricing.hasDiscount && (
                    <span className="text-xs text-stone-400 line-through font-light">
                      {pricing.formattedOriginalPrice}
                    </span>
                  )}
                </div>
                {priceDisplay.indicativeForeign && (
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                    {priceDisplay.indicativeForeign}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                  isOutOfStock
                    ? 'text-red-600 dark:text-red-400'
                    : hasVariations && totalStock < 5
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-800 dark:text-emerald-400'
                }`}
              >
                {isOutOfStock
                  ? 'Sold Out'
                  : hasVariations && totalStock < 5
                    ? `${totalStock} Left`
                    : hasVariations
                      ? 'In Stock'
                      : 'Available'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleQuickAdd}
                className={`py-2 px-2 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  isOutOfStock
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                    : isAdded
                      ? 'bg-emerald-800 text-white cursor-pointer'
                      : 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 cursor-pointer'
                }`}
              >
                {isOutOfStock ? (
                  <span>Sold Out</span>
                ) : isAdded ? (
                  <>
                    <Check size={13} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={13} />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Eye size={13} />
                <span>Quick View</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {showModal && (
        <ProductModal
          product={product}
          categories={categories}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
