import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ASSETS } from '../data/assets';

export default function Hero() {
  return (
    <section className="relative h-[88vh] min-h-[580px] w-full flex items-center justify-center overflow-hidden bg-stone-950">
      {/* Background Image with Slow Zoom Effect */}
      <img
        src={ASSETS.heroImages[0]}
        alt="Teefahs Clothier - Premium Modest Fashion"
        className="absolute inset-0 w-full h-full object-cover object-top opacity-65 scale-105 animate-pulse duration-[10000ms]"
      />

      {/* Opulent Multi-Tone Color Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-emerald-950/30" />
      <div className="absolute inset-0 bg-radial from-transparent via-stone-950/40 to-stone-950/90" />

      {/* Decorative Gold Light Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 text-center text-white px-6 max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/80 via-stone-900/90 to-emerald-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-semibold tracking-[0.25em] uppercase mb-6 shadow-xl backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          <span>Boutique Modest Couture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif mb-6 leading-[1.1] tracking-tight text-white drop-shadow-md">
          Dress modest.<br />
          <span className="italic font-light text-amber-200/90">Look elegant.</span><br />
          Stand out.
        </h1>

        <p className="text-sm sm:text-base md:text-lg mb-8 opacity-90 font-light max-w-xl mx-auto leading-relaxed text-stone-200 drop-shadow">
          Discover bespoke abayas, flowing French khimars, and artisanal veils tailored with regal poise and uncompromised quality by Queen Lateefah.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <Link
            to="/shop"
            className="px-8 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-amber-500/20 hover:scale-[1.02] rounded-xs"
          >
            SHOP THE COLLECTION
          </Link>
          <Link
            to="/collections"
            className="px-8 py-4 bg-stone-900/80 backdrop-blur-sm border border-stone-400/60 hover:border-amber-300/80 text-white hover:text-amber-200 text-xs font-semibold uppercase tracking-widest hover:bg-white/10 transition-all duration-300 rounded-xs"
          >
            EXPLORE 8 COLLECTIONS
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
