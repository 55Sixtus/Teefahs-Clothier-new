import Header from './Header';
import Footer from './Footer';
import GallerySection from './GallerySection';

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <Header />

      {/* Hero Banner for Gallery */}
      <div className="bg-stone-900 text-white py-16 px-6 border-b border-stone-800">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-[11px] uppercase tracking-[0.3em] text-emerald-400 font-semibold block mb-3">
            Authentic Photoshoot Exhibition
          </span>
          <h1 className="text-4xl md:text-6xl font-serif mb-4">
            The Teefahs Gallery
          </h1>
          <p className="text-stone-300 text-xs md:text-sm font-light max-w-xl mx-auto leading-relaxed">
            Explore our curated editorial catalogue featuring all 54 authentic photoshoot captures of luxury Dubai abayas, French khimars, prayer wear, and occasion robes.
          </p>
        </div>
      </div>

      <GallerySection isStandalone={true} />

      <Footer />
    </div>
  );
}
