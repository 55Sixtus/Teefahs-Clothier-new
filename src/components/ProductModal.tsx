import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Check,
  ShoppingBag,
  MessageCircle,
  Eye,
  Sparkles,
  Maximize2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Category, Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { SUPPLIED_PHOTOS } from '../data/assets';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';
import { trackProductView, trackAddToCart, trackWhatsAppConversion } from '../utils/analytics';
import { calculateProductPricing } from '../utils/pricing';
import { getProductById, getActiveCategories } from '../lib/api';
import { supabase } from '../lib/supabase';

export interface ProductModalProps {
  product: Product | null;
  categories?: Category[];
  isOpen?: boolean;
  onClose: () => void;
}

interface GallerySlot {
  key: string;
  title: string;
  image: string;
}

export default function ProductModal({
  product,
  categories,
  isOpen = true,
  onClose,
}: ProductModalProps) {
  const { addToCart } = useCart();
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product);
  const [activeCategories, setActiveCategories] = useState<Category[]>(categories || []);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [selectedImageKey, setSelectedImageKey] = useState<string>('0');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    setCurrentProduct(product);
    setIsUnavailable(false);
    setSelectedImageKey('0');
    setSelectedSize('');
    setSelectedColour('');
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setActiveCategories(categories);
    }
  }, [categories]);

  const syncModalProduct = useCallback(async () => {
    if (!product?.id) return;
    try {
      const [fresh, cats] = await Promise.all([
        getProductById(product.id),
        categories && categories.length > 0 ? Promise.resolve(categories) : getActiveCategories(),
      ]);
      setActiveCategories(cats);
      if (fresh && fresh.is_published && !fresh.is_archived && !fresh.deleted_at) {
        setCurrentProduct(fresh);
        setIsUnavailable(false);
      } else {
        setIsUnavailable(true);
      }
    } catch (err) {
      console.error('Failed to sync open modal product:', err);
    }
  }, [product?.id, categories]);

  // Direct cross-device Supabase Realtime + local catalogue sync while modal is open
  useEffect(() => {
    if (!isOpen || !product?.id) return;

    syncModalProduct();

    const handleCatalogueUpdate = () => {
      syncModalProduct();
    };
    window.addEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);

    const channelName = `modal-product-${product.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        syncModalProduct();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, () => {
        syncModalProduct();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, () => {
        syncModalProduct();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        syncModalProduct();
      })
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
      supabase.removeChannel(channel);
    };
  }, [isOpen, product?.id, syncModalProduct]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, onClose]);

  // Track product view on load
  useEffect(() => {
    if (isOpen && product) {
      const cat = activeCategories.find(
        c => c.id === product.category_id || c.slug === product.category_id
      );
      trackProductView({
        id: product.id,
        name: product.name,
        price: product.base_price || 0,
        category: cat?.name || 'Modest Wear',
      });
    }
  }, [isOpen, product?.id]);

  const activeProduct: Product | null = currentProduct || product;
  const variations = activeProduct?.variations || [];
  const hasVariations = variations.length > 0;

  const sizes = Array.from(
    new Set(variations.map(v => v.size).filter(Boolean) as string[])
  );
  const colours = Array.from(
    new Set(variations.map(v => v.colour).filter(Boolean) as string[])
  );

  const currentSize = sizes.length > 0
    ? (selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes[0])
    : 'To Confirm';
  const currentColour = colours.length > 0
    ? (selectedColour && colours.includes(selectedColour) ? selectedColour : colours[0])
    : 'As Pictured';

  const totalStock = variations.reduce(
    (acc, v) => acc + Math.max(0, Number(v.stock_quantity) || 0),
    0
  );
  const matchingVariation = variations.find(
    v => (!v.size || v.size === currentSize) && (!v.colour || v.colour === currentColour)
  );
  const variationStock = hasVariations
    ? (matchingVariation ? Math.max(0, Number(matchingVariation.stock_quantity) || 0) : totalStock)
    : 20;
  const isOutOfStock = isUnavailable || (hasVariations && variationStock <= 0);

  useEffect(() => {
    if (variationStock > 0 && quantity > variationStock) {
      setQuantity(variationStock);
    } else if (variationStock > 0 && quantity < 1) {
      setQuantity(1);
    }
  }, [variationStock, quantity]);

  if (!activeProduct || !isOpen) return null;

  const pricing = calculateProductPricing(activeProduct, activeCategories);
  const categoryObj = activeCategories.find(
    c => c.id === activeProduct.category_id || c.slug === activeProduct.category_id
  );

  // 1. Resolve product primary image
  const primaryImage =
    activeProduct.main_image_url ||
    (activeProduct.images && activeProduct.images[0]?.image_url) ||
    (activeProduct.additionalImages && activeProduct.additionalImages[0]) ||
    SUPPLIED_PHOTOS[0];

  // 2. Resolve genuine images strictly belonging to this product
  const productImagesList: string[] = [];
  if (primaryImage) productImagesList.push(primaryImage);

  if (activeProduct.additionalImages && Array.isArray(activeProduct.additionalImages)) {
    activeProduct.additionalImages.forEach(url => {
      if (url && typeof url === 'string' && !productImagesList.includes(url)) {
        productImagesList.push(url);
      }
    });
  }

  if (activeProduct.images && Array.isArray(activeProduct.images)) {
    activeProduct.images.forEach(imgObj => {
      const url = typeof imgObj === 'string' ? imgObj : imgObj?.image_url;
      if (url && typeof url === 'string' && !productImagesList.includes(url)) {
        productImagesList.push(url);
      }
    });
  }

  // 3. Construct Gallery Slots belonging ONLY to this product with neutral, truthful labels
  const gallerySlots: GallerySlot[] = productImagesList.map((url, idx) => {
    let title = `Photograph ${idx + 1}`;
    if (idx === 0) {
      title = productImagesList.length > 1 ? 'Primary View' : 'Garment Photograph';
    } else {
      title = `View ${idx + 1}`;
    }

    return {
      key: `${idx}`,
      title,
      image: url,
    };
  });

  const currentSlotIndex = parseInt(selectedImageKey, 10);
  const activeSlot = gallerySlots[currentSlotIndex] || gallerySlots[0];
  const activeDisplayImage = activeSlot?.image || primaryImage;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const addedQty = Math.min(variationStock, Math.max(1, quantity));
    addToCart({
      product: activeProduct,
      selectedSize: currentSize,
      selectedColour: currentColour,
      quantity: addedQty,
    });
    trackAddToCart({
      id: activeProduct.id,
      name: activeProduct.name,
      price: pricing.sellingPrice,
      quantity: addedQty,
      size: currentSize,
      color: currentColour,
      category: categoryObj?.name || 'Modest Wear',
    });
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 750);
  };

  const chatNumber = getActiveWhatsAppChatNumber();
  const priceDisplayNote = pricing.hasDiscount
    ? `₦${pricing.sellingPrice.toLocaleString()} (${pricing.discountPercentage}% OFF from ₦${pricing.originalPrice.toLocaleString()})`
    : `₦${pricing.sellingPrice.toLocaleString()}`;

  const whatsappMessage = encodeURIComponent(
    `Assalamu Alaikum Teefahs Clothier! I am viewing:\n\n*${activeProduct.name}*\nPrice: ${priceDisplayNote}\nSize: ${currentSize}\nColour: ${currentColour}\n\nCould you please confirm availability and order details?`
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl rounded-xs overflow-hidden my-4 transition-all"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Close Bar */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <Link
              to={`/product/${activeProduct.slug || activeProduct.id}`}
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white bg-white/90 dark:bg-stone-800/90 rounded-full shadow-md transition-colors inline-flex items-center gap-1"
              title="Open Full Product Page"
            >
              <span>Full Page</span>
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white bg-white/90 dark:bg-stone-800/90 rounded-full shadow-md transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[92vh] overflow-y-auto">
            {/* Left 7 Columns: Product Views Grid Showcase */}
            <div className="lg:col-span-7 bg-stone-50 dark:bg-stone-950 p-4 sm:p-6 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-stone-800">
              {/* Main Preview with Lightbox trigger */}
              <div className="relative aspect-[3/4] w-full max-h-[440px] sm:max-h-[500px] overflow-hidden bg-stone-100 dark:bg-stone-900 shadow-sm border border-stone-200/70 dark:border-stone-800 rounded-xs group">
                <img
                  src={activeDisplayImage}
                  alt={`${activeProduct.name} - ${activeSlot?.title || 'View'}`}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />

                {/* Active Photo Badge */}
                <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-sm text-stone-100 text-xs px-3 py-1.5 rounded-xs flex items-center gap-2 border border-stone-700/60 shadow">
                  <Sparkles size={13} className="text-amber-400" />
                  <span className="font-medium tracking-wide">{activeSlot?.title || 'Photograph'}</span>
                  {gallerySlots.length > 1 && (
                    <span className="text-[10px] text-stone-300">
                      ({currentSlotIndex + 1} of {gallerySlots.length})
                    </span>
                  )}
                </div>

                {/* Lightbox / Zoom Button */}
                <button
                  type="button"
                  onClick={() => setLightboxImage(activeDisplayImage)}
                  className="absolute top-3 right-3 p-2 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                  title="Expand full screen"
                >
                  <Maximize2 size={16} />
                </button>
              </div>

              {/* Grid View of Genuine Product Photographs */}
              {gallerySlots.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold tracking-wider uppercase text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Eye size={14} className="text-amber-500" />
                      Product Gallery ({gallerySlots.length} Views)
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Click to inspect view
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {gallerySlots.map((slot, idx) => {
                      const isSelected = selectedImageKey === `${idx}`;

                      return (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => setSelectedImageKey(`${idx}`)}
                          className={`relative aspect-[3/4] rounded-xs overflow-hidden border-2 transition-all text-left group cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 ring-2 ring-amber-500/50'
                              : 'border-stone-200 dark:border-stone-700 hover:border-stone-400'
                          }`}
                        >
                          <img
                            src={slot.image}
                            alt={slot.title}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 pt-3">
                            <p className="text-[10px] font-medium text-white truncate leading-tight">
                              {slot.title}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Product Information & Purchase Controls */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {pricing.hasDiscount && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-amber-600 text-white rounded-xs">
                      {pricing.discountPercentage}% OFF PROMOTION
                    </span>
                  )}
                  {activeProduct.is_new_arrival && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-800 text-white rounded-xs">
                      New Collection
                    </span>
                  )}
                  {activeProduct.is_featured && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-stone-900 text-white rounded-xs">
                      Featured
                    </span>
                  )}
                </div>

                {isUnavailable && (
                  <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xs font-medium">
                    This garment was just unpublished or archived and is no longer available for purchase.
                  </div>
                )}

                <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-white leading-tight">
                  {activeProduct.name}
                </h1>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 my-3.5">
                  <span className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-amber-300">
                    {pricing.formattedSellingPrice}
                  </span>
                  {pricing.hasDiscount && (
                    <span className="text-base line-through text-stone-400 dark:text-stone-500 font-light">
                      {pricing.formattedOriginalPrice}
                    </span>
                  )}
                </div>

                {pricing.hasDiscount && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-3">
                    You save {pricing.formattedDiscountAmount} ({pricing.discountPercentage}% promotional discount applied)
                  </p>
                )}

                {/* Description */}
                <div className="text-sm text-stone-600 dark:text-stone-300 py-3 border-t border-b border-stone-100 dark:border-stone-800 my-4 leading-relaxed font-light">
                  {activeProduct.description ||
                    activeProduct.short_description ||
                    'Specifications, fabric notes & measurements awaiting owner update. Inquire via WhatsApp for full garment details.'}
                </div>

                {/* Size Selector */}
                {sizes.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                        Size: <strong className="text-stone-900 dark:text-amber-300 font-bold">{currentSize}</strong>
                      </span>
                      <span className="text-[11px] text-stone-400">Modest length &amp; chest fit</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-1.5 text-xs font-medium border rounded-xs transition-colors cursor-pointer ${
                            currentSize === sz
                              ? 'border-amber-500 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold'
                              : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-400'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Colour Selector */}
                {colours.length > 0 ? (
                  <div className="mb-4">
                    <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Colour: <strong className="text-stone-900 dark:text-amber-300 font-bold">{currentColour}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colours.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColour(col)}
                          className={`px-3 py-1.5 text-xs font-medium border rounded-xs transition-colors cursor-pointer ${
                            currentColour === col
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-semibold'
                              : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-400'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {sizes.length === 0 && colours.length === 0 && (
                  <div className="mb-4 p-2.5 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xs text-[11px] text-stone-600 dark:text-stone-300">
                    Sizes &amp; colour options are awaiting owner update — your fit will be confirmed on order via WhatsApp.
                  </div>
                )}

                {/* Quantity & Stock Status */}
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="px-3 py-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-medium">
                      {isOutOfStock ? 0 : quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(variationStock, quantity + 1))}
                      disabled={quantity >= variationStock || isOutOfStock}
                      className="px-3 py-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isOutOfStock
                        ? 'text-red-600 dark:text-red-400'
                        : hasVariations && variationStock < 5
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isUnavailable
                      ? 'Unavailable'
                      : isOutOfStock
                      ? 'Out of Stock'
                      : !hasVariations
                      ? 'Available (Confirm fit on order)'
                      : variationStock < 5
                      ? `Low Stock (${variationStock} left)`
                      : `In Stock (${variationStock} available)`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-stone-500 text-xs mb-5">
                  <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Authentic Teefahs Clothier tailoring &amp; nationwide delivery.</span>
                </div>
              </div>

              {/* Secure Customer Actions */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-xs shadow-sm ${
                    isOutOfStock
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 cursor-pointer'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>{isUnavailable ? 'Unavailable' : 'Out of Stock'}</span>
                  ) : addedNotice ? (
                    <>
                      <Check size={16} className="text-emerald-400 dark:text-stone-950" />
                      Added to Shopping Bag!
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      Add to Bag (₦{(pricing.sellingPrice * quantity).toLocaleString()})
                    </>
                  )}
                </button>

                <a
                  href={`https://wa.me/${chatNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackWhatsAppConversion('inquire_whatsapp', {
                      product_id: activeProduct.id,
                      product_name: activeProduct.name,
                      value: pricing.sellingPrice,
                    });
                  }}
                  className="w-full py-3 border border-emerald-700 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-xs"
                >
                  <MessageCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Order / Inquire via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox full-size image viewer */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen View"
            className="max-h-[95vh] max-w-[95vw] object-contain rounded-xs shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
