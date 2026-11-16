import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, ArrowRight, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { Product } from '../types/product';
import ProductModal from './ProductModal';
import { useCart } from '../context/CartContext';
import { calculateProductPricing } from '../utils/pricing';

interface GalleryItem {
  id: string;
  url: string;
  photos: string[];
  title: string;
  category: string;
  productSlug: string;
  product: Product;
}

interface GallerySectionProps {
  isStandalone?: boolean;
  limit?: number;
}

export default function GallerySection({ isStandalone = false, limit }: GallerySectionProps) {
  const { addToCart } = useCart();
  const { products, categories: productCategories } = useRealtimeProducts({ includeUnpublished: false });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [quickAdded, setQuickAdded] = useState(false);

  // Build gallery items dynamically — strictly one lookbook card per published product,
  // with all genuine angles grouped inside `photos` to prevent repetitive cards.
  const galleryItems: GalleryItem[] = useMemo(() => {
    const items: GalleryItem[] = [];

    products.forEach((product) => {
      if (!product.is_published || product.is_archived || product.deleted_at) return;
      const rawCatName =
        productCategories.find(
          (c) => c.id === product.category_id || c.slug === product.category_id
        )?.name || 'Modest Collection';
      const catName =
        rawCatName.trim().toLowerCase() === 'work wear' || rawCatName.trim().toLowerCase() === 'workerwear'
          ? 'Workwear'
          : rawCatName;

      const photos: string[] = [];
      const seenProductUrls = new Set<string>();
      const pushUnique = (rawUrl?: string) => {
        const cleanUrl = (rawUrl || '').trim();
        if (!cleanUrl || seenProductUrls.has(cleanUrl)) return;
        seenProductUrls.add(cleanUrl);
        photos.push(cleanUrl);
      };

      pushUnique(product.main_image_url);
      (product.images || []).forEach((img) => {
        const url = typeof img === 'string' ? img : img?.image_url;
        pushUnique(url);
      });

      if (photos.length === 0) return;

      items.push({
        id: product.id,
        url: photos[0],
        photos,
        title: product.name,
        category: catName,
        productSlug: product.slug || product.id,
        product,
      });
    });

    return items;
  }, [products, productCategories]);

  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(galleryItems.map((i) => i.category).filter(Boolean)));
    return ['All', ...uniqueCats];
  }, [galleryItems]);

  const filteredItems = selectedCategory === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedCategory);

  const displayItems = limit ? filteredItems.slice(0, limit) : filteredItems;

  const currentIndex = activeItem ? filteredItems.findIndex(i => i.id === activeItem.id) : -1;

  const openLightbox = (item: GalleryItem) => {
    setActiveItem(item);
    setActivePhotoIdx(0);
  };

  const goToPrevious = () => {
    if (activeItem && activeItem.photos.length > 1 && activePhotoIdx > 0) {
      setActivePhotoIdx(activePhotoIdx - 1);
      return;
    }
    if (filteredItems.length === 0) return;
    const prevItem = currentIndex > 0 ? filteredItems[currentIndex - 1] : filteredItems[filteredItems.length - 1];
    setActiveItem(prevItem);
    setActivePhotoIdx(Math.max(0, prevItem.photos.length - 1));
  };

  const goToNext = () => {
    if (activeItem && activeItem.photos.length > 1 && activePhotoIdx < activeItem.photos.length - 1) {
      setActivePhotoIdx(activePhotoIdx + 1);
      return;
    }
    if (filteredItems.length === 0) return;
    const nextItem =
      currentIndex >= 0 && currentIndex < filteredItems.length - 1
        ? filteredItems[currentIndex + 1]
        : filteredItems[0];
    setActiveItem(nextItem);
    setActivePhotoIdx(0);
  };

  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveItem(null);
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, activePhotoIdx, currentIndex, filteredItems]);

  const handleShopThisLook = (product: Product) => {
    const variations = product.variations || [];
    const totalStock = variations.reduce(
      (sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0),
      0
    );
    if (variations.length > 0 && totalStock <= 0) return;
    const inStockVar = variations.find(v => (v.stock_quantity || 0) > 0) || variations[0];
    addToCart({
      product,
      selectedSize: inStockVar?.size || 'To Confirm',
      selectedColour: inStockVar?.colour || 'As Pictured',
      quantity: 1,
    });
    setQuickAdded(true);
    setTimeout(() => setQuickAdded(false), 2000);
  };

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 mb-10 border-b border-stone-200 gap-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-emerald-800 block mb-2">
            Editorial Lookbook
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-stone-900">
            The Teefahs Gallery
          </h2>
          <p className="text-xs md:text-sm text-stone-500 font-light mt-2 max-w-xl leading-relaxed">
            A live photographic showcase of authentic Teefahs Clothier garments, captured across studio angles, artisanal textures, and sweeping silhouettes.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <span>Shop Full Catalogue</span>
            <ArrowRight size={14} />
          </Link>
          {!isStandalone && (
            <Link
              to="/gallery"
              className="text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-emerald-900 transition-colors hidden sm:inline-block"
            >
              View Full Lookbook ({galleryItems.length}) &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-xs whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400 hover:bg-stone-50'
            }`}
          >
            {cat} {cat === 'All' ? `(${galleryItems.length})` : ''}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={() => openLightbox(item)}
            className="group relative bg-stone-100 rounded-xs overflow-hidden flex flex-col cursor-pointer shadow-2xs hover:shadow-xl transition-all duration-300 border border-stone-200/80"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
              <img
                src={item.url}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Hover Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5 text-white">
                <div className="flex justify-end">
                  <span className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                    <ZoomIn size={16} />
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300 block mb-1 font-semibold">
                    {item.category}
                  </span>
                  <h4 className="font-serif text-xs md:text-sm leading-snug font-medium line-clamp-2">
                    {item.title}
                  </h4>
                  {item.product && (() => {
                    const pricing = calculateProductPricing(item.product, productCategories);
                    return (
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xs text-amber-300 font-bold">
                          {pricing.formattedSellingPrice}
                        </span>
                        {pricing.hasDiscount && (
                          <span className="text-[10px] text-stone-300 line-through">
                            {pricing.formattedOriginalPrice}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white underline underline-offset-4">
                    <span>View Look &amp; Angles</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>

              {/* Static Price Badge on Corner */}
              {item.product && (() => {
                const pricing = calculateProductPricing(item.product, productCategories);
                return (
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-semibold rounded-xs shadow-sm">
                    <span>{pricing.formattedSellingPrice}</span>
                    {pricing.hasDiscount && (
                      <span className="text-[9px] font-bold text-amber-300">{pricing.discountPercentage}% OFF</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Permanent Card Bottom Footer */}
            <div className="p-2.5 bg-white border-t border-stone-100 flex flex-col gap-1.5 justify-between flex-1">
              <div>
                <p className="text-[11px] font-medium text-stone-900 truncate" title={item.title}>
                  {item.title}
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-baseline gap-1.5">
                    {item.product ? (() => {
                      const pricing = calculateProductPricing(item.product, productCategories);
                      return (
                        <>
                          <span className="text-xs font-bold text-stone-900">
                            {pricing.formattedSellingPrice}
                          </span>
                          {pricing.hasDiscount && (
                            <span className="text-[10px] text-stone-400 line-through">
                              {pricing.formattedOriginalPrice}
                            </span>
                          )}
                        </>
                      );
                    })() : (
                      <span className="text-xs font-bold text-stone-900">Enquire</span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-white max-w-4xl w-full rounded-sm overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]">
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Image Preview with Prev/Next Controls */}
            <div className="relative md:w-3/5 bg-stone-100 flex flex-col items-center justify-center overflow-hidden max-h-[60vh] md:max-h-full group">
              <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
                <img
                  src={activeItem.photos[activePhotoIdx] || activeItem.url}
                  alt={activeItem.title}
                  className="w-full h-full object-contain object-center"
                />

                {/* Previous Image Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md cursor-pointer"
                  title="Previous photograph (Left Arrow)"
                  aria-label="Previous photograph"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Next Image Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md cursor-pointer"
                  title="Next photograph (Right Arrow)"
                  aria-label="Next photograph"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Image Counter Badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono rounded-xs pointer-events-none">
                  Look {currentIndex + 1} / {filteredItems.length}
                  {activeItem.photos.length > 1 && ` · View ${activePhotoIdx + 1} / ${activeItem.photos.length}`}
                </div>
              </div>

              {activeItem.photos.length > 1 && (
                <div className="w-full p-2.5 bg-stone-200/80 border-t border-stone-300 flex items-center gap-2 overflow-x-auto">
                  {activeItem.photos.map((photoUrl, pIdx) => (
                    <button
                      key={`${photoUrl}-${pIdx}`}
                      type="button"
                      onClick={() => setActivePhotoIdx(pIdx)}
                      className={`w-12 h-14 flex-shrink-0 overflow-hidden border-2 rounded-xs cursor-pointer ${
                        activePhotoIdx === pIdx ? 'border-stone-900' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photoUrl} alt="" className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details & Actions */}
            <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between bg-white overflow-y-auto">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-800 block mb-2">
                  {activeItem.category} • Verified Boutique Piece
                </span>
                <h3 className="text-2xl font-serif text-stone-900 mb-3">
                  {activeItem.title}
                </h3>

                {activeItem.product ? (
                  <div className="space-y-4">
                    <p className="text-xs text-stone-600 font-light leading-relaxed">
                      {activeItem.product.short_description || activeItem.product.description}
                    </p>

                    {(() => {
                      const pricing = calculateProductPricing(activeItem.product, productCategories);
                      return (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block mb-0.5">
                              Price
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-serif font-bold text-stone-900">
                                {pricing.formattedSellingPrice}
                              </span>
                              {pricing.hasDiscount && (
                                <span className="text-sm text-stone-400 line-through">
                                  {pricing.formattedOriginalPrice}
                                </span>
                              )}
                            </div>
                          </div>
                          {pricing.hasDiscount && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-xs uppercase tracking-wider">
                              {pricing.discountPercentage}% OFF
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Variations Preview */}
                    {activeItem.product.variations && activeItem.product.variations.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 block">
                          Available Sizes &amp; Colours:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeItem.product.variations.map((v, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-xs">
                              {v.size} / {v.colour}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-600 font-light leading-relaxed">
                    Exclusive editorial capture from the Teefahs Clothier modest fashion collection.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-stone-200 mt-6 space-y-3">
                {activeItem.product ? (() => {
                  const vars = activeItem.product.variations || [];
                  const totalStock = vars.reduce(
                    (sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0),
                    0
                  );
                  const outOfStock = vars.length > 0 && totalStock <= 0;
                  return (
                    <>
                      <button
                        disabled={outOfStock}
                        onClick={() => handleShopThisLook(activeItem.product!)}
                        className={`w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xs transition-colors shadow-sm ${
                          outOfStock
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                        }`}
                      >
                        <ShoppingBag size={14} />
                        <span>
                          {outOfStock
                            ? 'Out of Stock'
                            : quickAdded
                            ? 'Added to Bag!'
                            : 'Shop This Look'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProductForModal(activeItem.product!);
                          setActiveItem(null);
                        }}
                        className="w-full py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xs transition-colors cursor-pointer"
                      >
                        <span>View Garment Details</span>
                      </button>
                    </>
                  );
                })() : (
                  <Link
                    to="/shop"
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xs transition-colors"
                  >
                    <span>Browse Storefront Catalogue</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal with Angle Grid & Placeholders */}
      {selectedProductForModal && (
        <ProductModal
          product={selectedProductForModal}
          categories={productCategories}
          isOpen={!!selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
        />
      )}
    </section>
  );
}
