import { Link } from 'react-router-dom';
import { Award, ShieldCheck, Heart } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { ASSETS } from '../data/assets';

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Hero Banner */}
        <section className="relative h-[55vh] min-h-[380px] bg-stone-900 overflow-hidden flex items-center justify-center text-center px-6">
          <img
            src={ASSETS.heroImages[1] || ASSETS.heroImages[0]}
            alt="Teefahs Clothier Modest Elegance"
            className="absolute inset-0 w-full h-full object-cover opacity-40 object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />

          <div className="relative z-10 max-w-3xl mx-auto text-white">
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-semibold mb-3 block">
              The Brand Journey
            </span>
            <h1 className="text-4xl md:text-6xl font-serif leading-tight">
              Timeless Modesty, Effortless Elegance
            </h1>
            <p className="text-stone-300 text-sm md:text-base mt-4 font-light max-w-xl mx-auto italic">
              "Dress modest. Look elegant. Stand out."
            </p>
          </div>
        </section>

        {/* Narrative Section */}
        <main className="py-20 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-2">
                Our Philosophy
              </span>
              <h2 className="text-3xl font-serif text-stone-900 mb-6 leading-snug">
                Modesty as an Art Form
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                At <strong>Teefahs Clothier</strong>, we believe that true elegance does not ask for compromise. Modesty is not merely an absence of excess—it is a conscious statement of dignity, self-respect, and poise.
              </p>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                Born out of a desire for premium, breathable, and beautifully structured modest garments for Muslim women and modest-dressers across the globe, our creations merge traditional modesty codes with contemporary editorial tailoring.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/shop"
                  className="px-6 py-3 bg-stone-900 text-white text-xs uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors"
                >
                  Shop The Pieces
                </Link>
                <Link
                  to="/contact"
                  className="px-6 py-3 border border-stone-300 text-stone-800 text-xs uppercase tracking-widest font-medium hover:bg-stone-100 transition-colors"
                >
                  Get In Touch
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] bg-stone-200 overflow-hidden rounded-sm shadow-xl">
                <img
                  src={ASSETS.productImages[2] || ASSETS.heroImages[2]}
                  alt="Craftsmanship and Flow"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-5 shadow-lg border border-stone-200 max-w-xs hidden sm:block">
                <p className="text-xs font-serif italic text-stone-800">
                  "Thoughtfully designed garments that honour your values while celebrating your individuality."
                </p>
              </div>
            </div>
          </div>

          {/* Pillars of Teefahs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-stone-200">
            <div className="bg-white p-8 border border-stone-200 rounded-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-serif text-lg text-stone-900 mb-2">Uncompromised Coverage</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Generous silhouettes, full lengths, and opaque luxury weaves designed to provide confident modesty throughout your day.
              </p>
            </div>

            <div className="bg-white p-8 border border-stone-200 rounded-sm">
              <div className="w-10 h-10 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mb-4">
                <Award size={20} />
              </div>
              <h3 className="font-serif text-lg text-stone-900 mb-2">Artisanal Details</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                From hand-guided cuff embroidery to magnetic snap closures and deep tailored pockets, every element serves grace and function.
              </p>
            </div>

            <div className="bg-white p-8 border border-stone-200 rounded-sm">
              <div className="w-10 h-10 bg-stone-100 text-stone-800 rounded-full flex items-center justify-center mb-4">
                <Heart size={20} />
              </div>
              <h3 className="font-serif text-lg text-stone-900 mb-2">Personal Service</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Direct WhatsApp consultation with our styling team ensures bespoke sizing advice, colour matching, and swift nationwide delivery.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
