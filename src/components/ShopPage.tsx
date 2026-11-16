import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { calculateProductPricing } from '../utils/pricing';
import ProductCard from './ProductCard';
import Header from './Header';
import Footer from './Footer';
import SEO from './SEO';
import PromoBanner from './PromoBanner';

const CATEGORY_ALIASES: Record<string, string[]> = {
  workwear: ['workwear', 'work-wear', 'workerwear', 'work wear'],
  'work-wear': ['work-wear', 'workwear', 'workerwear', 'work wear'],
  workerwear: ['workerwear', 'workwear', 'work-wear', 'work wear'],
};

const getCanonicalCategoryLabel = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'work wear' || normalized === 'workerwear' || normalized === 'workwear') {
    return 'Workwear';
  }
  return name;
};

export default function ShopPage() {
  const { products, categories, loading, error } = useRealtimeProducts({ includeUnpublished: false });
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Advanced real-data filters
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColour, setSelectedColour] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(false);

  const handleCategoryChange = (catIdOrSlug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (catIdOrSlug === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', catIdOrSlug);
    }
    setSearchParams(newParams);
  };

  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return undefined;
    const direct = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
    const aliases = CATEGORY_ALIASES[selectedCategory.toLowerCase()] || [];
    if (aliases.length === 0) return direct;

    const aliasMatches = categories.filter(
      (c) =>
        aliases.includes((c.slug || '').toLowerCase()) ||
        aliases.includes((c.name || '').toLowerCase())
    );
    const populatedMatch = aliasMatches.find((c) => products.some((p) => p.category_id === c.id));
    return populatedMatch || direct || aliasMatches[0];
  }, [categories, products, selectedCategory]);

  // Dynamically derive available Sizes and Colours from live database variations
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) =>
      (p.variations || []).forEach((v) => {
        if (v.size) set.add(v.size.trim());
      })
    );
    return Array.from(set).sort();
  }, [products]);

  const availableColours = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) =>
      (p.variations || []).forEach((v) => {
        if (v.colour) set.add(v.colour.trim());
      })
    );
    return Array.from(set).sort();
  }, [products]);

  const categoryMatchForProduct = (productCategoryId?: string, filterSlugOrId?: string): boolean => {
    if (!filterSlugOrId || filterSlugOrId === 'all') return true;
    if (productCategoryId === filterSlugOrId) return true;

    const prodCat = categories.find((c) => c.id === productCategoryId);
    if (!prodCat) return false;
    if (prodCat.slug === filterSlugOrId) return true;

    const lowerFilter = filterSlugOrId.toLowerCase();
    const aliases = CATEGORY_ALIASES[lowerFilter] || [];
    if (
      aliases.includes((prodCat.slug || '').toLowerCase()) ||
      aliases.includes((prodCat.name || '').toLowerCase())
    ) {
      return true;
    }
    return false;
  };

  const filteredProducts = useMemo(() => {
    const minVal = minPrice !== '' && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null;
    const maxVal = maxPrice !== '' && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null;

    return products
      .filter((p) => {
        if (!categoryMatchForProduct(p.category_id, selectedCategory)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const cat = categories.find((c) => c.id === p.category_id);
          const varMatch = (p.variations || []).some(
            (v) =>
              v.colour?.toLowerCase().includes(q) ||
              v.size?.toLowerCase().includes(q) ||
              v.sku?.toLowerCase().includes(q)
          );
          const matchText =
            p.name.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.short_description?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.fabric_type?.toLowerCase().includes(q) ||
            p.country_of_origin?.toLowerCase().includes(q) ||
            cat?.name.toLowerCase().includes(q) ||
            varMatch;
          if (!matchText) return false;
        }

        const vars = (p.variations || []).filter((v) => v.is_active !== false);
        if (selectedSize !== 'all') {
          if (!vars.some((v) => v.size?.trim().toLowerCase() === selectedSize.toLowerCase())) {
            return false;
          }
        }
        if (selectedColour !== 'all') {
          if (!vars.some((v) => v.colour?.trim().toLowerCase() === selectedColour.toLowerCase())) {
            return false;
          }
        }

        if (inStockOnly) {
          const hasVars = vars.length > 0;
          const totalStock = vars.reduce((s, v) => s + Math.max(0, Number(v.stock_quantity) || 0), 0);
          if (hasVars && totalStock <= 0) return false;
        }

        if (newArrivalsOnly && !p.is_new_arrival) return false;

        const price = calculateProductPricing(p, categories).sellingPrice;
        if (minVal !== null && price < minVal) return false;
        if (maxVal !== null && price > maxVal) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') {
          return (
            calculateProductPricing(a, categories).sellingPrice -
            calculateProductPricing(b, categories).sellingPrice
          );
        }
        if (sortBy === 'price-desc') {
          return (
            calculateProductPricing(b, categories).sellingPrice -
            calculateProductPricing(a, categories).sellingPrice
          );
        }
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'newest') return (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0);
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [
    products,
    categories,
    selectedCategory,
    searchQuery,
    selectedSize,
    selectedColour,
    minPrice,
    maxPrice,
    inStockOnly,
    newArrivalsOnly,
    sortBy,
  ]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    selectedSize !== 'all' ||
    selectedColour !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    inStockOnly ||
    newArrivalsOnly;

  const resetAllFilters = () => {
    handleCategoryChange('all');
    setSearchQuery('');
    setSelectedSize('all');
    setSelectedColour('all');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setNewArrivalsOnly(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-500">
      <SEO
        title={
          selectedCategory !== 'all'
            ? `${activeCategoryObj ? getCanonicalCategoryLabel(activeCategoryObj.name) : getCanonicalCategoryLabel(selectedCategory)} Collection`
            : 'Shop All Pieces — Abayas, Khimars & Modestwear'
        }
        description="Explore Teefahs Clothier: bespoke Dubai & Nigerian abayas, French khimars, workwear, prayer dresses, and modest headwear."
      />
      <div>
        <PromoBanner />
        <Header />

        {/* Editorial Header */}
        <section className="bg-stone-900 text-stone-100 py-12 px-6 border-b border-stone-800">
          <div className="max-w-7xl mx-auto text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] text-emerald-400 font-medium block mb-2.5">
              Curated Catalogue
            </span>
            <h1 className="text-3xl md:text-5xl font-serif tracking-tight">
              {activeCategoryObj ? getCanonicalCategoryLabel(activeCategoryObj.name) : 'Shop All Pieces'}
            </h1>
            <p className="text-stone-300 text-sm mt-2.5 max-w-xl mx-auto font-light">
              {activeCategoryObj?.description ||
                'Explore bespoke abayas, flowing khimars, workwear, prayer sets, and modest headwear.'}
            </p>
          </div>
        </section>

        {/* Clean Architectural Category Tabs & Controls */}
        <div className="sticky top-[62px] z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 py-3.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Architectural Horizontal Tabs (no decorative pills) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-300 font-bold'
                      : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories
                  .filter((cat) => {
                    const directCount = products.filter((p) => p.category_id === cat.id).length;
                    if (directCount > 0) return true;
                    const lowerSlug = (cat.slug || '').toLowerCase();
                    const aliases = CATEGORY_ALIASES[lowerSlug] || [];
                    const hasPopulatedAlias = aliases.some((alias) =>
                      categories.some(
                        (other) =>
                          other.id !== cat.id &&
                          ((other.slug || '').toLowerCase() === alias ||
                            (other.name || '').toLowerCase() === alias) &&
                          products.some((p) => p.category_id === other.id)
                      )
                    );
                    return !hasPopulatedAlias;
                  })
                  .map((cat) => {
                    const count = products.filter((p) => categoryMatchForProduct(p.category_id, cat.slug || cat.id)).length;
                    const selectedAliases = CATEGORY_ALIASES[selectedCategory.toLowerCase()] || [];
                    const isSelected =
                      selectedCategory === cat.id ||
                      selectedCategory === cat.slug ||
                      selectedAliases.includes((cat.slug || '').toLowerCase()) ||
                      selectedAliases.includes((cat.name || '').toLowerCase());
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.slug || cat.id)}
                        className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                          isSelected
                            ? 'border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-300 font-bold'
                            : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                        }`}
                      >
                        {getCanonicalCategoryLabel(cat.name)}
                        {count > 0 ? ` (${count})` : ''}
                      </button>
                    );
                  })}
              </div>

              {/* Search, Filter Toggle & Sort */}
              <div className="flex flex-wrap items-center gap-2.5 justify-end">
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search title, SKU, colour, fabric..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="px-3 py-2 text-xs font-medium border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <SlidersHorizontal size={13} />
                  <span>Filters</span>
                  {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="py-2 px-3 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 focus:outline-none font-medium"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">New Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A–Z</option>
                </select>
              </div>
            </div>

            {/* Expandable Multi-Facet Filter Drawer */}
            {filtersOpen && (
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                    Min Price (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                    Max Price (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 250000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                    Size
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  >
                    <option value="all">All Sizes</option>
                    {availableSizes.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                    Colour
                  </label>
                  <select
                    value={selectedColour}
                    onChange={(e) => setSelectedColour(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  >
                    <option value="all">All Colours</option>
                    {availableColours.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-emerald-800"
                  />
                  <span>In Stock Only</span>
                </label>
                <label className="flex items-center gap-2 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArrivalsOnly}
                    onChange={(e) => setNewArrivalsOnly(e.target.checked)}
                    className="w-4 h-4 accent-emerald-800"
                  />
                  <span>New Arrivals</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Catalogue Grid */}
        <main className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-200">
              Could not reach live product catalogue: {error}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-7 pb-3 border-b border-stone-200 dark:border-stone-800">
            <span>
              Showing <strong className="text-stone-900 dark:text-white">{filteredProducts.length}</strong>{' '}
              {filteredProducts.length === 1 ? 'garment' : 'garments'}
              {selectedCategory !== 'all' &&
                ` in ${activeCategoryObj ? getCanonicalCategoryLabel(activeCategoryObj.name) : getCanonicalCategoryLabel(selectedCategory)}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 text-emerald-800 dark:text-amber-300 font-medium hover:underline cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-200 dark:bg-stone-800" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} categories={categories} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 max-w-md mx-auto">
              <SlidersHorizontal size={36} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
              <h3 className="font-serif text-xl text-stone-900 dark:text-white mb-2">
                {selectedCategory.toLowerCase().includes('kmouse') ||
                activeCategoryObj?.name?.toLowerCase().includes('kmouse')
                  ? 'New Kmouse Collection Coming Soon.'
                  : 'No Matching Garments'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 font-light">
                {selectedCategory.toLowerCase().includes('kmouse') ||
                activeCategoryObj?.name?.toLowerCase().includes('kmouse')
                  ? 'Genuine Kmouse garments will be published here once approved by our Lagos atelier.'
                  : 'No garments match your active category or filter combination.'}
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-6 py-2.5 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                View All Garments
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
