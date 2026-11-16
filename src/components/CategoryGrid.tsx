import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';

export default function CategoryGrid({ limit }: { limit?: number }) {
  const { categories, products, loading } = useRealtimeProducts({ includeUnpublished: false });

  const displayedCategories = limit ? categories.slice(0, limit) : categories;

  if (loading && displayedCategories.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(limit || 4)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-stone-200 dark:bg-stone-800 rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {displayedCategories.map(category => {
        const categoryProducts = products.filter(
          p => p.category_id === category.id || p.category_id === category.slug
        );
        const count = categoryProducts.length;
        const coverUrl =
          category.image_url ||
          categoryProducts.find(p => p.main_image_url)?.main_image_url ||
          '';

        return (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug || category.id}`}
            className="group relative aspect-[3/4] overflow-hidden bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-sm shadow-xs hover:shadow-xl transition-all duration-500 flex flex-col justify-end p-6"
          >
            {/* Background Image (only when genuine cover or live category garment image exists) */}
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={category.name}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out opacity-85 group-hover:opacity-95"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950" />
            )}

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

            {/* Content */}
            <div className="relative z-10 text-white">
              <span className="text-[11px] uppercase tracking-widest text-emerald-300 font-medium block mb-1">
                {count > 0 ? `${count} ${count === 1 ? 'Garment' : 'Garments'}` : 'Collection'}
              </span>
              <h3 className="font-serif text-2xl font-normal text-white group-hover:text-emerald-200 transition-colors">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-xs text-stone-300 font-light line-clamp-2 mt-1.5 opacity-90">
                  {category.description}
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-white group-hover:text-emerald-300 transition-colors">
                <span>Explore Pieces</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
