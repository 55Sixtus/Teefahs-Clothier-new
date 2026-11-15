import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Archive,
  History,
  Tag,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getArchivedProducts,
  archiveProduct,
  restoreProduct,
  permanentlyDeleteProduct,
  updateProductPrice,
  updateProductStatus,
} from '../lib/api';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { Product } from '../types/product';

export default function ProductsPage() {
  const location = useLocation();
  const { products, categories, loading, error: realtimeError, refreshProducts } = useRealtimeProducts({
    includeUnpublished: true,
  });

  const [recentlyDeleted, setRecentlyDeleted] = useState<Product[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'new_arrival' | 'deleted'>('all');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Soft delete confirmation
  const [pendingArchive, setPendingArchive] = useState<{ id: string; name: string } | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Permanent delete confirmation
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<{ id: string; name: string } | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);

  // Restoring / status toggle state
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Quick Price Edit Modal state
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [newBasePrice, setNewBasePrice] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState('');

  const loadDeleted = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const archived = await getArchivedProducts();
      setRecentlyDeleted(archived);
    } catch (e: any) {
      console.error('Failed to load archived products:', e);
    } finally {
      setLoadingDeleted(false);
    }
  }, []);

  useEffect(() => {
    loadDeleted();
    const handleCatalogueUpdate = () => {
      loadDeleted();
    };
    window.addEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
    return () => window.removeEventListener('teefahs_catalogue_updated', handleCatalogueUpdate);
  }, [loadDeleted]);

  useEffect(() => {
    if (location.state && (location.state as any).archivedProductName) {
      const state = location.state as any;
      setUndoToast({ id: state.archivedProductId, name: state.archivedProductName });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    const priceNum = parseFloat(newBasePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setQuickPriceError('Please enter a valid price in Naira (₦).');
      return;
    }

    setSavingPrice(true);
    setQuickPriceError('');
    setErrorMsg('');
    try {
      await updateProductPrice(quickPriceProduct.id, priceNum);
      setSuccessMsg(`Updated price of "${quickPriceProduct.name}" to ₦${priceNum.toLocaleString()}.`);
      setQuickPriceProduct(null);
      await refreshProducts();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error('Failed to update price:', err);
      setQuickPriceError(err?.message || 'Could not update price in Supabase.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleTogglePublished = async (prod: Product) => {
    setTogglingStatusId(prod.id);
    setErrorMsg('');
    try {
      await updateProductStatus(prod.id, { is_published: !prod.is_published });
      setSuccessMsg(
        `"${prod.name}" is now ${!prod.is_published ? 'Published live on storefront' : 'moved to Draft'}.`
      );
      await refreshProducts();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update publication status.');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    const targetId = undoToast.id;
    setUndoToast(null);
    setRestoringId(targetId);
    setErrorMsg('');
    try {
      await restoreProduct(targetId);
      await Promise.all([refreshProducts(), loadDeleted()]);
    } catch (e: any) {
      console.error('Failed to restore product via undo:', e);
      setErrorMsg(e?.message || 'Failed to restore product.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!pendingArchive) return;
    const target = pendingArchive;
    setArchivingId(target.id);
    setErrorMsg('');
    try {
      await archiveProduct(target.id, 'Queen Lateefah');
      setUndoToast({ id: target.id, name: target.name });
      await Promise.all([refreshProducts(), loadDeleted()]);
    } catch (e: any) {
      console.error('Failed to move product to Recently Deleted:', e);
      setErrorMsg(e?.message || 'Failed to archive garment in Supabase.');
    } finally {
      setArchivingId(null);
      setPendingArchive(null);
    }
  };

  const handleRestoreFromDeleted = async (id: string) => {
    setRestoringId(id);
    setErrorMsg('');
    try {
      await restoreProduct(id);
      setSuccessMsg('Garment restored and published cleanly.');
      await Promise.all([refreshProducts(), loadDeleted()]);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      console.error('Failed to restore product:', e);
      setErrorMsg(e?.message || 'Failed to restore garment from Supabase.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!pendingPermanentDelete) return;
    const target = pendingPermanentDelete;
    setPermanentDeletingId(target.id);
    setErrorMsg('');
    try {
      await permanentlyDeleteProduct(target.id);
      setSuccessMsg(`"${target.name}" permanently deleted from Supabase.`);
      await Promise.all([refreshProducts(), loadDeleted()]);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (e: any) {
      console.error('Failed to permanently delete product:', e);
      setErrorMsg(e?.message || 'Failed to permanently delete garment from Supabase.');
    } finally {
      setPermanentDeletingId(null);
      setPendingPermanentDelete(null);
    }
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Unassigned';
    const match = categories.find(c => c.id === catId || c.slug === catId);
    return match ? match.name : catId;
  };

  const currentItems = statusFilter === 'deleted' ? recentlyDeleted : products;

  const filtered = currentItems.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.slug && p.slug.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
      return false;
    }

    if (statusFilter === 'published') return p.is_published;
    if (statusFilter === 'draft') return !p.is_published;
    if (statusFilter === 'new_arrival') return p.is_new_arrival;

    return true;
  });

  const isTableLoading = statusFilter === 'deleted' ? loadingDeleted : loading;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-1">
            Store Catalogue
          </span>
          <h1 className="text-3xl font-serif text-stone-900">Garments &amp; Collections</h1>
          <p className="text-xs text-stone-500 mt-1 font-light">
            Manage your bespoke abayas, French khimars, prayer wear, and boutique inventory.
          </p>
        </div>
        <Link
          to="/admin/products/add"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-800 transition-colors shadow-xs self-start sm:self-auto"
        >
          <PlusCircle size={15} />
          <span>Add New Garment</span>
        </Link>
      </div>

      {/* Feedback Banners */}
      {(errorMsg || realtimeError) && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg || realtimeError}</span>
          </div>
          {errorMsg && (
            <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-sm flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search garments by title or slug..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 placeholder:text-stone-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="py-1.5 px-3 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none font-medium text-stone-700"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center border border-stone-200 rounded-sm bg-white overflow-hidden flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === 'published' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === 'draft' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setStatusFilter('new_arrival')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === 'new_arrival' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              New Arrivals
            </button>
            <button
              onClick={() => {
                setStatusFilter('deleted');
                loadDeleted();
              }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'deleted'
                  ? 'bg-amber-900 text-white'
                  : 'text-stone-600 hover:bg-amber-50 hover:text-amber-900'
              }`}
              title="Recently deleted garments that can be restored"
            >
              <History size={13} />
              <span>Recently Deleted</span>
              {recentlyDeleted.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === 'deleted' ? 'bg-white text-amber-950' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {recentlyDeleted.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner when viewing Recently Deleted */}
      {statusFilter === 'deleted' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Archive size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Recently Deleted Archive (Supabase)</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                These garments are archived in Supabase and hidden from the public storefront and customer shopping bags. You can restore them anytime or permanently delete them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('all')}
            className="text-[11px] text-amber-900 font-semibold underline hover:text-amber-950 flex-shrink-0 cursor-pointer"
          >
            Back to Active Garments &rarr;
          </button>
        </div>
      )}

      {/* Desktop Products Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-x-auto w-full scrollbar-thin">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-16">Photo</th>
              <th className="py-3 px-4 font-semibold">Garment Name</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Price (NGN)</th>
              {statusFilter === 'deleted' ? (
                <>
                  <th className="py-3 px-4 font-semibold text-center">Deleted At</th>
                  <th className="py-3 px-4 font-semibold text-center">Deleted By</th>
                  <th className="py-3 px-4 font-semibold text-right">Restore / Delete</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-4 font-semibold text-center">Variations</th>
                  <th className="py-3 px-4 font-semibold text-center">Badges</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {isTableLoading ? (
              <tr>
                <td colSpan={statusFilter === 'deleted' ? 7 : 8} className="py-12 text-center text-stone-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full mb-2" />
                  <p className="text-xs uppercase tracking-wider">Loading Catalogue...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={statusFilter === 'deleted' ? 7 : 8} className="py-12 text-center text-stone-500 font-light">
                  {statusFilter === 'deleted'
                    ? 'No deleted garments found. Your catalogue is clean.'
                    : 'No garments match your current search and filters.'}
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const totalStock = (p.variations || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

                if (statusFilter === 'deleted') {
                  return (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4">
                        {p.main_image_url ? (
                          <img
                            src={p.main_image_url}
                            alt={p.name}
                            className="w-10 h-14 object-cover object-top rounded-xs border border-stone-200 grayscale"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-stone-100 flex items-center justify-center rounded-xs text-stone-400 text-[10px]">
                            No Photo
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block line-through text-stone-500">{p.name}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{p.slug}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-medium">{getCategoryName(p.category_id)}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-stone-700">
                        ₦{p.base_price?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-500 text-[11px]">
                        {p.deleted_at ? new Date(p.deleted_at).toLocaleString() : 'Recently'}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-500 text-[11px]">
                        {p.deleted_by || 'Queen Lateefah'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRestoreFromDeleted(p.id)}
                            disabled={restoringId === p.id}
                            className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-semibold px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer"
                            title="Restore garment to active catalogue"
                          >
                            <RotateCcw size={12} className={restoringId === p.id ? 'animate-spin' : ''} />
                            <span>{restoringId === p.id ? 'Restoring...' : 'Restore'}</span>
                          </button>
                          <button
                            onClick={() => setPendingPermanentDelete({ id: p.id, name: p.name })}
                            className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Permanently delete from database"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      {p.main_image_url ? (
                        <img
                          src={p.main_image_url}
                          alt={p.name}
                          className="w-10 h-14 object-cover object-top rounded-xs border border-stone-200"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-stone-100 flex items-center justify-center rounded-xs text-stone-400 text-[10px]">
                          No Photo
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-900 block">{p.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{p.slug}</span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium">{getCategoryName(p.category_id)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                      <div className="flex items-center gap-2 group/price">
                        <span>₦{p.base_price?.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPriceProduct(p);
                            setNewBasePrice(p.base_price?.toString() || '');
                            setQuickPriceError('');
                          }}
                          className="opacity-80 group-hover/price:opacity-100 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded text-[10px] font-sans font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs border border-emerald-200"
                          title="Quick Edit Price"
                        >
                          <Tag size={10} />
                          <span>Edit Price</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(p.variations || []).length === 0 ? (
                        <>
                          <span className="text-amber-800 font-medium block">Needs input</span>
                          <span className="text-[10px] text-stone-400 block">No variations set</span>
                        </>
                      ) : (
                        <>
                          <span className="text-stone-700 font-medium">
                            {(p.variations || []).length} variations
                          </span>
                          <span
                            className={`text-[10px] block ${
                              totalStock === 0 ? 'text-red-600 font-semibold' : 'text-stone-400'
                            }`}
                          >
                            ({totalStock} total units)
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center space-x-1">
                      {p.is_new_arrival && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          New
                        </span>
                      )}
                      {p.is_featured && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={togglingStatusId === p.id}
                        onClick={() => handleTogglePublished(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                          p.is_published
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200'
                        }`}
                        title={p.is_published ? 'Click to unpublish (Draft)' : 'Click to publish live'}
                      >
                        {p.is_published ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{togglingStatusId === p.id ? 'Updating...' : p.is_published ? 'Published' : 'Draft'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <Link
                          to={`/admin/products/edit/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs text-stone-700 hover:text-stone-900 font-medium px-2 py-1 border border-stone-200 rounded hover:border-stone-400 transition-colors"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </Link>
                        <button
                          onClick={() => setPendingArchive({ id: p.id, name: p.name })}
                          disabled={archivingId === p.id}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Move garment to Recently Deleted"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile-First Card View */}
      <div className="block md:hidden space-y-3">
        {isTableLoading ? (
          <div className="py-10 text-center text-stone-400 bg-white border border-stone-200 rounded-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full mb-2" />
            <p className="text-xs uppercase tracking-wider">Loading Catalogue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-stone-500 font-light bg-white border border-stone-200 rounded-sm px-4">
            {statusFilter === 'deleted'
              ? 'No deleted garments found. Your catalogue is clean.'
              : 'No garments match your current search and filters.'}
          </div>
        ) : (
          filtered.map(p => (
            <div
              key={p.id}
              className="bg-white border border-stone-200 rounded-sm p-3.5 shadow-2xs space-y-3"
            >
              <div className="flex items-start gap-3">
                {p.main_image_url ? (
                  <img
                    src={p.main_image_url}
                    alt={p.name}
                    className="w-16 h-22 object-cover object-top rounded-xs border border-stone-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-22 bg-stone-100 flex items-center justify-center rounded-xs text-stone-400 text-[10px] flex-shrink-0">
                    No Photo
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-stone-100 text-stone-700 uppercase tracking-wider">
                      {getCategoryName(p.category_id)}
                    </span>
                    {p.is_new_arrival && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        New
                      </span>
                    )}
                    {statusFilter !== 'deleted' && (
                      <button
                        type="button"
                        disabled={togglingStatusId === p.id}
                        onClick={() => handleTogglePublished(p)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider cursor-pointer ${
                          p.is_published ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {p.is_published ? 'Live' : 'Draft'}
                      </button>
                    )}
                  </div>
                  <h3 className="font-semibold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                    {p.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-stone-900">
                      ₦{p.base_price?.toLocaleString()}
                    </span>
                    {statusFilter !== 'deleted' && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPriceProduct(p);
                          setNewBasePrice(p.base_price?.toString() || '');
                          setQuickPriceError('');
                        }}
                        className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 text-white rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Tag size={11} className="text-amber-300" />
                        <span>Edit Price</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                {statusFilter === 'deleted' ? (
                  <>
                    <button
                      onClick={() => handleRestoreFromDeleted(p.id)}
                      disabled={restoringId === p.id}
                      className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 font-semibold px-3 py-1.5 rounded cursor-pointer"
                    >
                      <RotateCcw size={12} className={restoringId === p.id ? 'animate-spin' : ''} />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => setPendingPermanentDelete({ id: p.id, name: p.name })}
                      className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900 font-medium px-2.5 py-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete Permanently</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to={`/admin/products/edit/${p.id}`}
                      className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900 font-medium px-2.5 py-1.5 border border-stone-200 rounded text-[11px]"
                    >
                      <Edit2 size={12} />
                      <span>Full Edit</span>
                    </Link>
                    <button
                      onClick={() => setPendingArchive({ id: p.id, name: p.name })}
                      className="p-1.5 text-stone-400 hover:text-red-600 transition-colors inline-flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Archive</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Undo Toast Notification */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-4 rounded-sm shadow-2xl border border-stone-700 flex items-center gap-4 max-w-md animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-stone-100 truncate">
              "{undoToast.name}" moved to Recently Deleted.
            </p>
            <p className="text-[11px] text-stone-400">
              Hidden from storefront. Can be restored anytime.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
            >
              Undo
            </button>
            <button
              onClick={() => setUndoToast(null)}
              className="p-1 text-stone-400 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Soft Delete (Archive) Confirmation Modal */}
      {pendingArchive && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Archive size={20} />
            </div>
            <div className="text-center">
              <h3 className="font-serif text-lg text-stone-900">Move to Recently Deleted?</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Garment <strong>"{pendingArchive.name}"</strong> will be safely removed from the storefront. You can restore it anytime with all photos, variations, and prices intact.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingArchive(null)}
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={archivingId !== null}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                {archivingId ? 'Moving...' : 'Move to Deleted'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {pendingPermanentDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-red-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <div className="text-center">
              <h3 className="font-serif text-lg text-red-950 font-bold">Permanent Deletion</h3>
              <p className="text-xs text-stone-700 mt-2 leading-relaxed">
                Are you completely sure you want to permanently delete <strong>"{pendingPermanentDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-red-700 font-semibold mt-1 bg-red-50 p-2 rounded">
                This action cannot be undone. All database records, variations, and image associations will be permanently removed.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingPermanentDelete(null)}
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteConfirm}
                disabled={permanentDeletingId !== null}
                className="flex-1 py-2.5 bg-red-700 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
              >
                {permanentDeletingId ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Price Edit Modal */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base text-stone-900 font-bold flex items-center gap-2">
                <Tag size={16} className="text-emerald-800" />
                Quick Edit Garment Price
              </h3>
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-900 mb-1">{quickPriceProduct.name}</p>
              <p className="text-[11px] text-stone-500">Update base selling price in Nigerian Naira (₦).</p>
            </div>

            {quickPriceError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded flex items-start gap-1.5">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-red-600" />
                <span>{quickPriceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickPrice} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-700 mb-1">
                  New Price (₦)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  autoFocus
                  value={newBasePrice}
                  onChange={e => setNewBasePrice(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-mono font-bold bg-white border border-stone-400 rounded-sm focus:outline-none focus:border-emerald-700"
                />

                <div className="mt-2">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
                    Quick Tap Price:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {['1500', '15000', '35000', '68000', '85000', '130000', '229500'].map(pVal => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setNewBasePrice(pVal)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
                          newBasePrice === pVal
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
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="flex-1 py-2.5 bg-emerald-950 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-emerald-900 transition-colors shadow-xs cursor-pointer"
                >
                  {savingPrice ? 'Saving Price...' : 'Save New Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
