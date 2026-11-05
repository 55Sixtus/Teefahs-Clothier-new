import { useState } from 'react';
import { ShoppingBag, Eye, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { SUPPLIED_PHOTOS } from '../data/assets';
import ProductModal from './ProductModal';
import { trackAddToCart } from '../utils/analytics';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Extract sizes and colours from variations
  const sizes = Array.from(new Set(product.variations?.map(v => v.size).filter(Boolean))) as string[];
  const colours = Array.from(new Set(product.variations?.map(v => v.colour).filter(Boolean))) as string[];
  const totalStock = (product.variations || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalStock <= 0) return;
    addToCart({
      product,
      selectedSize: sizes[0] || 'Standard',
      selectedColour: colours[0] || 'Original',
      quantity: 1,
    });
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: product.base_price || 0,
      quantity: 1,
      size: sizes[0] || 'Standard',
      color: colours[0] || 'Original',
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const imageSrc = !imgError && product.main_image_url
    ? product.main_image_url
    : product.images?.[0]?.image_url || SUPPLIED_PHOTOS[0];

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className="flex flex-col group bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-sm overflow-hidden hover:shadow-xl dark:hover:border-stone-700 transition-all duration-300 cursor-pointer"
      >
        {/* Product Image Frame */}
        <div className="aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
          <img
            src={imageSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.is_new_arrival && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-800 text-white shadow-sm">
                New Arrival
              </span>
            )}
            {product.is_featured && !product.is_new_arrival && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-700 text-white shadow-sm">
                Featured
              </span>
            )}
          </div>

          {/* Stock Tag on Image */}
          {totalStock > 0 && totalStock < 5 && (
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-red-800/90 text-white shadow-sm">
                Only {totalStock} Left
              </span>
            </div>
          )}
        </div>

        {/* Card Content & Visible Actions */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3 className="text-sm md:text-[15px] font-medium text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-emerald-800 dark:group-hover:text-amber-300 transition-colors">
              {product.name}
            </h3>

            {product.short_description && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-1 mb-2 leading-relaxed font-light">
                {product.short_description}
              </p>
            )}

            {/* Sizing & Colours Badges */}
            <div className="flex flex-wrap items-center gap-1.5 my-1.5">
              {sizes.slice(0, 3).map((sz) => (
                <span key={sz} className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded">
                  {sz}
                </span>
              ))}
              {sizes.length > 3 && (
                <span className="text-[10px] px-1 text-stone-400 dark:text-stone-500">+{sizes.length - 3}</span>
              )}
              {colours.slice(0, 2).map((col) => (
                <span key={col} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-transparent dark:border-emerald-800/40">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Pricing & Stock Status */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  ₦{product.base_price ? product.base_price.toLocaleString() : 'Enquire'}
                </span>
                {product.sale_price && (
                  <span className="text-xs text-stone-400 line-through ml-2 font-light">
                    ₦{product.sale_price.toLocaleString()}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                {totalStock > 0 ? 'In Stock' : 'Pre-Order'}
              </span>
            </div>

            {/* Always-Visible Shopping Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  if (totalStock <= 0) {
                    e.stopPropagation();
                    setShowModal(true);
                  } else {
                    handleQuickAdd(e);
                  }
                }}
                className={`py-2 px-2 text-[11px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                  totalStock <= 0
                    ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60'
                    : isAdded
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 font-bold'
                }`}
              >
                {totalStock <= 0 ? (
                  <>
                    <ShoppingBag size={13} className="text-amber-400" />
                    <span>Pre-Order</span>
                  </>
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(true);
                }}
                className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider rounded-xs border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye size={13} />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Modal with Angle Grid & Placeholders */}
      {showModal && (
        <ProductModal product={product} isOpen={showModal} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
