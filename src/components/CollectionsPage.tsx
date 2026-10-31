import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CategoryGrid from './CategoryGrid';
import { SHOP_CONFIG } from '../config/shopConfig';

export default function CollectionsPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Page Banner */}
        <section className="bg-stone-900 text-stone-100 py-16 px-6 border-b border-stone-800">
          <div className="max-w-7xl mx-auto text-center">
            <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-medium block mb-3">
              Curated Wardrobe
            </span>
            <h1 className="text-4xl md:text-5xl font-serif tracking-tight">Our Collections</h1>
            <p className="text-stone-300 text-sm md:text-base mt-3 max-w-xl mx-auto font-light leading-relaxed">
              Discover dedicated modesty categories designed with precision: from grand occasion abayas to everyday prayer garments.
            </p>
          </div>
        </section>

        {/* Grid of All Collections */}
        <main className="py-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between pb-4 mb-10 border-b border-stone-200">
            <div>
              <h2 className="text-2xl font-serif text-stone-900">Explore by Category</h2>
              <p className="text-xs text-stone-500 mt-0.5">Click any collection to view matching available garments.</p>
            </div>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest font-semibold text-emerald-900 hover:underline"
            >
              View All Catalogue &rarr;
            </Link>
          </div>

          <CategoryGrid />

          {/* Bottom CTA Banner */}
          <div className="mt-16 bg-stone-100 border border-stone-200 p-8 md:p-12 text-center rounded-sm">
            <h3 className="font-serif text-2xl text-stone-900 mb-2">Can't Find Your Preferred Fit?</h3>
            <p className="text-sm text-stone-600 max-w-lg mx-auto mb-6">
              Teefahs Clothier provides custom bespoke length adjustments for abayas, prayer garments, and khimars directly on WhatsApp.
            </p>
            <a
              href={SHOP_CONFIG.whatsappChatUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-8 py-3 bg-[#25D366] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#128C7E] transition-colors rounded-xs shadow-xs"
            >
              Consult On WhatsApp
            </a>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
