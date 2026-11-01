import { useState } from 'react';
import { ShoppingBag, Search, Menu, X, Lock, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ASSETS } from '../data/assets';
import { useCart } from '../context/CartContext';
import { SHOP_CONFIG } from '../config/shopConfig';

export default function Header() {
  const { cart, toggleCart } = useCart();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="flex items-center justify-between gap-6 px-6 py-4 max-w-7xl mx-auto">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img 
              src={ASSETS.logo} 
              alt="Teefahs Clothier" 
              className="h-8 md:h-9 w-auto object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = '/logo.png';
                }
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-[12px] font-medium text-stone-700 uppercase tracking-widest">
            <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
            <Link to="/shop" className="hover:text-stone-900 transition-colors">Shop All</Link>
            <Link to="/new-arrivals" className="hover:text-stone-900 transition-colors">New Arrivals</Link>
            <Link to="/collections" className="hover:text-stone-900 transition-colors">Collections</Link>
            <Link to="/gallery" className="hover:text-stone-900 transition-colors">Gallery</Link>
            <Link to="/our-story" className="hover:text-stone-900 transition-colors">Our Story</Link>
            <Link to="/contact" className="hover:text-stone-900 transition-colors">Contact</Link>
          </nav>

          {/* Utilities: Search, Bag, Admin, Mobile Toggle */}
          <div className="flex items-center gap-4">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-stone-700 hover:text-stone-900 transition-colors"
              aria-label="Search garments"
            >
              <Search size={19} />
            </button>

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => toggleCart()}
              className="relative p-2.5 rounded-full text-stone-800 hover:text-stone-950 hover:bg-stone-100 active:scale-95 transition-all duration-150 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-700/40"
              aria-label={`Open shopping bag (${itemCount} items)`}
              title="Open shopping bag"
            >
              <ShoppingBag size={21} className="stroke-[1.75]" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-stone-900 text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold shadow-xs pointer-events-none ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Admin Portal (Lock icon - visible on mobile, tablet & desktop) */}
            <Link
              to="/admin"
              className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center min-w-[40px] min-h-[40px] border border-stone-200/80 md:border-transparent md:px-2.5"
              aria-label="Admin Portal"
              title="Admin Portal"
            >
              <Lock size={18} className="stroke-[1.8] text-stone-800" />
              <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider ml-1.5 text-stone-800">Admin</span>
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-stone-800 hover:text-stone-950 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
          <div className="bg-white w-full max-w-xl p-6 rounded-sm shadow-2xl relative border border-stone-200">
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-900"
            >
              <X size={20} />
            </button>
            <h3 className="font-serif text-lg text-stone-900 mb-3">Search Teefahs Clothier</h3>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Type abaya, khimar, prayer dress, size 56..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-stone-900 text-white rounded-xs hover:bg-stone-800"
              >
                <ArrowRight size={15} />
              </button>
            </form>
            <p className="text-[11px] text-stone-400 mt-2">Press enter to see matching garments in Shop All</p>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-6 z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-stone-200">
                <img 
                  src={ASSETS.logo} 
                  alt="Teefahs Clothier" 
                  className="h-7 w-auto object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/logo.png')) {
                      target.src = '/logo.png';
                    }
                  }}
                />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-stone-500 hover:text-stone-900"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Quick Shopping Bag trigger in mobile menu */}
              <div className="py-4 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    toggleCart();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100 rounded border border-stone-200 text-stone-900 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag size={17} className="text-emerald-800" />
                    <span>Shopping Bag</span>
                  </div>
                  <span className="px-2 py-0.5 bg-stone-900 text-white rounded-full text-[10px] font-bold">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </button>
              </div>

              {/* Navigation links */}
              <nav className="flex flex-col gap-5 py-6 text-sm font-medium uppercase tracking-widest text-stone-800">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  Shop All Pieces
                </Link>
                <Link
                  to="/new-arrivals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  New Arrivals
                </Link>
                <Link
                  to="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  Collections
                </Link>
                <Link
                  to="/gallery"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100 text-emerald-900 font-semibold"
                >
                  The Teefahs Gallery
                </Link>
                <Link
                  to="/our-story"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  Our Story
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-emerald-900 transition-colors pb-2 border-b border-stone-100"
                >
                  Contact &amp; Enquiry
                </Link>
              </nav>
            </div>

            {/* Bottom Admin Link & Help */}
            <div className="pt-6 border-t border-stone-200">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-stone-900 text-white text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 rounded-sm shadow-xs"
              >
                <Lock size={15} />
                Admin Dashboard
              </Link>
              <div className="mt-4 text-center">
                <a
                  href={SHOP_CONFIG.whatsappChatUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-800 font-medium hover:underline block"
                >
                  Chat with Stylist on WhatsApp &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
