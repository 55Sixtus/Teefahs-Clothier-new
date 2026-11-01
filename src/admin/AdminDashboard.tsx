import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Copy,
  Check,
  Download,
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  getAllProducts, 
  getAllCategories, 
  getDatabaseDiagnostics, 
  DatabaseDiagnostics 
} from '../lib/api';
import { Product, Category } from '../types/product';
import { SUPABASE_SEED_SQL } from '../data/supabaseSeedSql';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbDiag, setDbDiag] = useState<DatabaseDiagnostics | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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

  const handleCopySql = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(SUPABASE_SEED_SQL);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = SUPABASE_SEED_SQL;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (e) {
      console.error('Failed to copy SQL:', e);
    }
  };

  const handleDownloadSql = () => {
    try {
      const blob = new Blob([SUPABASE_SEED_SQL], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teefahs-clothier-seed.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download SQL file:', e);
    }
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-2xs"
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

          <Link
            to="/admin/products/add"
            className="inline-flex items-center gap-2 px-5 py-2 bg-stone-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-800 transition-colors shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* 2. SYSTEM DATABASE STATUS NOTICE */}
      {dbDiag && (
        <div className={`p-4 border rounded-sm shadow-2xs transition-all ${
          dbDiag.status === 'fully_synchronized'
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : dbDiag.status === 'partially_populated'
            ? 'bg-sky-50/60 border-sky-200 text-sky-950'
            : dbDiag.status === 'permission_denied' || dbDiag.status === 'connection_error'
            ? 'bg-rose-50/60 border-rose-200 text-rose-950'
            : 'bg-amber-50/70 border-amber-200 text-stone-900'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                dbDiag.status === 'fully_synchronized'
                  ? 'bg-emerald-100 text-emerald-700'
                  : dbDiag.status === 'partially_populated'
                  ? 'bg-sky-100 text-sky-700'
                  : dbDiag.status === 'permission_denied' || dbDiag.status === 'connection_error'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {dbDiag.status === 'fully_synchronized' ? (
                  <Database size={18} />
                ) : dbDiag.status === 'permission_denied' || dbDiag.status === 'connection_error' ? (
                  <AlertCircle size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    {dbDiag.status === 'fully_synchronized'
                      ? 'Supabase Database 100% Synchronized & Active'
                      : dbDiag.status === 'partially_populated'
                      ? 'Supabase Database Partially Populated'
                      : dbDiag.status === 'permission_denied'
                      ? 'Supabase RLS Permission Denied'
                      : dbDiag.status === 'connection_error'
                      ? 'Supabase Connection Error'
                      : 'Supabase Table Editor is Empty (0 Rows in Database)'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    dbDiag.status === 'fully_synchronized'
                      ? 'bg-emerald-200 text-emerald-800'
                      : dbDiag.status === 'partially_populated'
                      ? 'bg-sky-200 text-sky-800'
                      : dbDiag.status === 'permission_denied' || dbDiag.status === 'connection_error'
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {dbDiag.status === 'fully_synchronized'
                      ? 'Live Cloud Database'
                      : dbDiag.status === 'partially_populated'
                      ? 'Partial Rows'
                      : dbDiag.status === 'permission_denied'
                      ? 'Auth / RLS Issue'
                      : dbDiag.status === 'connection_error'
                      ? 'Offline'
                      : 'Awaiting SQL Seed'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
                  {dbDiag.status === 'fully_synchronized'
                    ? `Live records active in Supabase: ${dbDiag.counts.products} products, ${dbDiag.counts.categories} categories, ${dbDiag.counts.images} gallery photos, ${dbDiag.counts.variations} variations (${dbDiag.counts.totalStock ?? 267} total inventory units).`
                    : dbDiag.status === 'partially_populated'
                    ? `Partial records detected: ${dbDiag.counts.products}/11 products, ${dbDiag.counts.categories}/8 categories, ${dbDiag.counts.images}/54 photos. Run the seed script to complete population.`
                    : dbDiag.status === 'permission_denied'
                    ? `Access to Supabase REST tables was rejected by Row-Level Security: ${dbDiag.errorDetails || 'Unauthorized'}. Verify admin permissions or execute the RLS seed script.`
                    : dbDiag.status === 'connection_error'
                    ? `Unable to connect to Supabase: ${dbDiag.errorDetails || 'Network error'}. Fallback catalogue is currently active.`
                    : `Your Supabase database tables exist (mxovvqjyfgyrzjauzodh), but catalogue rows have not been inserted yet. Storefront is displaying local catalogue. Run the prepared SQL seed script in your Supabase SQL Editor to populate all tables.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
              {dbDiag.status !== 'fully_synchronized' && (
                <>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
                    title="Copy the complete SQL code to your clipboard"
                  >
                    {copiedSql ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedSql ? 'SQL Copied!' : 'Copy SQL Script'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
                    title="Download the SQL script as a .sql file"
                  >
                    <Download size={13} />
                    <span>Download .sql</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                title="Query Supabase REST tables directly to check row counts"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
                <span>{refreshing ? 'Checking...' : 'Verify Rows Live'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer px-2 py-1"
              >
                Database Sync Guide
              </button>
            </div>
          </div>
        </div>
      )}

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
            <span className="text-[10px] text-stone-400 mt-1 block">
              {dbDiag?.isPopulated ? 'Live Supabase records' : 'Active catalogue items'}
            </span>
          </div>

          {/* Published Products */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Published Live</span>
              <CheckCircle2 size={17} className="text-emerald-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-emerald-900">
              {loading ? '—' : publishedCount}
            </p>
            <span className="text-[10px] text-stone-400 mt-1 block">
              Visible on storefront
            </span>
          </div>

          {/* New Arrivals */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">New Arrivals</span>
              <Tag size={17} className="text-stone-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : newArrivalCount}
            </p>
            <span className="text-[10px] text-stone-400 mt-1 block">
              Featured in New Arrivals
            </span>
          </div>

          {/* Active Categories */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Categories</span>
              <FolderTree size={17} className="text-stone-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : categories.length}
            </p>
            <span className="text-[10px] text-stone-400 mt-1 block">
              Abayas, Khimars, Hijabs...
            </span>
          </div>

          {/* Inventory in Stock */}
          <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-2xs hover:border-stone-300 transition-colors col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">Stock Available</span>
              <Boxes size={17} className="text-stone-700" />
            </div>
            <p className="text-3xl font-serif font-bold text-stone-900">
              {loading ? '—' : totalUnitsInStock}
            </p>
            <span className="text-[10px] text-stone-400 mt-1 block">
              Total units across sizes
            </span>
          </div>
        </div>
      </div>

      {/* 4. QUICK ACTIONS HUB */}
      <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Quick Management Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Add New Product */}
          <Link
            to="/admin/products/add"
            className="p-4 bg-stone-900 text-white rounded-sm hover:bg-stone-800 transition-all flex flex-col justify-between group shadow-xs"
          >
            <div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-105 transition-transform">
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

          {/* Action 4: Return to Store */}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                          className="inline-flex items-center gap-1 text-xs text-stone-700 hover:text-stone-900 font-medium px-2.5 py-1 border border-stone-200 rounded hover:border-stone-400 transition-colors"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
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

      {/* 6. MODAL: DATABASE SYNCHRONIZATION DETAILS */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <Database size={20} className="text-emerald-700" />
                <div>
                  <h3 className="font-serif text-lg text-stone-900 font-semibold leading-tight">
                    Supabase Database Population &amp; Diagnostics
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Project Reference: <strong className="font-mono text-stone-700">mxovvqjyfgyrzjauzodh</strong> &bull; Endpoint: mxovvqjyfgyrzjauzodh.supabase.co
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="p-1 text-stone-400 hover:text-stone-800 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Table Records Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Live Supabase REST Table Row Counts
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh Counts'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded border text-center ${
                  (dbDiag?.counts.categories ?? 0) >= 8 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Categories</span>
                  <span className="text-2xl font-serif font-bold my-0.5 block">{dbDiag?.counts.categories ?? 0}</span>
                  <span className="text-[10px] text-stone-400">Target: 8 rows</span>
                </div>

                <div className={`p-3 rounded border text-center ${
                  (dbDiag?.counts.products ?? 0) >= 11 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Products</span>
                  <span className="text-2xl font-serif font-bold my-0.5 block">{dbDiag?.counts.products ?? 0}</span>
                  <span className="text-[10px] text-stone-400">Target: 11 rows</span>
                </div>

                <div className={`p-3 rounded border text-center ${
                  (dbDiag?.counts.images ?? 0) >= 54 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Gallery Photos</span>
                  <span className="text-2xl font-serif font-bold my-0.5 block">{dbDiag?.counts.images ?? 0}</span>
                  <span className="text-[10px] text-stone-400">Target: 54 rows</span>
                </div>

                <div className={`p-3 rounded border text-center ${
                  (dbDiag?.counts.variations ?? 0) >= 27 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Variations</span>
                  <span className="text-2xl font-serif font-bold my-0.5 block">{dbDiag?.counts.variations ?? 0}</span>
                  <span className="text-[10px] text-stone-400">Target: 27 rows</span>
                </div>
              </div>
            </div>

            {/* Current Sync Status Banner */}
            {dbDiag?.status === 'fully_synchronized' ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-xs flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Supabase Database 100% Populated &amp; Active!</p>
                  <p className="text-[11px] text-emerald-800">
                    All tables in Supabase Table Editor are populated (8 categories, 11 products, 54 gallery photos, 27 variations, {dbDiag.counts.totalStock ?? 267} stock units). Your website is fetching live data directly from Supabase.
                  </p>
                </div>
              </div>
            ) : dbDiag?.status === 'partially_populated' ? (
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded text-sky-950 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-sky-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Supabase Database Partially Populated</p>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    Some rows were found ({dbDiag.counts.products}/11 products, {dbDiag.counts.categories}/8 categories, {dbDiag.counts.images}/54 photos), but the catalogue is incomplete. Execute the seed script below to safely complete the catalogue without resetting existing stock.
                  </p>
                </div>
              </div>
            ) : dbDiag?.status === 'permission_denied' ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-rose-950 text-xs flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Supabase Row-Level Security (RLS) Permission Denied</p>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Access was denied: {dbDiag.errorDetails || 'Unauthorized'}. Execute the updated least-privilege RLS seed script in your Supabase SQL Editor to grant proper public read and admin management permissions.
                  </p>
                </div>
              </div>
            ) : dbDiag?.status === 'connection_error' ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-rose-950 text-xs flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Supabase Connection Error</p>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    {dbDiag.errorDetails || 'Could not reach Supabase endpoint.'} The storefront is operating smoothly using the local catalogue fallback.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded text-stone-900 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">Supabase Table Editor is Empty (0 Rows in Database)</p>
                  <p className="text-[11px] text-stone-700 leading-relaxed">
                    The tables exist in your Supabase project (mxovvqjyfgyrzjauzodh), but have not been seeded with catalogue records yet. Follow the 3 steps below to populate all 8 categories, 11 photoshoot garments, 54 gallery photographs, and 27 variations.
                  </p>
                </div>
              </div>
            )}

            {/* 3 Step Action Guide */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                Step-by-Step Population Guide
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-stone-900">Get the Secure SQL Seed Script</p>
                    <p className="text-stone-600 text-[11px]">
                      Contains the 8 categories, 11 photoshoot garments, 54 verified high-res photo URLs, 27 variations (267 stock units), and secure least-privilege RLS policies.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
                      >
                        {copiedSql ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedSql ? 'SQL Script Copied!' : 'Copy SQL Script'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSql}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download .sql File</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-stone-900">Run in Supabase SQL Editor</p>
                    <p className="text-stone-600 text-[11px]">
                      Open your Supabase project's SQL Editor, click <strong>+ New Query</strong>, paste the copied code, and click <strong>RUN</strong>. It will execute in ~2 seconds and report &quot;Success. No rows returned&quot;.
                    </p>
                    <a
                      href="https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer mt-1"
                    >
                      <span>Open Supabase SQL Editor</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-stone-900">Verify Live Database Records</p>
                    <p className="text-stone-600 text-[11px]">
                      After running in Supabase, click below to verify that all 4 tables are live.
                    </p>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer disabled:opacity-50 mt-1"
                    >
                      <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
                      <span>{refreshing ? 'Verifying Live Records...' : 'Verify Live Records Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Data is secured with Row Level Security (RLS) policies.
              </span>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
