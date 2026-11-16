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
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Ruler,
  Globe,
  Play,
  Package,
  RefreshCw,
  ImageOff,
} from 'lucide-react';
import { Product, Category } from '../types/product';
import { getProductById, getActiveCategories, getPublishedProducts } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { calculateProductPricing, findMatchingVariation } from '../utils/pricing';
import { getActiveWhatsAppChatNumber, SHOP_CONFIG } from '../config/shopConfig';
import { trackProductView, trackAddToCart, trackWhatsAppConversion } from '../utils/analytics';
import Header from './Header';
import PromoBanner from './PromoBanner';
import Footer from './Footer';
import SEO from './SEO';
import SizeGuideModal from './SizeGuideModal';
import ProductCard from './ProductCard';

const VIEW_TYPE_LABELS: Record<string, string> = {
  front: 'Front View',
  back: 'Back View',
  side: 'Side Profile',
  closeup: 'Close-Up',
  fabric: 'Fabric Texture',
  detail: 'Craft Detail',
  worn: 'Worn Presentation',
  other: 'Gallery View',
};

const AUTHENTICITY_LABELS: Record<string, string> = {
  actual_product: 'Actual Product Photograph',
  ai_enhanced: 'AI-Enhanced Presentation',
  illustrative_model: 'Illustrative Model Image',
};

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

interface GalleryItem {
  url: string;
  viewLabel: string;
  colourTag?: string;
  authenticityLabel?: string;
  caption?: string;
}

export default function ProductDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { addToCart } = useCart();
  const { countryInfo, activeDeliveryZone, formatDisplayPrice } = useLocale();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mediaMode, setMediaMode] = useState<'photo' | 'video'>('photo');
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'measurements' | 'delivery' | 'returns'>('overview');

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
      const [prod, cats, allPub] = await Promise.all([
        getProductById(slugOrId),
        getActiveCategories(),
        getPublishedProducts().catch(() => [] as Product[]),
      ]);
      setCategories(cats);
      if (prod && prod.is_published && !prod.is_archived && !prod.deleted_at) {
        setProduct(prod);
        const rel = allPub
          .filter((p) => p.id !== prod.id && p.category_id === prod.category_id)
          .slice(0, 4);
        setRelatedProducts(rel);
      } else {
        setProduct(null);
        setRelatedProducts([]);
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
    setMediaMode('photo');
    setZoomActive(false);
    setSelectedSize('');
    setSelectedColour('');
    setQuantity(1);
    setActiveTab('overview');
    loadProductData();
  }, [loadProductData]);

  useEffect(() => {
    if (!slugOrId) return;
    const handleLocalUpdate = () => loadProductData();
    window.addEventListener('teefahs_catalogue_updated', handleLocalUpdate);

    const channel = supabase
      .channel(`product-detail-${slugOrId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProductData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, loadProductData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, loadProductData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadProductData)
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [slugOrId, loadProductData]);

  const galleryImages: GalleryItem[] = useMemo(() => {
    if (!product) return [];
    const items: GalleryItem[] = [];
    const pushIfNew = (item: GalleryItem) => {
      if (item.url && !items.some((i) => i.url === item.url)) items.push(item);
    };

    const primaryMeta = product.images?.find((img) => img.image_url === product.main_image_url);
    if (product.main_image_url) {
      pushIfNew({
        url: product.main_image_url,
        viewLabel: primaryMeta?.view_type
          ? VIEW_TYPE_LABELS[primaryMeta.view_type] || 'Primary View'
          : 'Primary View',
        colourTag: primaryMeta?.colour_tag,
        authenticityLabel: primaryMeta?.authenticity_label
          ? AUTHENTICITY_LABELS[primaryMeta.authenticity_label]
          : undefined,
        caption: primaryMeta?.caption,
      });
    }

    (product.images || []).forEach((img, idx) => {
      pushIfNew({
        url: img.image_url,
        viewLabel: img.view_type
          ? VIEW_TYPE_LABELS[img.view_type] || `View ${idx + 1}`
          : `View ${idx + 1}`,
        colourTag: img.colour_tag,
        authenticityLabel: img.authenticity_label
          ? AUTHENTICITY_LABELS[img.authenticity_label]
          : undefined,
        caption: img.caption,
      });
    });

    return items;
  }, [product]);

  // Lightbox keyboard handling
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev + 1) % Math.max(1, galleryImages.length)
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) =>
          prev === null
            ? null
            : (prev - 1 + Math.max(1, galleryImages.length)) % Math.max(1, galleryImages.length)
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIdx, galleryImages.length]);

  useEffect(() => {
    if (product) {
      const cat = categories.find((c) => c.id === product.category_id || c.slug === product.category_id);
      trackProductView({
        id: product.id,
        name: product.name,
        price: product.base_price || 0,
        category: cat?.name || 'Modest Wear',
      });
    }
  }, [product?.id]);

  // Dynamic Schema.org Product JSON-LD injection
  useEffect(() => {
    if (!product) return;
    const scriptId = 'teefahs-product-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const cat = categories.find((c) => c.id === product.category_id || c.slug === product.category_id);
    const vars = (product.variations || []).filter((v) => v.is_active !== false);
    const anyInStock =
      vars.length === 0 || vars.some((v) => Math.max(0, Number(v.stock_quantity) || 0) > 0);
    const activePricing = calculateProductPricing(product, categories);

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      sku: product.sku || vars[0]?.sku || product.id,
      description: product.description || product.short_description || product.name,
      category: cat?.name || 'Modest Fashion',
      image: galleryImages.map((g) => g.url),
      brand: {
        '@type': 'Brand',
        name: 'Teefahs Clothier',
      },
      offers: {
        '@type': 'Offer',
        url: `${SHOP_CONFIG.officialWebsite}/product/${product.slug || product.id}`,
        priceCurrency: 'NGN',
        price: activePricing.sellingPrice,
        availability: anyInStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'Teefahs Clothier',
        },
      },
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [product, categories, galleryImages]);

  const variations = (product?.variations || []).filter((v) => v.is_active !== false);
  const hasVariations = variations.length > 0;

  const sizes = useMemo(
    () => Array.from(new Set(variations.map((v) => v.size).filter(Boolean) as string[])),
    [variations]
  );

  const colourOptions = useMemo(() => {
    const map = new Map<string, string>();
    variations.forEach((v) => {
      if (v.colour && !map.has(v.colour)) {
        map.set(v.colour, resolveSwatchHex(v.colour, v.colour_hex));
      }
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [variations]);

  const currentSize = sizes.length > 0
    ? selectedSize && sizes.includes(selectedSize)
      ? selectedSize
      : sizes[0]
    : 'To Confirm';

  const currentColour = colourOptions.length > 0
    ? selectedColour && colourOptions.some((c) => c.name === selectedColour)
      ? selectedColour
      : colourOptions[0].name
    : 'As Pictured';

  const matchingVariation = findMatchingVariation(
    product,
    sizes.length > 0 ? currentSize : undefined,
    colourOptions.length > 0 ? currentColour : undefined
  );

  const variationStock = hasVariations
    ? matchingVariation
      ? Math.max(0, Number(matchingVariation.stock_quantity) || 0)
      : 0
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
    ? categories.find((c) => c.id === product.category_id || c.slug === product.category_id)
    : undefined;

  const pricing = product
    ? calculateProductPricing(product, categories, { variation: matchingVariation })
    : null;
  const priceDisplay = pricing ? formatDisplayPrice(pricing.sellingPrice) : null;
  const activeGalleryItem = galleryImages[selectedImageIdx] || galleryImages[0];

  const handleColourSelect = (colourName: string) => {
    setSelectedColour(colourName);
    setMediaMode('photo');
    // Switch photo to matching variation image or tagged image if configured
    const matchedVarImg = variations.find(
      (v) => v.colour?.toLowerCase() === colourName.toLowerCase() && v.image_url
    )?.image_url;
    if (matchedVarImg) {
      const idx = galleryImages.findIndex((g) => g.url === matchedVarImg);
      if (idx >= 0) {
        setSelectedImageIdx(idx);
        return;
      }
    }
    const taggedIdx = galleryImages.findIndex(
      (g) => g.colourTag && g.colourTag.toLowerCase() === colourName.toLowerCase()
    );
    if (taggedIdx >= 0) {
      setSelectedImageIdx(taggedIdx);
    }
  };

  const handleMouseMoveZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

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

  const constructionEntries = useMemo(() => {
    if (!product?.construction_details) return [];
    const labels: Record<string, string> = {
      sleeve_style: 'Sleeve Style',
      neckline: 'Neckline',
      closure_type: 'Closure / Fastening',
      hood_or_veil: 'Hood / Headwear',
      embroidery: 'Embroidery / Embellishment',
      pockets: 'Pockets',
      waist_or_belt: 'Waist / Belt Detail',
      hem_finish: 'Hem Finish',
      occasion: 'Occasion',
      season: 'Seasonality',
    };
    return Object.entries(product.construction_details)
      .filter(([, val]) => typeof val === 'string' && val.trim().length > 0)
      .map(([k, val]) => ({ label: labels[k] || k, value: String(val) }));
  }, [product?.construction_details]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-500">
      <SEO
        title={product ? `${product.name}` : 'Garment Details'}
        description={
          product?.short_description ||
          product?.description ||
          'Authentic handcrafted modest couture by Teefahs Clothier.'
        }
        ogType="product"
      />

      <div>
        <PromoBanner />
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-6 sm:mb-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white font-medium"
            >
              <ArrowLeft size={14} />
              <span>Shop All</span>
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
          </nav>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 aspect-[3/4] bg-stone-200 dark:bg-stone-800" />
              <div className="lg:col-span-5 space-y-4">
                <div className="h-8 w-3/4 bg-stone-200 dark:bg-stone-800" />
                <div className="h-6 w-1/3 bg-stone-200 dark:bg-stone-800" />
                <div className="h-40 w-full bg-stone-200 dark:bg-stone-800" />
              </div>
            </div>
          ) : !product || !pricing || !priceDisplay ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-12 text-center max-w-lg mx-auto my-12">
              <AlertTriangle size={40} className="mx-auto text-amber-600 mb-4" />
              <h1 className="font-serif text-2xl text-stone-900 dark:text-white mb-2">
                Garment Unavailable
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 font-light">
                This garment may have been archived, unpublished, or removed from our active catalogue.
              </p>
              <Link
                to="/shop"
                className="inline-block px-6 py-3 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-widest"
              >
                Explore Active Catalogue
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                {/* LEFT COLUMN: STICKY GALLERY & OPTIONAL VIDEO */}
                <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
                  <div
                    onMouseMove={handleMouseMoveZoom}
                    onMouseLeave={() => setZoomActive(false)}
                    className="relative aspect-[3/4] max-h-[680px] w-full bg-stone-100/90 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center justify-center p-3"
                  >
                    {mediaMode === 'video' && product.video_url ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        <video
                          src={product.video_url}
                          controls
                          preload="metadata"
                          className="w-full h-full max-h-[640px] object-contain"
                        />
                      </div>
                    ) : !activeGalleryItem?.url ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-stone-400">
                        <ImageOff size={36} strokeWidth={1.5} />
                        <span className="text-xs uppercase tracking-widest">Garment Photograph Pending</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src={activeGalleryItem?.url}
                          alt={`${product.name} — ${activeGalleryItem?.viewLabel || 'View'}`}
                          referrerPolicy="no-referrer"
                          onClick={() => setZoomActive((prev) => !prev)}
                          style={
                            zoomActive
                              ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: 'scale(1.9)' }
                              : undefined
                          }
                          className={`w-full h-full object-contain transition-transform duration-200 ${
                            zoomActive ? 'cursor-zoom-out' : 'cursor-zoom-in'
                          }`}
                        />

                        {galleryImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIdx(
                                  (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
                                )
                              }
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-stone-950/85 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-white cursor-pointer hover:bg-white"
                              aria-label="Previous image"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIdx((prev) => (prev + 1) % galleryImages.length)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-stone-950/85 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-white cursor-pointer hover:bg-white"
                              aria-label="Next image"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </>
                        )}

                        {/* Caption & Optional Authenticity Label */}
                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                          <span className="bg-stone-950/80 text-stone-100 text-[11px] px-3 py-1">
                            {activeGalleryItem?.viewLabel}
                            {activeGalleryItem?.colourTag ? ` · ${activeGalleryItem.colourTag}` : ''}
                            {galleryImages.length > 1
                              ? ` (${selectedImageIdx + 1}/${galleryImages.length})`
                              : ''}
                          </span>
                          {activeGalleryItem?.authenticityLabel && (
                            <span className="bg-white/90 dark:bg-stone-950/90 text-stone-800 dark:text-stone-200 text-[10px] font-medium px-2.5 py-1 border border-stone-200 dark:border-stone-700">
                              {activeGalleryItem.authenticityLabel}
                            </span>
                          )}
                        </div>

                        {/* Top Controls: Zoom & Fullscreen */}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setZoomActive((prev) => !prev)}
                            className={`p-2 border transition-colors cursor-pointer ${
                              zoomActive
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-white/90 dark:bg-stone-950/85 text-stone-800 dark:text-white border-stone-200 dark:border-stone-700'
                            }`}
                            title="Toggle interactive zoom"
                            aria-label="Toggle interactive zoom"
                          >
                            <ZoomIn size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLightboxIdx(selectedImageIdx)}
                            className="p-2 bg-white/90 dark:bg-stone-950/85 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 cursor-pointer"
                            title="Open fullscreen lightbox"
                            aria-label="Open fullscreen lightbox"
                          >
                            <Maximize2 size={15} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails & Optional Video Selector */}
                  {(galleryImages.length > 1 || product.video_url) && (
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                      {galleryImages.map((img, idx) => (
                        <button
                          key={`${img.url}-${idx}`}
                          type="button"
                          onClick={() => {
                            setMediaMode('photo');
                            setSelectedImageIdx(idx);
                          }}
                          className={`relative aspect-[3/4] bg-stone-100 dark:bg-stone-900 border-2 p-1 cursor-pointer transition-colors ${
                            mediaMode === 'photo' && selectedImageIdx === idx
                              ? 'border-stone-900 dark:border-amber-400'
                              : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.viewLabel}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-stone-950/75 text-white text-[9px] px-1 py-0.5 truncate">
                            {img.viewLabel}
                          </span>
                        </button>
                      ))}

                      {product.video_url && (
                        <button
                          type="button"
                          onClick={() => setMediaMode('video')}
                          className={`relative aspect-[3/4] bg-stone-900 text-white border-2 flex flex-col items-center justify-center gap-1 p-2 cursor-pointer ${
                            mediaMode === 'video'
                              ? 'border-amber-400'
                              : 'border-stone-700 hover:border-stone-500'
                          }`}
                        >
                          <Play size={20} className="text-amber-400 fill-current" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Video
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: STRICT 12-ITEM BUYER PURCHASE MODULE */}
                <div className="lg:col-span-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-5">
                  {/* 1. Product Title, Category & Origin */}
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400 mb-2">
                      <span>{category?.name || 'Boutique Couture'}</span>
                      {(product.sku || matchingVariation?.sku) && (
                        <>
                          <span>·</span>
                          <span>SKU {matchingVariation?.sku || product.sku}</span>
                        </>
                      )}
                      {product.country_of_origin && (
                        <>
                          <span>·</span>
                          <span>Origin: {product.country_of_origin}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-white leading-tight">
                      {product.name}
                    </h1>
                  </div>

                  {/* 2. Authoritative Price + Optional Foreign Equivalent */}
                  <div className="pb-4 border-b border-stone-100 dark:border-stone-800 tabular-nums">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold text-stone-900 dark:text-amber-300">
                        {priceDisplay.primaryNgn}
                      </span>
                      {pricing.hasDiscount && (
                        <span className="text-base line-through text-stone-400">
                          {pricing.formattedOriginalPrice}
                        </span>
                      )}
                      {pricing.hasDiscount && (
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          Save {pricing.discountPercentage}%
                        </span>
                      )}
                    </div>
                    {priceDisplay.indicativeForeign && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
                          {priceDisplay.indicativeForeign}
                        </p>
                        <p className="text-[10px] text-stone-500 leading-snug">
                          {priceDisplay.disclaimer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* (Item 3: Verified customer reviews intentionally omitted since zero real customer reviews exist) */}

                  {/* 4. Availability Summary */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider font-semibold text-stone-500">
                      Availability
                    </span>
                    <span
                      className={`font-semibold ${
                        isOutOfStock
                          ? 'text-red-600 dark:text-red-400'
                          : hasVariations && variationStock < 5
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-800 dark:text-emerald-400'
                      }`}
                    >
                      {isOutOfStock
                        ? 'Out of Stock in this Option'
                        : !hasVariations
                          ? 'Available (Specs confirmed on order)'
                          : variationStock < 5
                            ? `Low Stock · Only ${variationStock} remaining`
                            : `In Stock · ${variationStock} available`}
                    </span>
                  </div>

                  {/* 5. Interactive Colour Swatch Selector */}
                  {colourOptions.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                        Colour: <strong className="text-stone-900 dark:text-amber-300">{currentColour}</strong>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {colourOptions.map(({ name, hex }) => {
                          const isSelected = currentColour === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleColourSelect(name)}
                              className={`px-3 py-2 text-xs font-medium border flex items-center gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold'
                                  : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-500'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 flex-shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                              <span>{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 6 & 7. Interactive Size Selector + Measurements Guide Trigger */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                        {sizes.length > 0 ? (
                          <>
                            Size ({product.sizing_system || 'NG'}):{' '}
                            <strong className="text-stone-900 dark:text-amber-300">{currentSize}</strong>
                          </>
                        ) : (
                          'Sizing & Fit'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSizeGuideOpen(true)}
                        className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Ruler size={13} />
                        <span>Size &amp; Measurements Guide</span>
                      </button>
                    </div>

                    {sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((sz) => {
                          const comboVar = findMatchingVariation(
                            product,
                            sz,
                            colourOptions.length > 0 ? currentColour : undefined
                          );
                          const comboOut = comboVar && Number(comboVar.stock_quantity) <= 0;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setSelectedSize(sz)}
                              className={`px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                                currentSize === sz
                                  ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold'
                                  : comboOut
                                    ? 'border-stone-200 dark:border-stone-800 text-stone-400 line-through'
                                    : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-500'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Size options are being updated by our atelier — confirm your preferred length or bust fit when placing order.
                      </p>
                    )}
                  </div>

                  {/* 8. Key Quick Garment Specs */}
                  <div className="p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
                    {product.fabric_type && (
                      <div className="flex justify-between gap-3">
                        <span className="text-stone-500">Fabric</span>
                        <span className="font-medium text-right">{product.fabric_type}</span>
                      </div>
                    )}
                    {product.fit_type && (
                      <div className="flex justify-between gap-3">
                        <span className="text-stone-500">Cut / Fit</span>
                        <span className="font-medium capitalize">{product.fit_type.replace(/_/g, ' ')} Fit</span>
                      </div>
                    )}
                    {product.transparency_lining && (
                      <div className="flex justify-between gap-3">
                        <span className="text-stone-500">Sheerness / Lining</span>
                        <span className="font-medium text-right">{product.transparency_lining}</span>
                      </div>
                    )}
                    {product.whats_included && (
                      <div className="flex justify-between gap-3">
                        <span className="text-stone-500">What&apos;s Included</span>
                        <span className="font-medium text-right">{product.whats_included}</span>
                      </div>
                    )}
                    {!product.fabric_type && !product.whats_included && (
                      <p className="text-[11px] text-stone-500">
                        Full textile &amp; tailoring specifications are verified by our Lagos boutique desk prior to dispatch.
                      </p>
                    )}
                  </div>

                  {/* 9. Quantity Selector */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                      Quantity
                    </span>
                    <div className="flex items-center border border-stone-300 dark:border-stone-700">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={isOutOfStock || quantity <= 1}
                        className="px-3.5 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-sm font-semibold tabular-nums">
                        {isOutOfStock ? 0 : quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(variationStock, q + 1))}
                        disabled={isOutOfStock || quantity >= variationStock}
                        className="px-3.5 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 10 & 11. Primary Add to Bag + Direct WhatsApp Order */}
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      className={`w-full py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
                        isOutOfStock
                          ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                          : 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 cursor-pointer'
                      }`}
                    >
                      {isOutOfStock ? (
                        <span>Currently Out of Stock</span>
                      ) : addedNotice ? (
                        <>
                          <Check size={16} />
                          <span>Added to Shopping Bag</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={16} />
                          <span>
                            Add to Bag · ₦{(pricing.sellingPrice * quantity).toLocaleString()}
                          </span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/${getActiveWhatsAppChatNumber()}?text=${encodeURIComponent(
                        `Assalamu Alaikum Teefahs Clothier! I am viewing:\n\n*${product.name}*${matchingVariation?.sku || product.sku ? ` [${matchingVariation?.sku || product.sku}]` : ''}\nPrice: ${pricing.formattedSellingPrice}${priceDisplay.indicativeForeign ? ` (${priceDisplay.indicativeForeign})` : ''}\nColour: ${currentColour}\nSize: ${currentSize}\nQty: ${quantity}\nDelivery Destination: ${countryInfo.name}\n\nPlease confirm availability and dispatch timeline.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackWhatsAppConversion('inquire_whatsapp', {
                          product_id: product.id,
                          product_name: product.name,
                          value: pricing.sellingPrice,
                        })
                      }
                      className="w-full py-3 border border-emerald-700 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      <span>Order / Inquire via WhatsApp</span>
                    </a>
                  </div>

                  {/* 12. Delivery Zone & Policy Summary */}
                  <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-2">
                    <div className="flex items-start gap-2">
                      <Globe size={14} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-stone-900 dark:text-stone-200">
                          Dispatch to {countryInfo.name}:
                        </strong>{' '}
                        {activeDeliveryZone?.estimated_timeline || countryInfo.fallbackTimeline}.
                        {activeDeliveryZone?.delivery_fee_ngn !== null &&
                        activeDeliveryZone?.delivery_fee_ngn !== undefined
                          ? ` Standard fee: ₦${Number(activeDeliveryZone.delivery_fee_ngn).toLocaleString()}.`
                          : ' Exact courier rate confirmed via WhatsApp before payment.'}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        Hand-inspected at our Abule Egba, Lagos atelier prior to protective garment packaging.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILED PRODUCT ACCORDION / TABS */}
              <section className="mt-14 border-t border-stone-200 dark:border-stone-800 pt-10">
                <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-6">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'specs', label: 'Fabric & Construction' },
                    { id: 'measurements', label: 'Size & Measurements' },
                    { id: 'delivery', label: `Delivery (${countryInfo.name})` },
                    { id: 'returns', label: 'Returns & Care' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {activeTab === 'overview' && (
                    <div className="max-w-3xl space-y-4">
                      <h2 className="font-serif text-xl text-stone-900 dark:text-white">
                        Design Overview
                      </h2>
                      <p className="whitespace-pre-line font-light">
                        {product.description ||
                          product.short_description ||
                          'Full editorial description awaiting owner entry. Contact our Lagos boutique desk for fabric feel, silhouette drape, and styling recommendations.'}
                      </p>
                      {product.whats_included && (
                        <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
                          <strong className="uppercase tracking-wider text-stone-500 block mb-1">
                            What&apos;s Included in the Package
                          </strong>
                          <span className="text-stone-900 dark:text-stone-100 font-medium">
                            {product.whats_included}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'specs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h3 className="font-serif text-lg text-stone-900 dark:text-white">
                          Textile &amp; Origin Specifications
                        </h3>
                        <dl className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                          {[
                            ['Country / Origin', product.country_of_origin || product.collection_origin || 'Awaiting owner update'],
                            ['Fabric Composition', product.fabric_type || 'Confirmed on request'],
                            ['Texture & Drape', product.fabric_texture || 'Confirmed on request'],
                            ['Fabric Weight', product.fabric_weight || 'Confirmed on request'],
                            ['Lining & Coverage', product.transparency_lining || 'Confirmed on request'],
                            ['Care Instructions', product.care_instructions || 'Gentle hand wash or dry clean recommended for embellished pieces'],
                          ].map(([label, value]) => (
                            <div key={label} className="py-2.5 flex justify-between gap-4">
                              <dt className="text-stone-500">{label}</dt>
                              <dd className="font-medium text-stone-900 dark:text-stone-100 text-right">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-serif text-lg text-stone-900 dark:text-white">
                          Garment Construction
                        </h3>
                        {constructionEntries.length > 0 ? (
                          <dl className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                            {constructionEntries.map((item) => (
                              <div key={item.label} className="py-2.5 flex justify-between gap-4">
                                <dt className="text-stone-500">{item.label}</dt>
                                <dd className="font-medium text-stone-900 dark:text-stone-100 text-right">
                                  {item.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-xs text-stone-500 font-light">
                            Detailed construction specifications (sleeve finish, closure type, pockets, and hem detail) have not been published separately for this piece yet. Inquire on WhatsApp for exact tailoring questions.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'measurements' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-lg text-stone-900 dark:text-white">
                            Garment Fit &amp; Tape Measurements
                          </h3>
                          <p className="text-xs text-stone-500">
                            Sizing system: {product.sizing_system || 'NG'} · Silhouette:{' '}
                            <span className="capitalize">{(product.fit_type || 'loose').replace(/_/g, ' ')} Fit</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSizeGuideOpen(true)}
                          className="px-4 py-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Ruler size={14} />
                          <span>Open Interactive cm / inches Guide</span>
                        </button>
                      </div>
                      {product.fit_guidance && (
                        <p className="text-xs bg-stone-50 dark:bg-stone-950 p-3 border border-stone-200 dark:border-stone-800">
                          {product.fit_guidance}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'delivery' && (
                    <div className="space-y-3 max-w-3xl text-xs leading-relaxed">
                      <h3 className="font-serif text-lg text-stone-900 dark:text-white">
                        Worldwide &amp; Nigeria Dispatch ({countryInfo.name})
                      </h3>
                      <p>
                        <strong className="text-stone-900 dark:text-white">Estimated Timeline:</strong>{' '}
                        {activeDeliveryZone?.estimated_timeline || countryInfo.fallbackTimeline}
                      </p>
                      <p>
                        <strong className="text-stone-900 dark:text-white">Shipping Fee Policy:</strong>{' '}
                        {activeDeliveryZone?.delivery_fee_ngn !== null &&
                        activeDeliveryZone?.delivery_fee_ngn !== undefined
                          ? `Confirmed flat rate: ₦${Number(activeDeliveryZone.delivery_fee_ngn).toLocaleString()}.`
                          : activeDeliveryZone?.policy_note ||
                            'Delivery charges vary by weight and destination city. Our dispatch desk confirms the exact courier fee on WhatsApp before payment.'}
                      </p>
                      <p>
                        <strong className="text-stone-900 dark:text-white">Customs &amp; Import Duties:</strong>{' '}
                        {activeDeliveryZone?.customs_note || countryInfo.fallbackCustomsNote}
                      </p>
                    </div>
                  )}

                  {activeTab === 'returns' && (
                    <div className="space-y-3 max-w-3xl text-xs leading-relaxed">
                      <div className="flex items-center gap-2 text-stone-900 dark:text-white font-semibold">
                        <RefreshCw size={15} className="text-emerald-700 dark:text-emerald-400" />
                        <span>Boutique Quality Inspection &amp; Exchange Support</span>
                      </div>
                      <p>
                        Every garment leaves our Ikeja, Lagos boutique inspected for stitching, beadwork, and finish.
                        If an item arrives with a verifiable transit defect or sizing mismatch from your confirmed order summary, contact our WhatsApp desk within 48 hours of delivery with photos and your order reference.
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Package size={14} className="text-emerald-700" />
                        <Link to="/track-order" className="text-emerald-800 dark:text-amber-300 font-semibold hover:underline">
                          Need to track an existing dispatch? Visit Order Tracking &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* RELATED PRODUCTS */}
              {relatedProducts.length > 0 && (
                <section className="mt-16 pt-10 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-2xl text-stone-900 dark:text-white">
                      Related Pieces in {category?.name || 'This Collection'}
                    </h2>
                    <Link
                      to={category ? `/shop?category=${category.slug || category.id}` : '/shop'}
                      className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-amber-300 hover:underline"
                    >
                      View All &rarr;
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {relatedProducts.map((rel) => (
                      <ProductCard key={rel.id} product={rel} categories={categories} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <Footer />

      {/* Fullscreen Lightbox with Keyboard & Button Navigation */}
      {lightboxIdx !== null && galleryImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 p-2.5 text-white bg-white/10 hover:bg-white/20 cursor-pointer"
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx - 1 + galleryImages.length) % galleryImages.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % galleryImages.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="flex flex-col items-center gap-3 max-w-[92vw] max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[lightboxIdx].url}
              alt={galleryImages[lightboxIdx].viewLabel}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] max-w-[92vw] object-contain"
            />
            <span className="text-xs text-stone-300">
              {galleryImages[lightboxIdx].viewLabel} ({lightboxIdx + 1} of {galleryImages.length})
            </span>
          </div>
        </div>
      )}

      {product && (
        <SizeGuideModal
          product={product}
          categoryName={category?.name}
          isOpen={sizeGuideOpen}
          onClose={() => setSizeGuideOpen(false)}
        />
      )}
    </div>
  );
}
