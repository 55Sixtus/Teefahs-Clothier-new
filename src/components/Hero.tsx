import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ASSETS } from '../data/assets';

export default function Hero() {
  return (
    <section className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden bg-stone-900">
      <img
        src={ASSETS.heroImages[0]}
        alt="Teefahs Clothier - Premium Modest Fashion"
        className="absolute inset-0 w-full h-full object-cover object-top opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 text-center text-white px-6 max-w-3xl"
      >
        <span className="text-xs tracking-[0.25em] uppercase mb-4 block font-semibold text-emerald-300">
          Timeless Modesty, Effortless Elegance
        </span>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif mb-6 leading-tight tracking-tight">
          Dress modest.<br />Look elegant. Stand out.
        </h1>
        <p className="text-base md:text-lg mb-8 opacity-90 font-light max-w-xl mx-auto leading-relaxed text-stone-200">
          Discover bespoke abayas, flowing French khimars, and artisanal modest wear tailored with exceptional quality.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/shop"
            className="px-8 py-4 bg-white text-stone-900 text-xs font-semibold uppercase tracking-widest hover:bg-stone-100 transition-all duration-300 shadow-lg"
          >
            SHOP THE COLLECTION
          </Link>
          <Link
            to="/collections"
            className="px-8 py-4 bg-transparent border border-white text-white text-xs font-semibold uppercase tracking-widest hover:bg-white/15 transition-all duration-300"
          >
            EXPLORE COLLECTIONS
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
