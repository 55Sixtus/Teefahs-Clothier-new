import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { getPublishedProducts, getActiveCategories } from '../lib/api';
import { Product, Category } from '../types/product';
import ProductCard from './ProductCard';
import Header from './Header';
import Footer from './Footer';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');

  useEffect(() => {
    setLoading(true);
    Promise.all([getPublishedProducts(), getActiveCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch(err => {
        console.error('Error loading shop data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCategoryChange = (catIdOrSlug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (catIdOrSlug === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', catIdOrSlug);
    }
    setSearchParams(newParams);
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Category filtering
        if (selectedCategory !== 'all') {
          const matchId = p.category_id === selectedCategory;
          const cat = categories.find(c => c.id === p.category_id);
          const matchSlug = cat?.slug === selectedCategory;
          if (!matchId && !matchSlug) return false;
        }

        // Search filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description?.toLowerCase().includes(q) || p.short_description?.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return (a.base_price || 0) - (b.base_price || 0);
        if (sortBy === 'price-desc') return (b.base_price || 0) - (a.base_price || 0);
        if (sortBy === 'newest') return (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0);
        // Default featured
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [products, categories, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Page Banner */}
        <section className="bg-stone-900 text-stone-100 py-14 px-6 border-b border-stone-800">
          <div className="max-w-7xl mx-auto text-center">
            <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-medium block mb-3">
              The Complete Collection
            </span>
            <h1 className="text-4xl md:text-5xl font-serif tracking-tight">Shop All Pieces</h1>
            <p className="text-stone-300 text-sm md:text-base mt-3 max-w-xl mx-auto font-light">
              Explore our curated selection of bespoke abayas, flowing khimars, prayer sets, and modest essentials.
            </p>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="sticky top-[69px] z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 py-4 px-6 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Pieces ({products.length})
              </button>
              {categories.map(cat => {
                const count = products.filter(p => p.category_id === cat.id || p.category_id === cat.slug).length;
                const isSelected = selectedCategory === cat.id || selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.slug || cat.id)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full uppercase tracking-wider transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat.name} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative flex-1 md:w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search garments..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-500"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="py-1.5 pl-3 pr-8 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none text-stone-700 font-medium"
                >
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <main className="py-12 px-6 max-w-7xl mx-auto">
          {/* Active Status Bar */}
          <div className="flex items-center justify-between text-xs text-stone-500 mb-8 pb-3 border-b border-stone-200">
            <span>
              Showing <strong className="text-stone-800">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'garment' : 'garments'}
              {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory || c.slug === selectedCategory)?.name || selectedCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>

            {(selectedCategory !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  handleCategoryChange('all');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1.5 text-emerald-800 font-medium hover:underline"
              >
                <RotateCcw size={12} />
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-200 rounded-sm" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white border border-stone-200 rounded-sm p-8 max-w-md mx-auto">
              <SlidersHorizontal size={40} className="mx-auto text-stone-300 mb-4" />
              <h3 className="font-serif text-xl text-stone-900 mb-2">No Garments Found</h3>
              <p className="text-sm text-stone-500 mb-6">
                We couldn't find any garments matching your current filter criteria.
              </p>
              <button
                onClick={() => {
                  handleCategoryChange('all');
                  setSearchQuery('');
                }}
                className="px-6 py-2.5 bg-stone-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors"
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
