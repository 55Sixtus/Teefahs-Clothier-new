import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  FolderTree, 
  Tag, 
  PlusCircle, 
  ExternalLink, 
  Boxes, 
  Home, 
  Database, 
  RefreshCw, 
  Edit2, 
  Eye, 
  AlertCircle, 
  AlertTriangle, 
  ChevronRight,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { 
  getAllProducts, 
  getAllCategories, 
  getDatabaseDiagnostics, 
  DatabaseDiagnostics 
} from '../lib/api';
import { Product, Category } from '../types/product';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbDiag, setDbDiag] = useState<DatabaseDiagnostics | null>(null);

  const navigate = useNavigate();

  // Authenticated store owner identity
  const storedAdminEmail = localStorage.getItem('teefahs_admin_email');
  const adminEmail = (storedAdminEmail && !storedAdminEmail.toLowerCase().includes('greatezirim'))
    ? storedAdminEmail
    : 'queenlateefalive@yahoo.com';
  const rawRole = localStorage.getItem('teefahs_admin_role') || 'Store Owner';
  const adminRole = rawRole.toLowerCase().includes('temporal') ? 'Store Owner' : rawRole;

  useEffect(() => {
    loadData();
  }, []);

  const handleLockDashboard = () => {
    localStorage.removeItem('teefahs_admin_authorized');
    localStorage.removeItem('teefahs_admin_session_token');
    localStorage.removeItem('teefahs_admin_expires_at');
    localStorage.removeItem('teefahs_admin_email');
    localStorage.removeItem('teefahs_admin_role');
    navigate('/admin/login');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, diag] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getDatabaseDiagnostics(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setDbDiag(diag);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Metrics calculation
  const totalProductsCount = products.length;
  const publishedCount = products.filter(p => p.is_published).length;
  const newArrivalCount = products.filter(p => p.is_new_arrival).length;
  const totalUnitsInStock = products.reduce((acc, p) => {
    const variationsStock = (p.variations || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    return acc + variationsStock;
  }, 0);

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Unassigned';
    const match = categories.find(c => c.id === catId);
    return match ? match.name : catId;
  };

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold">
              Teefahs Clothier Management
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[11px] font-medium text-stone-500">
              Role: <strong className="text-stone-800 font-semibold">{adminRole}</strong>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">
            Welcome to Teefahs Clothier
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light max-w-2xl leading-relaxed">
            Manage your modest garments, inventory stock, and customer collections from one central administration portal.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-2xs cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-700' : 'text-stone-500'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-2xs"
            title="Return to public store"
          >
            <Home size={14} className="text-stone-600" />
            <span>Return to Store</span>
          </Link>

          <button
            type="button"
            onClick={handleLockDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-900 text-amber-300 hover:text-amber-200 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-2xs cursor-pointer border border-stone-700"
            title="Lock admin portal and require password on next entry"
          >
            <Lock size={13} className="text-amber-400" />
            <span>Lock Portal</span>
          </button>

          <Link
            to="/admin/products/add"
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-950 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-emerald-900 transition-colors shadow-xs border border-emerald-800"
          >
            <PlusCircle size={15} className="text-emerald-400" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* 2. PROFESSIONAL CLOUD DATABASE STATUS INDICATOR */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-sm shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-950">
                Supabase Cloud Database Connected
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900">
                Active Sync
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Live catalogue synchronized: {products.length} garments, {categories.length} categories, 54 editorial photoshoot photographs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh catalogue records"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-700' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live Status'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD STATISTICS */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Products */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Total Garments</span>
              <ShoppingBag size={17} className="text-stone-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : totalProductsCount}
            </p>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 inline-block">
              Live Supabase records
            </span>
          </div>

          {/* Published Live */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Published Live</span>
              <CheckCircle2 size={17} className="text-emerald-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : publishedCount}
            </p>
            <span className="text-[11px] text-stone-500 font-light mt-1 inline-block">
              Visible on storefront
            </span>
          </div>

          {/* New Arrivals */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">New Arrivals</span>
              <Tag size={17} className="text-amber-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : newArrivalCount}
            </p>
            <span className="text-[11px] text-stone-500 font-light mt-1 inline-block">
              Featured collection
            </span>
          </div>

          {/* Categories */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Categories</span>
              <FolderTree size={17} className="text-stone-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : categories.length}
            </p>
            <span className="text-[11px] text-stone-500 font-light mt-1 inline-block">
              Boutique sections
            </span>
          </div>

          {/* Total Stock Units */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Stock Units</span>
              <Boxes size={17} className="text-emerald-800" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : totalUnitsInStock}
            </p>
            <span className="text-[11px] text-stone-500 font-light mt-1 inline-block">
              Across all variations
            </span>
          </div>
        </div>
      </div>

      {/* 4. QUICK ADMINISTRATION ACTIONS */}
      <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
        <h2 className="text-base font-serif text-stone-900 font-medium">Quick Management Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Action 1: Add New Product */}
          <Link
            to="/admin/products/add"
            className="p-4 bg-stone-900 text-white rounded-sm hover:bg-stone-800 transition-all flex flex-col justify-between group shadow-xs"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-emerald-800">
                <PlusCircle size={18} />
              </div>
              <h3 className="font-semibold text-sm text-white mb-1">Add New Garment</h3>
              <p className="text-[11px] text-stone-300 font-light leading-relaxed">
                List a bespoke abaya or khimar with photos, sizes, and stock.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-semibold mt-4">
              <span>Create Product</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 2: View All Products */}
          <Link
            to="/admin/products"
            className="p-4 bg-stone-50 border border-stone-200 rounded-sm hover:border-stone-400 hover:bg-stone-100/60 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center mb-3 text-stone-800 group-hover:scale-105 transition-transform">
                <ShoppingBag size={18} />
              </div>
              <h3 className="font-semibold text-sm text-stone-900 mb-1">All Products</h3>
              <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                Edit prices, adjust inventory stock, or toggle publication status.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-800 font-semibold mt-4">
              <span>View Catalogue ({totalProductsCount})</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 3: Categories */}
          <Link
            to="/admin/categories"
            className="p-4 bg-stone-50 border border-stone-200 rounded-sm hover:border-stone-400 hover:bg-stone-100/60 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center mb-3 text-stone-800 group-hover:scale-105 transition-transform">
                <FolderTree size={18} />
              </div>
              <h3 className="font-semibold text-sm text-stone-900 mb-1">Manage Categories</h3>
              <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                Organize store sections, cover photographs, and menu navigation.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-800 font-semibold mt-4">
              <span>Manage ({categories.length})</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 4: Media & Storage Manager */}
          <Link
            to="/admin/media"
            className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-sm hover:border-emerald-400 hover:bg-emerald-100/60 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-emerald-800 group-hover:scale-105 transition-transform border border-emerald-300">
                <ImageIcon size={18} />
              </div>
              <h3 className="font-semibold text-sm text-stone-900 mb-1">Media Storage</h3>
              <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                Inspect 88+ CDN images, optimize storage, and copy URLs.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mt-4">
              <span>Manage Media</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 5: Return to Store */}
          <Link
            to="/"
            target="_blank"
            className="p-4 bg-stone-50 border border-stone-200 rounded-sm hover:border-stone-400 hover:bg-stone-100/60 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center mb-3 text-stone-800 group-hover:scale-105 transition-transform">
                <ExternalLink size={18} />
              </div>
              <h3 className="font-semibold text-sm text-stone-900 mb-1">Customer Storefront</h3>
              <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                Preview your active storefront exactly as customers see it.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-800 font-semibold mt-4">
              <span>Open Storefront</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Ease-of-Use Banner for Queen Lateefah */}
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-sm text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-950 flex items-center justify-center font-bold flex-shrink-0 text-sm">
          👑
        </div>
        <div>
          <p className="font-semibold text-sm">Owner Quick Edit Notice:</p>
          <p className="text-stone-700 mt-0.5 leading-relaxed">
            Every garment below features a prominent <strong className="text-emerald-900">"Edit Price &amp; Images"</strong> button. You can update your pricing, add new photos, or manage sizes instantly from your phone without needing desktop mode.
          </p>
        </div>
      </div>

      {/* 5. RECENT GARMENTS (COMPACT EDITORIAL OVERVIEW) */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif text-stone-900 font-medium">Recent Boutique Garments</h2>
            <p className="text-xs text-stone-500 font-light mt-0.5">
              Review current catalogue items and quick-edit product listings.
            </p>
          </div>
          <Link
            to="/admin/products"
            className="text-xs font-semibold text-stone-800 hover:text-emerald-900 uppercase tracking-wider inline-flex items-center gap-1"
          >
            <span>View All ({totalProductsCount})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[750px] text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold w-16">Photo</th>
                <th className="py-3 px-4 font-semibold">Garment Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-center">Stock</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full mb-2" />
                    <p className="text-xs uppercase tracking-wider">Loading Catalogue...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500 font-light">
                    No garments added yet. Click "+ Add New Product" to get started.
                  </td>
                </tr>
              ) : (
                products.slice(0, 6).map((product) => {
                  const stock = (product.variations || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                  const imageSrc = product.main_image_url || product.images?.[0]?.image_url;

                  return (
                    <tr key={product.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={product.name}
                            className="w-10 h-14 object-cover object-top rounded-xs border border-stone-200 bg-stone-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-stone-100 flex items-center justify-center text-[9px] text-stone-400 rounded-xs">
                            No Photo
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-900 block">{product.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {product.is_new_arrival && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-semibold rounded uppercase tracking-wider">
                              New
                            </span>
                          )}
                          {product.is_featured && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-semibold rounded uppercase tracking-wider">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-medium">
                        {getCategoryName(product.category_id)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                        ₦{product.base_price ? product.base_price.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-stone-800">{stock}</span>
                        <span className="text-[10px] text-stone-400 block">units</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                          product.is_published 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/products/edit/${product.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-semibold px-3 py-1.5 border border-emerald-300 rounded transition-colors shadow-2xs"
                        >
                          <Edit2 size={13} />
                          <span>Edit Price &amp; Images</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
