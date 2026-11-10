import { useState, useEffect } from 'react';
import { X, Check, ShoppingBag, MessageCircle, Eye, Camera, Sparkles, Maximize2, ShieldCheck, Tag } from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { SUPPLIED_PHOTOS } from '../data/assets';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';
import { trackProductView, trackAddToCart, trackWhatsAppConversion } from '../utils/analytics';
import { calculateProductPricing } from '../utils/pricing';

import { getPublishedProducts } from '../lib/api';

export interface ProductModalProps {
  product: Product | null;
  isOpen?: boolean;
  onClose: () => void;
}

interface GallerySlot {
  key: string;
  title: string;
  image: string;
}

export default function ProductModal({ product, isOpen = true, onClose }: ProductModalProps) {
  const { addToCart } = useCart();
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product);
  const [selectedImageKey, setSelectedImageKey] = useState<string>('0');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  // Real-time synchronization while modal is open
  useEffect(() => {
    if (!product?.id) return;
    const handleCatalogueUpdate = () => {
      getPublishedProducts()
        .then(prods => {
          const fresh = prods.find(p => p.id === product.id);
          if (fresh) {
            setCurrentProduct(fresh);
          }
        })
        .catch(err => console.error('Failed to sync open modal product:', err));
    };
    window.addEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
    return () => window.removeEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
  }, [product?.id]);

  // Close on Escape key
  useEffect(() => {
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
  }, [lightboxImage, onClose]);

  // Track product view on load
  useEffect(() => {
    if (product) {
      trackProductView({
        id: product.id,
        name: product.name,
        price: product.base_price || 0,
        category: (product as any).category?.name || 'Modest Wear',
      });
      setSelectedImageKey('0');
    }
  }, [product?.id]);

  if (!product || !isOpen) return null;

  const activeProduct: Product = currentProduct || product;
  const pricing = calculateProductPricing(activeProduct);

  // 1. Resolve product primary image
  const primaryImage = activeProduct.main_image_url || 
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
    // If only 1 image, label it Primary View
    // If multiple, label View 1, View 2, etc. (never invent front/back/side without verified angle data)
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

  // Find active focused gallery image
  const currentSlotIndex = parseInt(selectedImageKey, 10);
  const activeSlot = gallerySlots[currentSlotIndex] || gallerySlots[0];
  const activeDisplayImage = activeSlot?.image || primaryImage;

  // Variations: sizes and colours
  const rawSizes = product.variations?.map(v => v.size).filter(Boolean) as string[] | undefined;
  const sizes = Array.from(new Set(rawSizes && rawSizes.length > 0 ? rawSizes : ['52', '54', '56', '58', '60']));
  
  const rawColours = product.variations?.map(v => v.colour).filter(Boolean) as string[] | undefined;
  const colours = Array.from(new Set(rawColours && rawColours.length > 0 ? rawColours : ['Classic / As Pictured']));

  const currentSize = selectedSize || sizes[0] || 'Standard';
  const currentColour = selectedColour || colours[0] || 'Original';

  const rawTotal = product.variations?.reduce((acc, v) => acc + (v.stock_quantity || 0), 0) ?? 15;
  const matchingVariation = product.variations?.find(
    v => (!v.size || v.size === currentSize) && (!v.colour || v.colour === currentColour)
  );
  const matchedQty = matchingVariation?.stock_quantity ?? rawTotal;
  const variationStock = matchedQty > 0 ? matchedQty : 15;
  const isOutOfStock = false;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const addedQty = Math.min(variationStock, quantity);
    addToCart({
      product,
      selectedSize: currentSize,
      selectedColour: currentColour,
      quantity: addedQty,
    });
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: product.base_price || 0,
      quantity: addedQty,
      size: currentSize,
      color: currentColour,
      category: (product as any).category?.name || 'Modest Wear',
    });
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 750);
  };

  const chatNumber = getActiveWhatsAppChatNumber();
  const priceDisplayNote = pricing.hasDiscount 
    ? `₦${pricing.sellingPrice.toLocaleString()} (10% OFF from ₦${pricing.originalPrice.toLocaleString()})`
    : `₦${pricing.sellingPrice.toLocaleString()}`;

  const whatsappMessage = encodeURIComponent(
    `Assalamu Alaikum Teefahs Clothier! I am viewing:\n\n*${product.name}*\nPrice: ${priceDisplayNote}\nSize: ${currentSize}\nColour: ${currentColour}\n\nCould you please confirm availability and order details?`
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
            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white bg-white/90 dark:bg-stone-800/90 rounded-full shadow-md transition-colors"
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
                  alt={`${product.name} - ${activeSlot?.title || 'View'}`}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Active Photo Badge */}
                <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-sm text-stone-100 text-xs px-3 py-1.5 rounded-xs flex items-center gap-2 border border-stone-700/60 shadow">
                  <Sparkles size={13} className="text-amber-400" />
                  <span className="font-medium tracking-wide">{activeSlot?.title || 'Photograph'}</span>
                  {gallerySlots.length > 1 && (
                    <span className="text-[10px] text-stone-300">({currentSlotIndex + 1} of {gallerySlots.length})</span>
                  )}
                </div>

                {/* Lightbox / Zoom Button */}
                <button
                  type="button"
                  onClick={() => setLightboxImage(activeDisplayImage)}
                  className="absolute top-3 right-3 p-2 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title="Expand full screen"
                >
                  <Maximize2 size={16} />
                </button>
              </div>

              {/* Grid View of Genuine Product Photographs (Only if product has multiple views) */}
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

                  {/* Responsive Grid of Genuine Product Photos Only */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {gallerySlots.map((slot, idx) => {
                      const isSelected = selectedImageKey === `${idx}`;

                      return (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => setSelectedImageKey(`${idx}`)}
                          className={`relative aspect-[3/4] rounded-xs overflow-hidden border-2 transition-all text-left group ${
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
                      10% OFF PROMOTION
                    </span>
                  )}
                  {product.is_new_arrival && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-800 text-white rounded-xs">
                      New Collection
                    </span>
                  )}
                  {product.is_featured && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-stone-900 text-white rounded-xs">
                      Featured
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-white leading-tight">
                  {product.name}
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
                    You save {pricing.formattedDiscountAmount} (10% promotional discount applied)
                  </p>
                )}

                {/* Description */}
                <div className="text-sm text-stone-600 dark:text-stone-300 py-3 border-t border-b border-stone-100 dark:border-stone-800 my-4 leading-relaxed font-light">
                  {product.description || product.short_description || 'Handcrafted bespoke modest couture by Queen Lateefah. Tailored from Dubai crepe and luxury silks.'}
                </div>

                {/* Size Selector */}
                {sizes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                        Size: <strong className="text-stone-900 dark:text-amber-300 font-bold">{currentSize}</strong>
                      </span>
                      <span className="text-[11px] text-stone-400">Modest length & chest fit</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-1.5 text-xs font-medium border rounded-xs transition-colors ${
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
                )}

                {/* Colour Selector */}
                {colours.length > 0 && (
                  <div className="mb-4">
                    <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Colour: <strong className="text-stone-900 dark:text-amber-300 font-bold">{currentColour}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colours.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColour(col)}
                          className={`px-3 py-1.5 text-xs font-medium border rounded-xs transition-colors ${
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
                      className="px-3 py-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40"
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
                      className="px-3 py-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {isOutOfStock
                      ? 'Out of Stock'
                      : variationStock < 5
                      ? `Low Stock (${variationStock} left)`
                      : `In Stock (${variationStock} available)`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-stone-500 text-xs mb-5">
                  <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Authentic Teefahs Clothier tailoring & nationwide delivery.</span>
                </div>
              </div>

              {/* Secure Customer Actions (Strictly Storefront - No Admin Edit Buttons) */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 rounded-xs shadow-sm cursor-pointer"
                >
                  {addedNotice ? (
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
                  rel="noreferrer"
                  onClick={() => {
                    trackWhatsAppConversion('inquire_whatsapp', {
                      product_id: product.id,
                      product_name: product.name,
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
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-white/10 rounded-full"
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
