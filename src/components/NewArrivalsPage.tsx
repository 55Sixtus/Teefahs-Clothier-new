import { useState, useEffect, useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { getPublishedProducts } from '../lib/api';
import { Product } from '../types/product';
import ProductCard from './ProductCard';
import Header from './Header';
import Footer from './Footer';

export default function NewArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSort, setSelectedSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  useEffect(() => {
    setLoading(true);
    getPublishedProducts()
      .then(allProducts => {
        // Filter strictly for verified published products marked as new arrivals
        const newOnes = allProducts.filter(p => p.is_new_arrival && p.is_published);
        setProducts(newOnes);
      })
      .catch(err => {
        console.error('Error fetching new arrivals:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (selectedSort === 'price-asc') return (a.base_price || 0) - (b.base_price || 0);
      if (selectedSort === 'price-desc') return (b.base_price || 0) - (a.base_price || 0);
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, selectedSort]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <div>
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
          <div className="flex items-center justify-between pb-4 mb-8 border-b border-stone-200">
            <span className="text-xs uppercase tracking-wider text-stone-600 font-semibold">
              {sortedProducts.length} Exclusive New Pieces
            </span>

            <select
              value={selectedSort}
              onChange={e => setSelectedSort(e.target.value as any)}
              className="py-1.5 px-3 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none text-stone-700 font-medium"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-200 rounded-sm" />
              ))}
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-stone-200 rounded-sm p-8 max-w-md mx-auto">
              <ShoppingBag size={36} className="mx-auto text-stone-400 mb-4" />
              <h3 className="font-serif text-xl text-stone-900 mb-2">New Season in Preparation</h3>
              <p className="text-sm text-stone-500 mb-6">
                Our latest capsule collection is currently in finishing. Please browse our complete catalogue.
              </p>
              <a
                href="/shop"
                className="px-6 py-2.5 bg-stone-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors inline-block"
              >
                Explore Shop All
              </a>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
