import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ShoppingBag,
  MessageCircle,
  Maximize2,
  X,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Product, Category } from '../types/product';
import { getProductById, getActiveCategories } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { calculateProductPricing } from '../utils/pricing';
import { getActiveWhatsAppChatNumber } from '../config/shopConfig';
import { trackProductView, trackAddToCart, trackWhatsAppConversion } from '../utils/analytics';
import { SUPPLIED_PHOTOS } from '../data/assets';
import Header from './Header';
import PromoBanner from './PromoBanner';
import Footer from './Footer';
import SEO from './SEO';

export default function ProductDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColour, setSelectedColour] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const loadProductData = useCallback(async () => {
    if (!slugOrId) {
      setProduct(null);
      setLoading(false);
      return;
    }
    try {
      const [prod, cats] = await Promise.all([
        getProductById(slugOrId),
        getActiveCategories(),
      ]);
      setCategories(cats);
      if (prod && prod.is_published && !prod.is_archived && !prod.deleted_at) {
        setProduct(prod);
      } else {
        setProduct(null);
      }
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => {
    setLoading(true);
    setSelectedImageIdx(0);
    setSelectedSize('');
    setSelectedColour('');
    setQuantity(1);
    loadProductData();
  }, [loadProductData]);

  // Direct cross-device Supabase Realtime + local catalogue sync
  useEffect(() => {
    if (!slugOrId) return;

    const handleLocalUpdate = () => {
      loadProductData();
    };
    window.addEventListener('teefahs_catalogue_updated', handleLocalUpdate);

    const channelName = `product-detail-${slugOrId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProductData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, () => {
        loadProductData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, () => {
        loadProductData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadProductData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [slugOrId, loadProductData]);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage]);

  useEffect(() => {
    if (product) {
      const cat = categories.find(c => c.id === product.category_id || c.slug === product.category_id);
      trackProductView({
        id: product.id,
        name: product.name,
        price: product.base_price || 0,
        category: cat?.name || 'Modest Wear',
      });
    }
  }, [product?.id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    const primary =
      product.main_image_url ||
      product.images?.[0]?.image_url ||
      product.additionalImages?.[0] ||
      SUPPLIED_PHOTOS[0];
    if (primary) list.push(primary);
    product.additionalImages?.forEach(url => {
      if (url && !list.includes(url)) list.push(url);
    });
    product.images?.forEach(img => {
      const url = typeof img === 'string' ? img : img?.image_url;
      if (url && !list.includes(url)) list.push(url);
    });
    return list;
  }, [product]);

  const variations = product?.variations || [];
  const hasVariations = variations.length > 0;

  const sizes = useMemo(() => {
    if (!product || !hasVariations) return [];
    const raw = product.variations?.map(v => v.size).filter(Boolean) as string[] | undefined;
    return Array.from(new Set(raw || []));
  }, [product, hasVariations]);

  const colours = useMemo(() => {
    if (!product || !hasVariations) return [];
    const raw = product.variations?.map(v => v.colour).filter(Boolean) as string[] | undefined;
    return Array.from(new Set(raw || []));
  }, [product, hasVariations]);

  const currentSize = sizes.length > 0
    ? (selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes[0])
    : 'To Confirm';
  const currentColour = colours.length > 0
    ? (selectedColour && colours.includes(selectedColour) ? selectedColour : colours[0])
    : 'As Pictured';

  const totalStock = useMemo(() => {
    if (!product) return 0;
    return (product.variations || []).reduce(
      (sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0),
      0
    );
  }, [product]);

  const matchingVariation = useMemo(() => {
    if (!product?.variations?.length) return undefined;
    return product.variations.find(
      v => (!v.size || v.size === currentSize) && (!v.colour || v.colour === currentColour)
    );
  }, [product, currentSize, currentColour]);

  const variationStock = hasVariations
    ? (matchingVariation ? Math.max(0, Number(matchingVariation.stock_quantity) || 0) : totalStock)
    : 20;
  const isOutOfStock = hasVariations && variationStock <= 0;

  useEffect(() => {
    if (variationStock > 0 && quantity > variationStock) {
      setQuantity(variationStock);
    } else if (variationStock > 0 && quantity < 1) {
      setQuantity(1);
    }
  }, [variationStock, quantity]);

  const category = product
    ? categories.find(c => c.id === product.category_id || c.slug === product.category_id)
    : undefined;
  const pricing = product ? calculateProductPricing(product, categories) : null;
  const activeImage = galleryImages[selectedImageIdx] || galleryImages[0] || SUPPLIED_PHOTOS[0];

  const handleAddToCart = () => {
    if (!product || isOutOfStock || !pricing) return;
    const addedQty = Math.min(variationStock, Math.max(1, quantity));
    addToCart({
      product,
      selectedSize: currentSize,
      selectedColour: currentColour,
      quantity: addedQty,
    });
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: pricing.sellingPrice,
      quantity: addedQty,
      size: currentSize,
      color: currentColour,
      category: category?.name || 'Modest Wear',
    });
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 1800);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-500">
      <SEO
        title={product ? `${product.name} — Modest Luxury Collection` : 'Garment Details'}
        description={
          product?.short_description ||
          product?.description ||
          'Explore authentic handcrafted modest couture by Teefahs Clothier.'
        }
      />

      <div>
        <PromoBanner />
        <Header />

        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white font-medium"
            >
              <ArrowLeft size={14} />
              <span>Back to Shop</span>
            </Link>
            {category && (
              <>
                <span>/</span>
                <Link
                  to={`/shop?category=${category.slug || category.id}`}
                  className="hover:text-emerald-800 dark:hover:text-amber-300"
                >
                  {category.name}
                </Link>
              </>
            )}
            {product && (
              <>
                <span>/</span>
                <span className="text-stone-800 dark:text-stone-200 font-medium truncate max-w-xs">
                  {product.name}
                </span>
              </>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
              <div className="lg:col-span-7 aspect-[3/4] bg-stone-200 dark:bg-stone-800 rounded-sm" />
              <div className="lg:col-span-5 space-y-4">
                <div className="h-8 w-3/4 bg-stone-200 dark:bg-stone-800 rounded" />
                <div className="h-6 w-1/3 bg-stone-200 dark:bg-stone-800 rounded" />
                <div className="h-32 w-full bg-stone-200 dark:bg-stone-800 rounded" />
              </div>
            </div>
          ) : !product || !pricing ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-sm p-12 text-center max-w-lg mx-auto my-12">
              <AlertTriangle size={40} className="mx-auto text-amber-600 mb-4" />
              <h1 className="font-serif text-2xl text-stone-900 dark:text-white mb-2">
                Garment Unavailable
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 font-light">
                This garment may have been archived, unpublished, or removed from our active catalogue.
              </p>
              <Link
                to="/shop"
                className="inline-block px-6 py-3 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-widest rounded-xs hover:bg-stone-800 transition-colors"
              >
                Explore Active Catalogue
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left: Photo Gallery */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-[3/4] max-h-[640px] w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-sm overflow-hidden group">
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-stone-100 text-xs px-3 py-1.5 rounded-xs flex items-center gap-2">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>
                      {selectedImageIdx === 0 ? 'Primary View' : `View ${selectedImageIdx + 1}`}
                      {galleryImages.length > 1 && ` (${selectedImageIdx + 1} of ${galleryImages.length})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(activeImage)}
                    className="absolute top-3 right-3 p-2.5 bg-stone-900/75 hover:bg-stone-900 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                    title="Expand full screen"
                    aria-label="Expand full screen"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                {galleryImages.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {galleryImages.map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`relative aspect-[3/4] rounded-xs overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImageIdx === idx
                            ? 'border-amber-500 ring-2 ring-amber-500/40'
                            : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.name} view ${idx + 1}`}
                          className="w-full h-full object-cover object-top"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Info & Purchase Controls */}
              <div className="lg:col-span-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-sm p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  {category && (
                    <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xs">
                      {category.name}
                    </span>
                  )}
                  {pricing.hasDiscount && (
                    <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-amber-600 text-white rounded-xs">
                      {pricing.discountPercentage}% OFF
                    </span>
                  )}
                  {product.is_new_arrival && (
                    <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-800 text-white rounded-xs">
                      New Arrival
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 dark:text-white leading-tight">
                  {product.name}
                </h1>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-semibold text-stone-900 dark:text-amber-300">
                    {pricing.formattedSellingPrice}
                  </span>
                  {pricing.hasDiscount && (
                    <span className="text-base line-through text-stone-400 dark:text-stone-500 font-light">
                      {pricing.formattedOriginalPrice}
                    </span>
                  )}
                </div>

                {pricing.hasDiscount && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    You save {pricing.formattedDiscountAmount} ({pricing.discountPercentage}% promotional savings)
                  </p>
                )}

                <div className="text-sm text-stone-600 dark:text-stone-300 py-4 border-y border-stone-100 dark:border-stone-800 leading-relaxed font-light whitespace-pre-line">
                  {product.description ||
                    product.short_description ||
                    'Specifications, fabric notes & measurements awaiting owner update. Inquire via WhatsApp for full garment details.'}
                </div>

                {/* Size Selector */}
                {sizes.length > 0 && (
                  <div>
                    <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Size: <strong className="text-stone-900 dark:text-amber-300">{currentSize}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3.5 py-1.5 text-xs font-medium border rounded-xs transition-colors cursor-pointer ${
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
                  <div>
                    <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Colour: <strong className="text-stone-900 dark:text-amber-300">{currentColour}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colours.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColour(col)}
                          className={`px-3.5 py-1.5 text-xs font-medium border rounded-xs transition-colors cursor-pointer ${
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

                {sizes.length === 0 && colours.length === 0 && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xs text-xs text-stone-600 dark:text-stone-300">
                    Sizes &amp; colour variations are awaiting owner update — your fit will be confirmed on order via WhatsApp.
                  </div>
                )}

                {/* Quantity & Real Stock Status */}
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={isOutOfStock || quantity <= 1}
                      className="px-3 py-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-medium">
                      {isOutOfStock ? 0 : quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(variationStock, q + 1))}
                      disabled={isOutOfStock || quantity >= variationStock}
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
                    {isOutOfStock
                      ? 'Out of Stock'
                      : !hasVariations
                      ? 'Available (Confirm fit on order)'
                      : variationStock < 5
                      ? `Low Stock (${variationStock} left)`
                      : `In Stock (${variationStock} available)`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Authentic Teefahs Clothier tailoring &amp; nationwide delivery.</span>
                </div>

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
                      <span>Out of Stock</span>
                    ) : addedNotice ? (
                      <>
                        <Check size={16} />
                        <span>Added to Shopping Bag!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={16} />
                        <span>Add to Bag (₦{(pricing.sellingPrice * quantity).toLocaleString()})</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/${getActiveWhatsAppChatNumber()}?text=${encodeURIComponent(
                      `Assalamu Alaikum Teefahs Clothier! I am viewing:\n\n*${product.name}*\nPrice: ${pricing.formattedSellingPrice}\nSize: ${currentSize}\nColour: ${currentColour}\n\nCould you please confirm availability and order details?`
                    )}`}
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
          )}
        </main>
      </div>

      <Footer />

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
            alt="Fullscreen garment view"
            className="max-h-[95vh] max-w-[95vw] object-contain rounded-xs shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
