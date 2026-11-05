import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, ArrowRight, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { SUPPLIED_PHOTOS } from '../data/assets';
import { getAllProducts } from '../lib/api';
import { Product } from '../types/product';
import ProductDetailsModal from './ProductDetailsModal';
import { useCart } from '../context/CartContext';

interface GalleryItem {
  id: number;
  url: string;
  title: string;
  category: string;
  productSlug?: string;
  product?: Product;
}

interface GallerySectionProps {
  isStandalone?: boolean;
  limit?: number;
}

export default function GallerySection({ isStandalone = false, limit }: GallerySectionProps) {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [quickAdded, setQuickAdded] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const live = await getAllProducts();
      setProducts(live);
    } catch (e) {
      console.error('Failed to load products for gallery:', e);
    }
  };

  // Build gallery items linked directly to live products in database
  const galleryItems: GalleryItem[] = useMemo(() => {
    return SUPPLIED_PHOTOS.map((url, index) => {
      let title = `Editorial Silhouette #${index + 1}`;
      let category = 'Modest Collection';
      let slug = '';

      if (index === 0) {
        title = 'Royal Black Embellished Occasion Abaya';
        category = 'Occasion Wear';
        slug = 'royal-black-embellished-occasion-abaya';
      } else if (index === 1) {
        title = 'Noor Ceremonial Black Silk Occasion Robe';
        category = 'Occasion Wear';
        slug = 'noor-ceremonial-black-silk-occasion-robe';
      } else if (index === 2) {
        title = 'Kamp Elegance Embroidered Evening Abaya';
        category = 'Occasion Wear';
        slug = 'kamp-elegance-embroidered-evening-abaya';
      } else if (index >= 3 && index <= 8) {
        title = 'Noor Luxury Embroidered Abaya';
        category = 'Abayas';
        slug = 'noor-embroidered-luxury-abaya';
      } else if (index >= 9 && index <= 14) {
        title = 'Ameera Tiered Chiffon Open Abaya';
        category = 'Abayas';
        slug = 'ameera-tiered-chiffon-open-abaya';
      } else if (index >= 15 && index <= 19) {
        title = 'Zahra French Diamond Khimar';
        category = 'Khimars';
        slug = 'zahra-french-diamond-khimar';
      } else if (index >= 20 && index <= 25) {
        title = 'Maryam Flowing Two-Piece Prayer Set';
        category = 'Prayer Wear';
        slug = 'maryam-flowing-two-piece-prayer-set';
      } else if (index === 26) {
        title = 'Layla Embellished Luxury Occasion Silk Abaya';
        category = 'Occasion Wear';
        slug = 'layla-embellished-occasion-silk-abaya';
      } else if (index === 27) {
        title = 'Zeenat Royal Gold Thread Occasion Abaya';
        category = 'Occasion Wear';
        slug = 'zeenat-royal-gold-thread-occasion-abaya';
      } else if (index === 28) {
        title = 'Malika Crystal-Draped Evening Occasion Gown';
        category = 'Occasion Wear';
        slug = 'malika-crystal-draped-evening-occasion-gown';
      } else if (index >= 29 && index <= 32) {
        title = 'Hafsah Medina Silk Rounded Khimar';
        category = 'Khimars';
        slug = 'hafsah-medina-silk-rounded-khimar';
      } else if (index >= 33 && index <= 34) {
        title = 'Fatima Pleated Hem Minimalist Abaya';
        category = 'Abayas';
        slug = 'fatima-pleated-hem-minimalist-abaya';
      } else if (index >= 35 && index <= 39) {
        title = 'Amani Breathable Chiffon Veil & Hijab';
        category = 'Veils & Hijabs';
        slug = 'amani-breathable-chiffon-veil-hijab-set';
      } else if (index === 40) {
        title = 'Sultana Beaded Evening Occasion Kimono';
        category = 'Occasion Wear';
        slug = 'sultana-beaded-evening-occasion-kimono';
      } else if (index === 41) {
        title = 'Soraya Hand-Beaded Black Occasion Kimono';
        category = 'Occasion Wear';
        slug = 'soraya-hand-beaded-black-occasion-kimono';
      } else if (index === 42) {
        title = 'Jawhara Royal Evening Silk Kimono';
        category = 'Occasion Wear';
        slug = 'jawhara-royal-evening-silk-kimono';
      } else if (index === 43) {
        title = 'Sultana Beaded Sweeping Hemline Kimono';
        category = 'Occasion Wear';
        slug = 'sultana-beaded-sweeping-hemline-kimono';
      } else if (index >= 44 && index <= 48) {
        title = 'Rukayyah Zip-Front Hooded Prayer Abaya';
        category = 'Prayer Wear';
        slug = 'rukayyah-zip-front-hooded-prayer-abaya';
      } else if (index >= 49 && index <= 53) {
        title = 'Zainab Luxe Modal Hijab & Under-Cap';
        category = 'Caps & Hijabs';
        slug = 'zainab-luxe-modal-hijab-under-cap-set';
      }

      const product = products.find(p => p.slug === slug || p.main_image_url === url);

      return {
        id: index,
        url,
        title: product?.name || title,
        category,
        productSlug: slug,
        product,
      };
    });
  }, [products]);

  const categories = ['All', 'Abayas', 'Khimars', 'Prayer Wear', 'Occasion Wear', 'Veils & Hijabs', 'Caps & Hijabs'];

  const filteredItems = selectedCategory === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedCategory);

  const displayItems = limit ? filteredItems.slice(0, limit) : filteredItems;

  const currentIndex = activeItem ? filteredItems.findIndex(i => i.id === activeItem.id) : -1;

  const goToPrevious = () => {
    if (filteredItems.length === 0) return;
    if (currentIndex > 0) {
      setActiveItem(filteredItems[currentIndex - 1]);
    } else {
      setActiveItem(filteredItems[filteredItems.length - 1]);
    }
  };

  const goToNext = () => {
    if (filteredItems.length === 0) return;
    if (currentIndex >= 0 && currentIndex < filteredItems.length - 1) {
      setActiveItem(filteredItems[currentIndex + 1]);
    } else {
      setActiveItem(filteredItems[0]);
    }
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
  }, [activeItem, currentIndex, filteredItems]);

  const handleShopThisLook = (product: Product) => {
    addToCart({
      product,
      selectedSize: product.variations?.[0]?.size || 'Standard',
      selectedColour: product.variations?.[0]?.colour || 'Original',
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
            A photographic celebration of all {SUPPLIED_PHOTOS.length} authentic modest garments, captured across dynamic angles, artisanal textures, and sweeping silhouettes.
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
              View All {SUPPLIED_PHOTOS.length} Photos &rarr;
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
            onClick={() => setActiveItem(item)}
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
                  {item.product && (
                    <p className="text-xs text-amber-300 mt-1 font-bold">
                      ₦{item.product.base_price ? item.product.base_price.toLocaleString() : 'Enquire'}
                    </p>
                  )}
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white underline underline-offset-4">
                    <span>View Look &amp; Angles</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>

              {/* Static Price Badge on Corner */}
              {item.product?.base_price && (
                <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-semibold rounded-xs shadow-sm">
                  ₦{item.product.base_price.toLocaleString()}
                </div>
              )}
            </div>

            {/* Permanent Card Bottom Footer */}
            <div className="p-2.5 bg-white border-t border-stone-100 flex flex-col gap-1.5 justify-between flex-1">
              <div>
                <p className="text-[11px] font-medium text-stone-900 truncate" title={item.title}>
                  {item.title}
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-bold text-stone-900">
                    ₦{item.product?.base_price ? item.product.base_price.toLocaleString() : 'Enquire'}
                  </span>
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
            <div className="relative md:w-3/5 bg-stone-100 flex items-center justify-center overflow-hidden max-h-[55vh] md:max-h-full group">
              <img
                src={activeItem.url}
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
                {currentIndex + 1} / {filteredItems.length}
              </div>
            </div>

            {/* Details & Actions */}
            <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between bg-white overflow-y-auto">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-800 block mb-2">
                  {activeItem.category} • View all angles &amp; details
                </span>
                <h3 className="text-2xl font-serif text-stone-900 mb-3">
                  {activeItem.title}
                </h3>

                {activeItem.product ? (
                  <div className="space-y-4">
                    <p className="text-xs text-stone-600 font-light leading-relaxed">
                      {activeItem.product.short_description || activeItem.product.description}
                    </p>

                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block mb-0.5">
                          Price
                        </span>
                        <span className="text-xl font-serif font-bold text-stone-900">
                          ₦{activeItem.product.base_price ? activeItem.product.base_price.toLocaleString() : 'Enquire'}
                        </span>
                      </div>
                    </div>

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
                {activeItem.product ? (
                  <>
                    <button
                      onClick={() => handleShopThisLook(activeItem.product!)}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <ShoppingBag size={14} />
                      <span>{quickAdded ? 'Added to Bag!' : 'Shop This Look'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProductForModal(activeItem.product!);
                        setActiveItem(null);
                      }}
                      className="w-full py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xs transition-colors cursor-pointer"
                    >
                      <span>View Front, Back &amp; Side Views</span>
                    </button>
                  </>
                ) : (
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

      {/* Details Modal */}
      {selectedProductForModal && (
        <ProductDetailsModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
        />
      )}
    </section>
  );
}
