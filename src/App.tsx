import { Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProducts from './components/FeaturedProducts';
import CategoryGrid from './components/CategoryGrid';
import Footer from './components/Footer';
import WhatsAppWidget from './components/WhatsAppWidget';
import CartDrawer from './components/CartDrawer';
import { DatabaseDebugger } from './components/DatabaseDebugger';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminLogin from './admin/AdminLogin';
import ProductsPage from './admin/ProductsPage';
import AddProductPage from './admin/AddProductPage';
import EditProductPage from './admin/EditProductPage';
import CategoriesPage from './admin/CategoriesPage';
import InventoryPage from './admin/InventoryPage';
import ShopPage from './components/ShopPage';
import NewArrivalsPage from './components/NewArrivalsPage';
import CollectionsPage from './components/CollectionsPage';
import OurStoryPage from './components/OurStoryPage';
import ContactPage from './components/ContactPage';
import GalleryPage from './components/GalleryPage';
import GallerySection from './components/GallerySection';
import { ASSETS } from './data/assets';

function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between">
      <DatabaseDebugger />
      <Header />

      {/* Hero Header */}
      <Hero />

      {/* Section 1: Shop By Category */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-10 border-b border-stone-200 gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-emerald-800 block mb-1">
              Curated Wardrobe
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-stone-900">Shop by Category</h2>
          </div>
          <Link
            to="/collections"
            className="text-xs uppercase tracking-wider font-semibold text-stone-700 hover:text-emerald-900 transition-colors"
          >
            All 8 Collections &rarr;
          </Link>
        </div>
        <CategoryGrid limit={4} />
      </section>

      {/* Section 2: Signature Featured Pieces */}
      <FeaturedProducts 
        title="Signature Featured Pieces" 
        viewAllLink="/shop"
      />

      {/* Section 3: Brand Philosophy Banner */}
      <section className="bg-stone-900 text-white py-20 px-6 my-10 relative overflow-hidden border-y border-stone-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold block mb-3">
              Modesty Reimagined
            </span>
            <h2 className="text-3xl md:text-5xl font-serif leading-tight mb-6">
              "Dress modest.<br />Look elegant.<br />Stand out."
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed mb-8 font-light max-w-md">
              We design garments that celebrate grace and inner poise. Premium breathable fabrics, bespoke sleeve lengths, and flowing silhouettes made for every milestone.
            </p>
            <div className="flex gap-4">
              <Link
                to="/shop"
                className="px-8 py-3.5 bg-white text-stone-900 text-xs font-semibold uppercase tracking-widest hover:bg-stone-100 transition-colors"
              >
                Shop All Garments
              </Link>
              <Link
                to="/our-story"
                className="px-8 py-3.5 border border-stone-600 text-white text-xs font-semibold uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Our Story
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] bg-stone-800 rounded-sm overflow-hidden shadow-2xl border border-stone-700">
              <img
                src={ASSETS.heroImages[2] || ASSETS.productImages[1]}
                alt="Teefahs Clothier Craftsmanship"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: New Season Arrivals */}
      <FeaturedProducts 
        title="New Season Arrivals" 
        filter={p => p.is_new_arrival}
        viewAllLink="/new-arrivals"
      />

      {/* Section 5: The Teefahs Gallery */}
      <GallerySection limit={8} />

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        {/* Global Cart Drawer & Customer WhatsApp Widget - Accessible from every storefront route */}
        <CartDrawer />
        <WhatsAppWidget />

        <Routes>
          {/* Public Storefront Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/new-arrivals" element={<NewArrivalsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/our-story" element={<OurStoryPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Admin Authentication Route (Separate from AdminLayout to avoid infinite redirect) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Management Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/add" element={<AddProductPage />} />
            <Route path="products/edit/:id" element={<EditProductPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
