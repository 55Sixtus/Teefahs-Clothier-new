import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { Product } from '../types/product';
import ProductCard from './ProductCard';

export default function FeaturedProducts({ 
  title = "Signature Featured Pieces", 
  filter,
  viewAllLink = "/shop"
}: { 
  title?: string; 
  filter?: (p: Product) => boolean;
  viewAllLink?: string;
}) {
  const { products: allProducts, loading } = useRealtimeProducts({ includeUnpublished: false });

  const products = useMemo(() => {
    const result = filter ? allProducts.filter(filter) : allProducts.filter(p => p.is_featured);
    return result.length > 0 ? result : allProducts.slice(0, 24);
  }, [allProducts, filter]);

  return (
    <section id="featured-products" className="py-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-10 border-b border-stone-200 gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-emerald-800 block mb-1">
            Handcrafted Luxury
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900">{title}</h2>
        </div>
        <Link
          to={viewAllLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-emerald-900 transition-colors"
        >
          View Full Catalogue <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-stone-200 rounded-sm" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 p-8 rounded-sm">
          <p className="text-stone-500 text-sm">No featured pieces available at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
