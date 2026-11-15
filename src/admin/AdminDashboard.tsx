import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  CheckCircle2,
  FolderTree,
  Tag,
  PlusCircle,
  ExternalLink,
  Boxes,
  Home,
  Database,
  RefreshCw,
  Edit2,
  AlertCircle,
  ChevronRight,
  Lock,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import {
  getDatabaseDiagnostics,
  DatabaseDiagnostics,
  updateProductPrice,
  getActivePromotion,
  savePromotion,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { Product, Promotion } from '../types/product';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { products, categories, loading, refreshProducts } = useRealtimeProducts({
    includeUnpublished: true,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [dbDiag, setDbDiag] = useState<DatabaseDiagnostics | null>(null);

  // Store Announcement Banner State
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [promoBadge, setPromoBadge] = useState('PROMO ALERT');
  const [promoMessage, setPromoMessage] = useState('10% PROMOTIONAL DISCOUNT ON SELECTED LUXURY ABAYAS');
  const [promoSubtext, setPromoSubtext] = useState('Excludes Caps & Accessories • Nationwide Delivery Across Nigeria');
  const [promoActive, setPromoActive] = useState(true);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Quick Price Edit Modal
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [quickPriceSuccess, setQuickPriceSuccess] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState('');

  const navigate = useNavigate();

  const adminEmail = user?.email || 'Authenticated Admin';
  const adminRole = 'Administrator';

  const loadAuxData = useCallback(async () => {
    try {
      const [diag, activePromo] = await Promise.all([
        getDatabaseDiagnostics(),
        getActivePromotion(),
      ]);
      setDbDiag(diag);
      if (activePromo) {
        setPromo(activePromo);
        setPromoBadge(activePromo.badge_text || 'PROMO ALERT');
        setPromoMessage(activePromo.message || '');
        setPromoSubtext(activePromo.subtext || '');
        setPromoActive(activePromo.is_active);
      }
    } catch (e) {
      console.error('Error loading dashboard diagnostics/promotions:', e);
    }
  }, []);

  useEffect(() => {
    loadAuxData();

    const handleUpdate = () => loadAuxData();
    window.addEventListener('teefahs_catalogue_updated', handleUpdate);
    window.addEventListener('teefahs_promo_updated', handleUpdate);

    const promoChannel = supabase
      .channel(`admin-promo-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => {
        loadAuxData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('teefahs_catalogue_updated', handleUpdate);
      window.removeEventListener('teefahs_promo_updated', handleUpdate);
      supabase.removeChannel(promoChannel);
    };
  }, [loadAuxData]);

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    const priceNum = parseFloat(newPriceInput);
    if (isNaN(priceNum) || priceNum < 0) {
      setQuickPriceError('Please enter a valid price in Naira (₦).');
      return;
    }

    setSavingPrice(true);
    setQuickPriceError('');
    try {
      await updateProductPrice(quickPriceProduct.id, priceNum);
      setQuickPriceSuccess(true);
      await Promise.all([refreshProducts(), loadAuxData()]);
      setTimeout(() => {
        setQuickPriceProduct(null);
        setQuickPriceSuccess(false);
      }, 650);
    } catch (err: any) {
      console.error('Failed to update price:', err);
      setQuickPriceError(err?.message || 'Failed to update price in Supabase.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    setPromoError('');
    setPromoSuccess(false);
    try {
      const updated = await savePromotion({
        id: promo?.id,
        title: 'Storefront Announcement',
        badge_text: promoBadge,
        message: promoMessage,
        subtext: promoSubtext,
        is_active: promoActive,
      });
      setPromo(updated);
      setPromoSuccess(true);
      setTimeout(() => setPromoSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to save promotion:', err);
      setPromoError(err?.message || 'Could not update promotion banner in Supabase.');
    } finally {
      setSavingPromo(false);
    }
  };

  const handleLockDashboard = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore signOut errors
    }
    navigate('/admin/login', { replace: true });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProducts(), loadAuxData()]);
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
  const syncedImageCount = dbDiag?.counts.images ?? products.reduce((acc, p) => acc + (p.images?.length || 0), 0);

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Unassigned';
    const match = categories.find(c => c.id === catId || c.slug === catId);
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
            title="Sign out of Supabase Auth session"
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

      {/* 2. CLOUD DATABASE STATUS INDICATOR */}
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
                Realtime Active
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Live catalogue synchronized: {products.length} garments, {categories.length} categories, {syncedImageCount} database gallery images.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-700' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live Status'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD STATISTICS */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                Organize store sections, cover photographs, and visibility.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-800 font-semibold mt-4">
              <span>Manage ({categories.length})</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

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
                Upload new photographs, copy URLs, and check connected garments.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mt-4">
              <span>Manage Media</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
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

      {/* 5. LIVE STOREFRONT PROMOTIONAL ANNOUNCEMENT MANAGER */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Real-Time Store Announcement
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Hero Top Bar</span>
            </div>
            <h2 className="text-base font-serif text-stone-900 font-medium mt-1">
              Storefront Announcement &amp; Promotion Banner
            </h2>
            <p className="text-xs text-stone-500 font-light">
              Edit the live announcement shown at the very top of your storefront. Changes synchronize instantly across all devices.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider self-start sm:self-auto ${
              promoActive
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-stone-200 text-stone-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${promoActive ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
            {promoActive ? 'Live on Storefront' : 'Hidden from Customers'}
          </span>
        </div>

        {/* Live Banner Preview */}
        <div className="p-5 bg-stone-900 text-white border-b border-stone-800">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-2 font-medium">
            Live Preview (Customer View):
          </span>
          {promoActive ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-xs py-2 px-4 bg-stone-950/80 rounded border border-stone-800">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs bg-amber-400 text-stone-950">
                {promoBadge || 'PROMO'}
              </span>
              <span className="font-medium text-stone-100">
                {promoMessage || 'Announcement message...'}
              </span>
              {promoSubtext && (
                <>
                  <span className="hidden sm:inline text-stone-600">•</span>
                  <span className="text-stone-400 text-[11px] font-light">{promoSubtext}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-stone-400 italic">
              Banner is currently disabled. Customers will not see a top bar.
            </div>
          )}
        </div>

        {/* Banner Edit Form */}
        <form onSubmit={handleSavePromo} className="p-5 space-y-4">
          {promoError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span>{promoError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Badge Label (Short)
              </label>
              <input
                type="text"
                value={promoBadge}
                onChange={e => setPromoBadge(e.target.value)}
                placeholder="e.g. 10% OFF PROMO"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:border-stone-500 focus:bg-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Headline Message
              </label>
              <input
                type="text"
                value={promoMessage}
                onChange={e => setPromoMessage(e.target.value)}
                placeholder="e.g. 10% Promotional Discount on Selected Luxury Abayas"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:border-stone-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Secondary Subtext / Conditions
            </label>
            <input
              type="text"
              value={promoSubtext}
              onChange={e => setPromoSubtext(e.target.value)}
              placeholder="e.g. Excludes Caps & Accessories • Nationwide Delivery Across Nigeria"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:border-stone-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-stone-100 gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700">
              <input
                type="checkbox"
                checked={promoActive}
                onChange={e => setPromoActive(e.target.checked)}
                className="w-4 h-4 text-emerald-800 rounded border-stone-300 focus:ring-emerald-500"
              />
              <span>Enable and display this announcement bar on live storefront</span>
            </label>

            <div className="flex items-center gap-3">
              {promoSuccess && (
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 animate-fade-in">
                  <Check size={14} />
                  <span>Announcement Updated in Real-Time!</span>
                </span>
              )}
              <button
                type="submit"
                disabled={savingPromo}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingPromo ? 'Saving Changes...' : 'Save & Publish Banner'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Edit Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-sm text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-950 flex items-center justify-center font-bold flex-shrink-0 text-sm">
          👑
        </div>
        <div>
          <p className="font-semibold text-sm">Owner Quick Edit Notice:</p>
          <p className="text-stone-700 mt-0.5 leading-relaxed">
            Every garment below features <strong className="text-emerald-900">"Edit"</strong> (price) and{' '}
            <strong className="text-emerald-900">"Full Edit"</strong> controls. Any saved updates synchronize across devices via Supabase Realtime.
          </p>
        </div>
      </div>

      {/* 6. RECENT GARMENTS */}
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
                products.slice(0, 6).map(product => {
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
                        <div className="flex items-center gap-1.5">
                          <span>₦{product.base_price ? product.base_price.toLocaleString() : '—'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPriceProduct(product);
                              setNewPriceInput(product.base_price?.toString() || '');
                              setQuickPriceError('');
                              setQuickPriceSuccess(false);
                            }}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[10px] font-sans font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Quick Edit Price"
                          >
                            <Tag size={10} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-semibold ${stock === 0 ? 'text-red-600' : 'text-stone-800'}`}>
                          {stock}
                        </span>
                        <span className="text-[10px] text-stone-400 block">units</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                            product.is_published
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/products/edit/${product.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-semibold px-3 py-1.5 border border-emerald-300 rounded transition-colors shadow-2xs"
                        >
                          <Edit2 size={13} />
                          <span>Full Edit</span>
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

      {/* Quick Price Edit Modal */}
      {quickPriceProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setQuickPriceProduct(null)}
        >
          <div
            className="bg-white rounded-sm p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-emerald-800" />
                <h3 className="font-serif text-base text-stone-900 font-semibold">Change Garment Price</h3>
              </div>
              <button
                onClick={() => setQuickPriceProduct(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-900">{quickPriceProduct.name}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Category: {getCategoryName(quickPriceProduct.category_id)}
              </p>
            </div>

            {quickPriceError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded flex items-start gap-1.5">
                <AlertCircle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                <span>{quickPriceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickPrice} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-semibold text-stone-600 block mb-1">
                  New Selling Price (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-stone-500 text-xs">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newPriceInput}
                    onChange={e => setNewPriceInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                    placeholder="e.g. 229500"
                    autoFocus
                  />
                </div>

                <div className="mt-2">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
                    Quick Tap Price:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {['1500', '15000', '35000', '68000', '85000', '130000', '229500'].map(pVal => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setNewPriceInput(pVal)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
                          newPriceInput === pVal
                            ? 'bg-emerald-900 text-white border-emerald-950 font-bold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                        }`}
                      >
                        ₦{parseInt(pVal, 10).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {quickPriceSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded flex items-center gap-1.5 font-medium">
                  <Check size={14} className="text-emerald-700" />
                  <span>Price successfully updated on storefront!</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="w-1/2 py-2 border border-stone-300 text-xs font-semibold rounded hover:bg-stone-50 text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="w-1/2 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded transition-colors shadow-xs cursor-pointer"
                >
                  {savingPrice ? 'Saving...' : 'Save Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
