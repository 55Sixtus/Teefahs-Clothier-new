import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Menu, X, Lock, ArrowRight, Globe, PackageSearch } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ASSETS } from '../data/assets';
import { useCart } from '../context/CartContext';
import {
  useLocale,
  SUPPORTED_COUNTRIES,
  CURRENCY_OPTIONS,
  SupportedCountryCode,
  DisplayCurrencyCode,
} from '../context/LocaleContext';
import { SHOP_CONFIG } from '../config/shopConfig';
import ThemeToggle from './ThemeToggle';
import { getPublishedProducts, getActiveCategories } from '../lib/api';
import { Product, Category } from '../types/product';
import { calculateProductPricing } from '../utils/pricing';

export default function Header() {
  const { cart, toggleCart } = useCart();
  const {
    country,
    setCountry,
    displayCurrency,
    setDisplayCurrency,
    fxStatus,
    formatDisplayPrice,
  } = useLocale();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchOpen) return;
    let active = true;
    const loadSearchData = () => {
      Promise.all([getPublishedProducts(), getActiveCategories()])
        .then(([prods, cats]) => {
          if (!active) return;
          setProducts(prods);
          setCategories(cats);
        })
        .catch((err) => console.error('Error loading search data:', err));
    };
    loadSearchData();
    window.addEventListener('teefahs_catalogue_updated', loadSearchData);
    return () => {
      active = false;
      window.removeEventListener('teefahs_catalogue_updated', loadSearchData);
    };
  }, [searchOpen]);

  const filteredCategories = searchQuery.trim()
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const filteredProducts = searchQuery.trim()
    ? products
        .filter((p) => {
          const q = searchQuery.toLowerCase();
          const cat = categories.find((c) => c.id === p.category_id);
          const varMatch = (p.variations || []).some(
            (v) =>
              v.colour?.toLowerCase().includes(q) ||
              v.size?.toLowerCase().includes(q) ||
              v.sku?.toLowerCase().includes(q)
          );
          return (
            p.name.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.short_description?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.fabric_type?.toLowerCase().includes(q) ||
            p.country_of_origin?.toLowerCase().includes(q) ||
            cat?.name.toLowerCase().includes(q) ||
            varMatch
          );
        })
        .slice(0, 6)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Top Boutique Utility Strip */}
      <div className="bg-stone-900 text-stone-200 text-[11px] py-2 px-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 z-50 relative">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-medium tracking-wider uppercase text-[10px] sm:text-[11px] text-stone-200">
              Official Boutique of Queen Lateefah
            </span>
            <span className="hidden sm:inline text-stone-600">·</span>
            <span className="hidden md:inline text-stone-300 font-light">
              Nigeria Nationwide &amp; International Diaspora Dispatch
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <Link
              to="/track-order"
              className="text-stone-300 hover:text-amber-300 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <PackageSearch size={12} />
              <span>Track Order</span>
            </Link>
            <span className="text-stone-600">·</span>
            <a
              href={SHOP_CONFIG.whatsappChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:text-white font-medium transition-colors whitespace-nowrap"
            >
              WhatsApp: {SHOP_CONFIG.whatsappDisplay}
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-2xs transition-colors duration-300">
        <div className="flex items-center justify-between gap-3 md:gap-6 px-4 sm:px-6 py-3.5 max-w-7xl mx-auto">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img
              src={ASSETS.logo}
              alt="Teefahs Clothier"
              className="h-8 md:h-9 w-auto object-contain dark:brightness-200 dark:invert transition-all"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = '/logo.png';
                }
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-[11px] font-medium text-stone-700 dark:text-stone-300 uppercase tracking-widest">
            <Link to="/" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Home
            </Link>
            <Link to="/shop" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Shop All
            </Link>
            <Link to="/shop?category=abayas" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Abayas
            </Link>
            <Link to="/shop?category=khimars" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Khimars
            </Link>
            <Link to="/shop?category=workwear" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Workwear
            </Link>
            <Link to="/collections" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Collections
            </Link>
            <Link to="/track-order" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Track Order
            </Link>
            <Link to="/contact" className="hover:text-stone-950 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0">
              Contact
            </Link>
          </nav>

          {/* Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Country / Display Currency Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLocaleOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold border border-stone-200 dark:border-stone-800 hover:border-stone-400 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer whitespace-nowrap"
                title="Select Delivery Country & Display Currency"
                aria-label="Delivery country and display currency"
              >
                <Globe size={13} className="text-emerald-800 dark:text-emerald-400" />
                <span>{country}</span>
                <span className="text-stone-400">/</span>
                <span>{displayCurrency}</span>
              </button>

              {localeOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLocaleOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-4 z-50 space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 mb-1">
                        Delivery Destination Country
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value as SupportedCountryCode)}
                        className="w-full text-xs p-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                      >
                        {SUPPORTED_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 mb-1">
                        Display Currency
                      </label>
                      <select
                        value={displayCurrency}
                        onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrencyCode)}
                        className="w-full text-xs p-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                      >
                        {CURRENCY_OPTIONS.map((cur) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed border-t border-stone-200 dark:border-stone-800 pt-2">
                      {displayCurrency === 'NGN'
                        ? 'Prices are billed authoritatively in Nigerian Naira (₦).'
                        : fxStatus === 'live'
                          ? 'Base price is NGN (₦). Converted international figures use live indicative FX rates; final totals are confirmed in NGN.'
                          : 'Live FX rate temporarily unavailable. Displaying authoritative base NGN (₦) prices.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center">
              <ThemeToggle variant="header" />
            </div>

            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Search garments"
            >
              <Search size={18} />
            </button>

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => toggleCart()}
              className="relative p-2 text-stone-800 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition-all cursor-pointer flex items-center justify-center"
              aria-label={`Open shopping bag (${itemCount} items)`}
              title="Open shopping bag"
            >
              <ShoppingBag size={20} className="stroke-[1.75]" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold tabular-nums">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Admin Portal */}
            <Link
              to="/admin"
              className="hidden sm:flex p-2 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors items-center justify-center"
              aria-label="Admin Portal"
              title="Admin Portal"
            >
              <Lock size={16} />
            </Link>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-stone-800 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 px-4">
          <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 w-full max-w-xl p-6 shadow-2xl relative border border-stone-200 dark:border-stone-800 max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
            <h3 className="font-serif text-lg text-stone-900 dark:text-white mb-3">
              Search Garments &amp; Specifications
            </h3>
            <form onSubmit={handleSearchSubmit} className="relative mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Search abayas, khimars, SKU, fabric, colour, size, Dubai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 focus:outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 cursor-pointer"
                aria-label="Submit search"
              >
                <ArrowRight size={15} />
              </button>
            </form>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold block mb-2">
                  {searchQuery.trim() ? 'Matching Categories' : 'Browse Categories'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/shop?category=${cat.slug || cat.id}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-emerald-900 hover:text-white text-stone-800 dark:text-stone-200 text-xs font-medium transition-colors border border-stone-200 dark:border-stone-700"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {searchQuery.trim() && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold block mb-2">
                    Matching Garments ({filteredProducts.length})
                  </span>
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-stone-500 py-3 italic">
                      No garments found matching "{searchQuery}". Press Enter to search all.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((prod) => {
                        const pricing = calculateProductPricing(prod, categories);
                        const disp = formatDisplayPrice(pricing.sellingPrice);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              navigate(`/product/${prod.slug || prod.id}`);
                              setSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-100 dark:border-stone-800 cursor-pointer transition-colors group"
                          >
                            <div className="w-12 h-14 bg-stone-100 dark:bg-stone-800 flex-shrink-0 flex items-center justify-center p-0.5">
                              <img
                                src={prod.main_image_url || prod.images?.[0]?.image_url || '/logo.png'}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 truncate">
                                {prod.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] tabular-nums">
                                <span className="font-semibold text-stone-900 dark:text-amber-300">
                                  {disp.primaryNgn}
                                </span>
                                {disp.indicativeForeign && (
                                  <span className="text-stone-500 text-[10px]">
                                    ({disp.indicativeForeign})
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 mt-3 text-center">
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-amber-300 hover:underline cursor-pointer"
              >
                View all results in Shop All &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 h-full shadow-2xl flex flex-col justify-between p-6 z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-stone-200 dark:border-stone-800">
                <img
                  src={ASSETS.logo}
                  alt="Teefahs Clothier"
                  className="h-7 w-auto object-contain dark:brightness-200 dark:invert"
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-white"
                  aria-label="Close navigation menu"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="my-4 p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider">
                    Appearance
                  </span>
                  <span className="text-[10px] text-stone-500">Light / Dark</span>
                </div>
                <ThemeToggle variant="header" />
              </div>

              <div className="py-2 border-b border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    toggleCart();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag size={17} className="text-emerald-800 dark:text-emerald-400" />
                    <span>Shopping Bag</span>
                  </div>
                  <span className="px-2 py-0.5 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-[10px] font-bold">
                    {itemCount}
                  </span>
                </button>
              </div>

              <nav className="flex flex-col gap-3.5 py-5 text-sm font-medium uppercase tracking-widest">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Home
                </Link>
                <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Shop All Pieces
                </Link>
                <Link to="/shop?category=abayas" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Abayas
                </Link>
                <Link to="/shop?category=khimars" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Khimars
                </Link>
                <Link to="/shop?category=workwear" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Workwear
                </Link>
                <Link to="/new-arrivals" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  New Arrivals
                </Link>
                <Link to="/collections" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Collections
                </Link>
                <Link to="/track-order" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800 text-emerald-800 dark:text-amber-300">
                  Track Order
                </Link>
                <Link to="/our-story" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Our Story
                </Link>
                <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="pb-2 border-b border-stone-100 dark:border-stone-800">
                  Contact &amp; Store
                </Link>
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-xs text-stone-500 flex items-center gap-1.5 pt-1">
                  <Lock size={13} />
                  <span>Admin Portal</span>
                </Link>
              </nav>
            </div>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-center">
              <a
                href={SHOP_CONFIG.whatsappChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-800 dark:text-emerald-400 font-medium hover:underline block"
              >
                Chat with Stylist on WhatsApp &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
