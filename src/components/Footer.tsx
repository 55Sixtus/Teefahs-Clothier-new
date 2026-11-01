import { Link } from 'react-router-dom';
import { MessageCircle, Instagram, Lock, Mail, MapPin, Globe } from 'lucide-react';
import { ASSETS } from '../data/assets';
import { SHOP_CONFIG } from '../config/shopConfig';

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-300 py-16 px-6 border-t border-stone-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 max-w-7xl mx-auto">
        {/* Brand Column */}
        <div className="flex flex-col gap-3.5 sm:col-span-2 md:col-span-1">
          <Link to="/" className="inline-block">
            <img 
              src={ASSETS.logo} 
              alt="Teefahs Clothier" 
              className="h-9 w-auto invert brightness-200 object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = '/logo.png';
                }
              }}
            />
          </Link>
          <p className="text-xs text-stone-400 leading-relaxed font-light">
            Timeless Modesty, Effortless Elegance.
          </p>
          <p className="text-xs text-emerald-400 font-serif italic">
            "Dress modest. Look elegant. Stand out."
          </p>

          <div className="flex items-center gap-3 mt-2">
            <a
              href={SHOP_CONFIG.whatsappChatUrl}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-emerald-900/60 text-emerald-300 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors"
              title={`WhatsApp: ${SHOP_CONFIG.whatsappDisplay}`}
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
            <a
              href={SHOP_CONFIG.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-pink-950/60 text-pink-300 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors"
              title="Instagram Profile"
              aria-label="Instagram Profile"
            >
              <Instagram size={16} />
            </a>
            <a
              href={`mailto:${SHOP_CONFIG.email}`}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 hover:text-white transition-colors"
              title={`Email: ${SHOP_CONFIG.email}`}
              aria-label="Send Email"
            >
              <Mail size={16} />
            </a>
            <a
              href={SHOP_CONFIG.officialWebsite}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 hover:text-white transition-colors"
              title="Official Store Website"
              aria-label="Official Store Website"
            >
              <Globe size={16} />
            </a>
          </div>
        </div>

        {/* Collections */}
        <div>
          <h4 className="font-serif text-sm text-stone-100 uppercase tracking-widest mb-4">Shop Collections</h4>
          <ul className="flex flex-col gap-2.5 text-xs text-stone-400">
            <li><Link to="/shop" className="hover:text-white transition-colors">All Pieces</Link></li>
            <li><Link to="/new-arrivals" className="hover:text-emerald-300 transition-colors">New Arrivals</Link></li>
            <li><Link to="/collections" className="hover:text-white transition-colors">Collections</Link></li>
            <li><Link to="/gallery" className="hover:text-emerald-300 transition-colors font-medium">The Teefahs Gallery</Link></li>
            <li><Link to="/shop?category=abayas" className="hover:text-white transition-colors">Abayas</Link></li>
            <li><Link to="/shop?category=khimars" className="hover:text-white transition-colors">Khimars</Link></li>
            <li><Link to="/shop?category=prayer-wear" className="hover:text-white transition-colors">Prayer Wear</Link></li>
          </ul>
        </div>

        {/* Contact & Store Location */}
        <div>
          <h4 className="font-serif text-sm text-stone-100 uppercase tracking-widest mb-4">Store &amp; Contact</h4>
          <ul className="flex flex-col gap-3 text-xs text-stone-400">
            <li className="flex items-start gap-2">
              <MapPin size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {SHOP_CONFIG.address}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <a
                href={SHOP_CONFIG.whatsappChatUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-300 transition-colors"
              >
                {SHOP_CONFIG.whatsappDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} className="text-emerald-400 flex-shrink-0" />
              <a
                href={`mailto:${SHOP_CONFIG.email}`}
                className="hover:text-white transition-colors truncate"
              >
                {SHOP_CONFIG.email}
              </a>
            </li>
            <li>
              <Link to="/contact" className="text-emerald-400 hover:underline">
                View Google Map &amp; Directions &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Administration Portal */}
        <div>
          <h4 className="font-serif text-sm text-stone-100 uppercase tracking-widest mb-4">Store Access</h4>
          <p className="text-xs text-stone-400 mb-4 leading-relaxed font-light">
            Authorized store administration portal for inventory, catalogue updates, and order workflows.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 text-stone-200 text-xs uppercase tracking-wider font-semibold rounded hover:bg-emerald-950 hover:text-emerald-300 transition-colors"
          >
            <Lock size={14} className="text-emerald-400" />
            Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-[11px] text-stone-500 mt-12 pt-8 border-t border-stone-800 gap-4">
        <span>&copy; {new Date().getFullYear()} Teefahs Clothier. All rights reserved.</span>
        <span>Dress modest. Look elegant. Stand out.</span>
      </div>
    </footer>
  );
}
