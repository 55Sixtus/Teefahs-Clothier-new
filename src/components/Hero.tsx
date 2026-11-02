import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ASSETS } from '../data/assets';
import { useTheme } from '../context/ThemeContext';

export default function Hero() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className={`
      relative min-h-[640px] h-[88vh] w-full flex items-center justify-center overflow-hidden transition-colors duration-500
      ${isDark ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}
    `}>
      {/* 1. High-Resolution Editorial Photoshoot Background */}
      <img
        src={ASSETS.heroImages[0]}
        alt="Teefahs Clothier - Haute Modest Couture"
        className={`
          absolute inset-0 w-full h-full object-cover object-top transition-all duration-700
          ${isDark ? 'opacity-80 brightness-95' : 'opacity-90 brightness-110 contrast-105'}
        `}
      />

      {/* 2. Natural Editorial Photographic Scrims (No Synthetic AI Blobs) */}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/65 to-stone-950/40" />
          <div className="absolute inset-0 bg-radial from-transparent via-stone-950/40 to-stone-950/80" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-white/55 to-amber-100/25 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-radial from-amber-100/20 via-white/35 to-stone-50/75" />
        </>
      )}

      {/* 3. Hero Editorial Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Prestige Atelier Kicker (Clean Unboxed Typography) */}
        <div className="mb-5">
          <span className={`text-[11px] sm:text-xs uppercase tracking-[0.3em] font-semibold transition-colors duration-300 ${
            isDark ? 'text-amber-300' : 'text-emerald-900'
          }`}>
            Queen Lateefah Atelier · Haute Modest Couture
          </span>
        </div>

        {/* Hero Title (Editorial, International Luxury) */}
        <h1 className={`
          text-4xl sm:text-6xl md:text-7xl font-serif mb-6 leading-[1.08] tracking-tight transition-colors duration-500
          ${isDark ? 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]' : 'text-stone-900 drop-shadow-[0_2px_10px_rgba(255,255,255,0.9)]'}
        `}>
          Dress modest.<br />
          <span className={`italic font-light transition-colors duration-500 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
            Look elegant.
          </span><br />
          Stand out.
        </h1>

        {/* Hero Subtitle */}
        <p className={`
          text-base sm:text-lg md:text-xl mb-9 font-light max-w-2xl mx-auto leading-relaxed transition-colors duration-500
          ${isDark ? 'text-stone-200' : 'text-stone-800 font-normal'}
        `}>
          Bespoke Dubai abayas, flowing French khimars, and radiant stretch veils crafted with immaculate grace and poise.
        </p>

        {/* Call to Actions (Architectural, High-End Luxury) */}
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center w-full max-w-md mx-auto">
          <Link
            to="/shop"
            className="px-9 py-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-200 rounded-xs shadow-sm flex items-center justify-center gap-2"
          >
            <span>Shop The Collection</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/collections"
            className={`
              px-9 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-200 rounded-xs flex items-center justify-center gap-2 shadow-xs
              ${
                isDark
                  ? 'bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-white hover:text-amber-200'
                  : 'bg-white/95 hover:bg-stone-100 border border-stone-300 text-stone-900 hover:text-emerald-950'
              }
            `}
          >
            <span>Explore 8 Collections</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
