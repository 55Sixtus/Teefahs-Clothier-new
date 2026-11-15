import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { calculateProductPricing } from '../utils/pricing';
import ProductCard from './ProductCard';
import PromoBanner from './PromoBanner';
import Header from './Header';
import Footer from './Footer';
import SEO from './SEO';

export default function NewArrivalsPage() {
  const { products: allProducts, categories, loading } = useRealtimeProducts({
    includeUnpublished: false,
  });
  const [selectedSort, setSelectedSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const products = useMemo(() => {
    return allProducts.filter(p => p.is_new_arrival && p.is_published);
  }, [allProducts]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (selectedSort === 'price-asc') {
        return calculateProductPricing(a, categories).sellingPrice - calculateProductPricing(b, categories).sellingPrice;
      }
      if (selectedSort === 'price-desc') {
        return calculateProductPricing(b, categories).sellingPrice - calculateProductPricing(a, categories).sellingPrice;
      }
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, categories, selectedSort]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-500">
      <SEO
        title="New Season Arrivals — Latest Modest Collection"
        description="Shop the latest modest luxury fashion arrivals at Teefahs Clothier. Handcrafted Dubai abayas, Malaysian hijabs, and French khimars with express delivery in Nigeria."
        keywords="new abayas, latest modest fashion Lagos, new khimars Nigeria, Queen Lateefah arrivals"
      />
      <div>
        <PromoBanner />
        <Header />

        {/* Hero Section */}
        <section className="bg-stone-900 text-stone-100 py-16 px-6 relative overflow-hidden border-b border-stone-800">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <span className="inline-block text-[11px] uppercase tracking-[0.25em] font-semibold text-emerald-400 mb-3">
              Latest Modest Capsule
            </span>
            <h1 className="text-4xl md:text-6xl font-serif tracking-tight">New Season Arrivals</h1>
            <p className="text-stone-300 text-sm md:text-base mt-3 max-w-xl mx-auto font-light leading-relaxed">
              Step into the latest expressions of modest luxury. Fresh cuts, breathable silk weaves, and hand-detailed finishes.
            </p>
          </div>
        </section>

        {/* Content Area */}
        <main className="py-12 px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between pb-4 mb-8 border-b border-stone-200 dark:border-stone-800">
            <span className="text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold">
              {sortedProducts.length} Exclusive New Pieces
            </span>

            <select
              value={selectedSort}
              onChange={e => setSelectedSort(e.target.value as any)}
              className="py-1.5 px-3 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-sm focus:outline-none text-stone-700 dark:text-stone-200 font-medium"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-200 dark:bg-stone-800 rounded-sm" />
              ))}
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} categories={categories} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-sm p-8 max-w-md mx-auto">
              <ShoppingBag size={36} className="mx-auto text-stone-400 mb-4" />
              <h3 className="font-serif text-xl text-stone-900 dark:text-white mb-2">New Season in Preparation</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Our latest capsule collection is currently in finishing. Please browse our complete catalogue.
              </p>
              <Link
                to="/shop"
                className="px-6 py-2.5 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors inline-block rounded-xs"
              >
                Explore Shop All
              </Link>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
