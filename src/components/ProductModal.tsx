import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Check,
  ShoppingBag,
  MessageCircle,
  Eye,
  Maximize2,
  ShieldCheck,
  ExternalLink,
  Ruler,
  ImageOff,
  Play,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Category, Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';
import { trackProductView, trackAddToCart, trackWhatsAppConversion } from '../utils/analytics';
import { calculateProductPricing, findMatchingVariation } from '../utils/pricing';
import { getProductById, getActiveCategories } from '../lib/api';
import { supabase } from '../lib/supabase';
import SizeGuideModal from './SizeGuideModal';

export interface ProductModalProps {
  product: Product | null;
  categories?: Category[];
  isOpen?: boolean;
  onClose: () => void;
}

const VIEW_LABELS: Record<string, string> = {
  front: 'Front View',
  back: 'Back View',
  side: 'Side View',
  top: 'Top View',
  closeup: 'Close-Up',
  fabric: 'Fabric Texture',
  detail: 'Craft Detail',
  worn: 'Worn Presentation',
  other: 'Additional View',
};

export default function ProductModal({
  product,
  categories,
  isOpen = true,
  onClose,
}: ProductModalProps) {
  const { addToCart } = useCart();
  const { formatDisplayPrice } = useLocale();
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product);
  const [activeCategories, setActiveCategories] = useState<Category[]>(categories || []);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mediaMode, setMediaMode] = useState<'photo' | 'video'>('photo');
  const [zoomActive, setZoomActive] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    setCurrentProduct(product);
    setIsUnavailable(false);
    setSelectedImageIdx(0);
    setMediaMode('photo');
    setZoomActive(false);
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

  useEffect(() => {
    if (!isOpen || !product?.id) return;
    syncModalProduct();
    const handleCatalogueUpdate = () => syncModalProduct();
    window.addEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);

    const channel = supabase
      .channel(`modal-product-${product.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, syncModalProduct)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, syncModalProduct)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, syncModalProduct)
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
      supabase.removeChannel(channel);
    };
  }, [isOpen, product?.id, syncModalProduct]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else if (!sizeGuideOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, sizeGuideOpen, onClose]);

  useEffect(() => {
    if (isOpen && product) {
      const cat = activeCategories.find(
        (c) => c.id === product.category_id || c.slug === product.category_id
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
  const variations = (activeProduct?.variations || []).filter((v) => v.is_active !== false);
  const hasVariations = variations.length > 0;

  const sizes = Array.from(new Set(variations.map((v) => v.size).filter(Boolean) as string[]));
  const colours = Array.from(new Set(variations.map((v) => v.colour).filter(Boolean) as string[]));

  const currentSize = sizes.length > 0
    ? selectedSize && sizes.includes(selectedSize)
      ? selectedSize
      : sizes[0]
    : 'To Confirm';
  const currentColour = colours.length > 0
    ? selectedColour && colours.includes(selectedColour)
      ? selectedColour
      : colours[0]
    : 'As Pictured';

  const matchingVariation = findMatchingVariation(
    activeProduct,
    sizes.length > 0 ? currentSize : undefined,
    colours.length > 0 ? currentColour : undefined
  );

  const variationStock = hasVariations
    ? matchingVariation
      ? Math.max(0, Number(matchingVariation.stock_quantity) || 0)
      : 0
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

  const pricing = calculateProductPricing(activeProduct, activeCategories, {
    variation: matchingVariation,
  });
  const priceDisplay = formatDisplayPrice(pricing.sellingPrice);
  const categoryObj = activeCategories.find(
    (c) => c.id === activeProduct.category_id || c.slug === activeProduct.category_id
  );

  const gallerySlots: { url: string; viewType: string; label: string }[] = [];
  const primary =
    activeProduct.main_image_url ||
    activeProduct.images?.[0]?.image_url ||
    '';

  if (primary) {
    const primaryMeta = activeProduct.images?.find((i) => i.image_url === primary);
    const pType = primaryMeta?.view_type || 'front';
    gallerySlots.push({
      url: primary,
      viewType: pType,
      label: VIEW_LABELS[pType] || 'Front View',
    });
  }
  (activeProduct.images || []).forEach((img, idx) => {
    if (img.image_url && !gallerySlots.some((g) => g.url === img.image_url)) {
      const iType = img.view_type || (idx === 0 ? 'front' : 'other');
      gallerySlots.push({
        url: img.image_url,
        viewType: iType,
        label: img.view_type ? VIEW_LABELS[img.view_type] || `View ${idx + 1}` : `View ${idx + 1}`,
      });
    }
  });

  const activeSlot = gallerySlots[selectedImageIdx] || gallerySlots[0];
  const activeDisplayImage = activeSlot?.url || primary;

  const handleColourPick = (col: string) => {
    setSelectedColour(col);
    const linkedVar = variations.find(
      (v) => v.colour?.toLowerCase() === col.toLowerCase() && v.image_url
    );
    if (linkedVar?.image_url) {
      const idx = gallerySlots.findIndex((g) => g.url === linkedVar.image_url);
      if (idx >= 0) setSelectedImageIdx(idx);
    } else {
      const linkedImgIdx = (activeProduct.images || []).findIndex(
        (im) => im.colour_tag?.toLowerCase() === col.toLowerCase()
      );
      if (linkedImgIdx >= 0) {
        const slotIdx = gallerySlots.findIndex(
          (g) => g.url === activeProduct.images?.[linkedImgIdx]?.image_url
        );
        if (slotIdx >= 0) setSelectedImageIdx(slotIdx);
      }
    }
  };

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
    }, 700);
  };

  const whatsappUrl = `https://wa.me/${getActiveWhatsAppChatNumber()}?text=${encodeURIComponent(
    `Assalamu Alaikum Teefahs Clothier! I am viewing:\n\n*${activeProduct.name}*\nPrice: ${pricing.formattedSellingPrice}\nSize: ${currentSize}\nColour: ${currentColour}\n\nPlease confirm availability.`
  )}`;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <Link
              to={`/product/${activeProduct.slug || activeProduct.id}`}
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/95 dark:bg-stone-800/95 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 inline-flex items-center gap-1"
            >
              <span>Full Details</span>
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/95 dark:bg-stone-800/95 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[92vh] overflow-y-auto">
            {/* Uncropped Gallery with Vertical Thumbnail Rail */}
            <div className="lg:col-span-7 bg-stone-50 dark:bg-stone-950 p-4 sm:p-6 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-stone-800">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Vertical Thumbnail Rail (desktop) / Horizontal Strip (mobile) */}
                {gallerySlots.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[480px] sm:w-20 flex-shrink-0 pb-1 sm:pb-0">
                    {gallerySlots.map((slot, idx) => (
                      <button
                        key={`${slot.url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setMediaMode('photo');
                          setSelectedImageIdx(idx);
                          setZoomActive(false);
                        }}
                        className={`relative aspect-[3/4] w-16 sm:w-full flex-shrink-0 bg-stone-100 dark:bg-stone-900 border-2 p-0.5 cursor-pointer transition-all ${
                          mediaMode === 'photo' && selectedImageIdx === idx
                            ? 'border-stone-900 dark:border-amber-400 shadow-xs'
                            : 'border-stone-200 dark:border-stone-800 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={slot.url}
                          alt={slot.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-stone-950/75 text-white text-[8px] px-1 py-0.5 truncate">
                          {slot.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative flex-1 aspect-[3/4] max-h-[480px] w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center justify-center p-2 group">
                  {mediaMode === 'video' && activeProduct.video_url ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <video
                        src={activeProduct.video_url}
                        controls
                        preload="metadata"
                        className="w-full h-full max-h-[460px] object-contain"
                      />
                    </div>
                  ) : activeDisplayImage ? (
                    <>
                      <img
                        key={activeDisplayImage}
                        src={activeDisplayImage}
                        alt={activeProduct.name}
                        referrerPolicy="no-referrer"
                        onClick={() => setZoomActive((prev) => !prev)}
                        style={zoomActive ? { transform: 'scale(1.85)' } : undefined}
                        className={`w-full h-full object-contain boutique-view-transition transition-transform duration-200 ${
                          zoomActive ? 'cursor-zoom-out' : 'cursor-zoom-in'
                        }`}
                      />
                      {gallerySlots.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaMode('photo');
                              setZoomActive(false);
                              setSelectedImageIdx((prev) => (prev - 1 + gallerySlots.length) % gallerySlots.length);
                            }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-stone-950/85 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-white cursor-pointer"
                            aria-label="Previous angle"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaMode('photo');
                              setZoomActive(false);
                              setSelectedImageIdx((prev) => (prev + 1) % gallerySlots.length);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-stone-950/85 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-white cursor-pointer"
                            aria-label="Next angle"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                      <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-[11px] px-2.5 py-1">
                        {zoomActive ? 'Close-Up View' : activeSlot?.label || 'Front View'}
                        {gallerySlots.length > 1 && !zoomActive && ` (${selectedImageIdx + 1}/${gallerySlots.length})`}
                      </div>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setZoomActive((prev) => !prev)}
                          className={`p-2 cursor-pointer transition-colors ${
                            zoomActive
                              ? 'bg-amber-400 text-stone-950'
                              : 'bg-stone-900/75 text-white opacity-85 hover:opacity-100'
                          }`}
                          title="Toggle close-up view"
                        >
                          <ZoomIn size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLightboxImage(activeDisplayImage)}
                          className="p-2 bg-stone-900/75 text-white cursor-pointer opacity-85 hover:opacity-100"
                          title="Expand full view"
                        >
                          <Maximize2 size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-stone-400">
                      <ImageOff size={32} strokeWidth={1.5} />
                      <span className="text-xs uppercase tracking-widest">Garment Photo Pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Same-Garment Angle Switcher */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'front', label: 'Front' },
                    { key: 'back', label: 'Back' },
                    { key: 'side', label: 'Side' },
                    { key: 'top', label: 'Top' },
                    { key: 'closeup', label: 'Close-Up' },
                  ] as const
                ).map(({ key, label }) => {
                  const matchIdx =
                    key === 'front'
                      ? Math.max(0, gallerySlots.findIndex((g) => g.viewType === 'front'))
                      : key === 'closeup'
                        ? gallerySlots.findIndex((g) => ['closeup', 'detail', 'fabric'].includes(g.viewType))
                        : gallerySlots.findIndex((g) => g.viewType === key);
                  const isAvailable =
                    key === 'front' || key === 'closeup' ? gallerySlots.length > 0 : matchIdx >= 0;
                  const isActive =
                    mediaMode === 'photo' &&
                    (key === 'closeup'
                      ? (matchIdx >= 0 && selectedImageIdx === matchIdx) || zoomActive
                      : matchIdx >= 0 && selectedImageIdx === matchIdx && !zoomActive);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setMediaMode('photo');
                        if (key === 'closeup') {
                          if (matchIdx >= 0) {
                            setSelectedImageIdx(matchIdx);
                            setZoomActive(false);
                          } else {
                            setZoomActive((prev) => !prev);
                          }
                        } else if (matchIdx >= 0) {
                          setSelectedImageIdx(matchIdx);
                          setZoomActive(false);
                        }
                      }}
                      title={
                        isAvailable
                          ? `View ${label} of ${activeProduct.name}`
                          : `${label} view not yet uploaded for this garment`
                      }
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                        isActive
                          ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 border-stone-900 dark:border-amber-400 cursor-pointer'
                          : isAvailable
                            ? 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:border-stone-900 cursor-pointer'
                            : 'bg-stone-100 dark:bg-stone-900/40 text-stone-400 dark:text-stone-600 border-stone-200 dark:border-stone-800 cursor-not-allowed'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}

                {activeProduct.video_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoomActive(false);
                      setMediaMode('video');
                    }}
                    className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      mediaMode === 'video'
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white dark:bg-stone-900 text-emerald-900 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <Play size={10} className="fill-current" />
                    <span>3D / Video</span>
                  </button>
                )}
              </div>

              {gallerySlots.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {gallerySlots.map((slot, idx) => (
                    <button
                      key={`${slot.url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`aspect-[3/4] bg-stone-100 dark:bg-stone-900 border-2 p-0.5 cursor-pointer ${
                        selectedImageIdx === idx
                          ? 'border-amber-500'
                          : 'border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <img
                        src={slot.url}
                        alt={slot.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info & Purchase */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-1.5">
                  {categoryObj?.name || 'Boutique Garment'}
                  {activeProduct.country_of_origin ? ` · ${activeProduct.country_of_origin}` : ''}
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-white leading-tight">
                  {activeProduct.name}
                </h1>

                <div className="mt-3 tabular-nums">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-semibold text-stone-900 dark:text-amber-300">
                      {priceDisplay.primaryNgn}
                    </span>
                    {pricing.hasDiscount && (
                      <span className="text-sm line-through text-stone-400">
                        {pricing.formattedOriginalPrice}
                      </span>
                    )}
                  </div>
                  {priceDisplay.indicativeForeign && (
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {priceDisplay.indicativeForeign} (indicative only)
                    </p>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 py-3.5 border-y border-stone-100 dark:border-stone-800 my-4 leading-relaxed font-light">
                  {activeProduct.description ||
                    activeProduct.short_description ||
                    'Garment specifications & measurements are being updated by our boutique atelier.'}
                </div>

                {colours.length > 0 && (
                  <div className="mb-4">
                    <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Colour: <strong className="text-stone-900 dark:text-amber-300">{currentColour}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colours.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleColourPick(col)}
                          className={`px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                            currentColour === col
                              ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold'
                              : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                        Size: <strong className="text-stone-900 dark:text-amber-300">{currentSize}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSizeGuideOpen(true)}
                        className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Ruler size={12} />
                        <span>Size Guide</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                            currentSize === sz
                              ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold'
                              : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Qty:
                  </span>
                  <div className="flex items-center border border-stone-300 dark:border-stone-700">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="px-3 py-1 disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-medium tabular-nums">
                      {isOutOfStock ? 0 : quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(variationStock, quantity + 1))}
                      disabled={quantity >= variationStock || isOutOfStock}
                      className="px-3 py-1 disabled:opacity-40 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
                    {isOutOfStock
                      ? 'Out of Stock'
                      : !hasVariations
                        ? 'Available'
                        : `${variationStock} in stock`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <ShieldCheck size={14} className="text-emerald-700 flex-shrink-0" />
                  <span>Verified Teefahs Clothier garment · Lagos &amp; Worldwide Dispatch</span>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full py-3.5 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 cursor-pointer'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : addedNotice ? (
                    <>
                      <Check size={16} />
                      <span>Added to Shopping Bag</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      <span>Add to Bag · ₦{(pricing.sellingPrice * quantity).toLocaleString()}</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackWhatsAppConversion('inquire_whatsapp', {
                      product_id: activeProduct.id,
                      product_name: activeProduct.name,
                      value: pricing.sellingPrice,
                    })
                  }
                  className="w-full py-3 border border-emerald-700 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  <span>Order / Inquire via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 text-white bg-white/10 cursor-pointer"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen view"
            referrerPolicy="no-referrer"
            className="max-h-[95vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <SizeGuideModal
        product={activeProduct}
        categoryName={categoryObj?.name}
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </>
  );
}
