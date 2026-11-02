import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Moon } from 'lucide-react';
import { ASSETS } from '../data/assets';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function Hero() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className={`
      relative min-h-[640px] h-[90vh] w-full flex items-center justify-center overflow-hidden transition-colors duration-700
      ${isDark ? 'bg-stone-950 text-white' : 'bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-100 text-stone-900'}
    `}>
      {/* 1. Luminous High-Resolution Photoshoot Background (Significantly Brightened) */}
      <img
        src={ASSETS.heroImages[0]}
        alt="Teefahs Clothier - Premium Modest Fashion"
        className={`
          absolute inset-0 w-full h-full object-cover object-top transition-all duration-700
          ${isDark ? 'opacity-80 brightness-95 scale-100' : 'opacity-90 brightness-110 contrast-105 scale-100'}
        `}
      />

      {/* 2. Magnificent Multi-Tone Colorful Lighting Overlays */}
      {isDark ? (
        <>
          {/* Dark Mode: Royal Velvet Emerald & Starlight Gold Lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-emerald-950/40" />
          <div className="absolute inset-0 bg-radial from-transparent via-stone-950/30 to-stone-950/80" />
          {/* Radiant Emerald Glow */}
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none animate-shimmer-glow" />
          {/* Radiant Golden Glow */}
          <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-amber-500/15 rounded-full blur-[100px] pointer-events-none animate-shimmer-glow" />
        </>
      ) : (
        <>
          {/* Light Mode: Sunlit Luminous Gold, Champagne & Soft Emerald Wash */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-white/60 to-amber-100/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-radial from-amber-100/30 via-white/40 to-stone-50/80" />
          {/* Sunbeam Golden Radial Lights */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-amber-300/30 via-yellow-200/20 to-transparent rounded-full blur-[90px] pointer-events-none animate-shimmer-glow" />
          {/* Fresh Emerald Shimmer */}
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      {/* 3. Hero Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Interactive Magnificent Lighting Switch Ribbon */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <div className={`
            inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase transition-all shadow-lg backdrop-blur-md
            ${
              isDark
                ? 'bg-stone-900/90 text-amber-300 border border-amber-500/50 shadow-emerald-950/50'
                : 'bg-white/95 text-emerald-900 border border-amber-400/80 shadow-amber-500/20'
            }
          `}>
            <Sparkles size={13} className={isDark ? 'text-amber-400 animate-spin duration-[5000ms]' : 'text-emerald-600 animate-bounce'} />
            <span>Queen Lateefah Collection</span>
            <span className="w-1 h-1 rounded-full bg-amber-400"></span>
            <span className="hidden sm:inline text-[10px] font-light">Boutique Modest Couture</span>
          </div>

          {/* Magnificent Lighting Mode Toggle in Hero */}
          <div className={`
            inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border shadow-md transition-all
            ${
              isDark
                ? 'bg-stone-900/80 border-emerald-500/40 text-stone-300'
                : 'bg-white/90 border-amber-300 text-stone-700'
            }
          `}>
            <span className="text-[10px] uppercase font-bold tracking-wider hidden md:inline">
              {isDark ? 'Night Glamour' : 'Daylight Glow'}
            </span>
            <ThemeToggle variant="header" />
          </div>
        </div>

        {/* Hero Title (Bright, High-Contrast & Beautiful) */}
        <h1 className={`
          text-4xl sm:text-6xl md:text-7xl font-serif mb-6 leading-[1.08] tracking-tight transition-colors duration-500
          ${isDark ? 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]' : 'text-stone-900 drop-shadow-[0_2px_10px_rgba(255,255,255,0.9)]'}
        `}>
          Dress modest.<br />
          <span className={`italic font-light transition-colors duration-500 ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
            Look elegant.
          </span><br />
          Stand out.
        </h1>

        {/* Hero Subtitle */}
        <p className={`
          text-base sm:text-lg md:text-xl mb-8 font-light max-w-2xl mx-auto leading-relaxed transition-colors duration-500
          ${isDark ? 'text-stone-200 opacity-95 drop-shadow' : 'text-stone-800 font-normal drop-shadow-xs'}
        `}>
          Bespoke Dubai abayas, flowing French khimars, and radiant stretch veils crafted with immaculate grace and poise.
        </p>

        {/* Call to Actions (Vibrant, Colorful & Inviting) */}
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center w-full max-w-md mx-auto">
          <Link
            to="/shop"
            className="px-8 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] rounded-xs flex items-center justify-center gap-2"
          >
            <Sun size={14} className="text-stone-950" />
            <span>SHOP THE COLLECTION</span>
          </Link>

          <Link
            to="/collections"
            className={`
              px-8 py-4 text-xs font-semibold uppercase tracking-widest transition-all duration-300 rounded-xs flex items-center justify-center gap-2 shadow-sm
              ${
                isDark
                  ? 'bg-stone-900/90 hover:bg-stone-800 border border-stone-600 text-white hover:text-amber-200'
                  : 'bg-white/95 hover:bg-stone-100 border border-stone-300 text-stone-900 hover:text-emerald-900'
              }
            `}
          >
            <span>EXPLORE 8 COLLECTIONS</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
