import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Archive,
  History
} from 'lucide-react';
import { 
  getAllProducts, 
  getAllCategories, 
  archiveProduct, 
  restoreProduct, 
  permanentlyDeleteProduct, 
  getRecentlyDeletedProducts 
} from '../lib/api';
import { Product, Category } from '../types/product';

export default function ProductsPage() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'new_arrival' | 'deleted'>('all');
  
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

  // Restoring state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Check if navigated from EditProductPage after archiving
    if (location.state && (location.state as any).archivedProductName) {
      const state = location.state as any;
      triggerUndoToast(state.archivedProductId, state.archivedProductName);
      // Clean history state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getAllProducts(), getAllCategories()]);
      setProducts(prods);
      setCategories(cats);
      setRecentlyDeleted(getRecentlyDeletedProducts());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerUndoToast = (id: string, name: string) => {
    setUndoToast({ id, name });
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    const targetId = undoToast.id;
    setUndoToast(null);
    setRestoringId(targetId);
    try {
      await restoreProduct(targetId);
      await loadData();
    } catch (e) {
      console.error('Failed to restore product via undo:', e);
    } finally {
      setRestoringId(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!pendingArchive) return;
    const target = pendingArchive;
    setArchivingId(target.id);
    try {
      await archiveProduct(target.id, 'Queen Lateefah');
      triggerUndoToast(target.id, target.name);
      await loadData();
    } catch (e) {
      console.error('Failed to move product to Recently Deleted:', e);
    } finally {
      setArchivingId(null);
      setPendingArchive(null);
    }
  };

  const handleRestoreFromDeleted = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreProduct(id);
      await loadData();
    } catch (e) {
      console.error('Failed to restore product:', e);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!pendingPermanentDelete) return;
    const target = pendingPermanentDelete;
    setPermanentDeletingId(target.id);
    try {
      await permanentlyDeleteProduct(target.id);
      await loadData();
    } catch (e) {
      console.error('Failed to permanently delete product:', e);
    } finally {
      setPermanentDeletingId(null);
      setPendingPermanentDelete(null);
    }
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Unassigned';
    const match = categories.find(c => c.id === catId);
    return match ? match.name : catId;
  };

  // Determine current active display list
  const currentItems = statusFilter === 'deleted' ? recentlyDeleted : products;

  // Filter products
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
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="py-1.5 px-3 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none font-medium text-stone-700"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Tabs including Recently Deleted */}
          <div className="flex items-center border border-stone-200 rounded-sm bg-white overflow-hidden flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === 'published' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === 'draft' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setStatusFilter('new_arrival')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === 'new_arrival' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              New Arrivals
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                statusFilter === 'deleted' 
                  ? 'bg-amber-900 text-white' 
                  : 'text-stone-600 hover:bg-amber-50 hover:text-amber-900'
              }`}
              title="Recently deleted garments that can be restored"
            >
              <History size={13} />
              <span>Recently Deleted</span>
              {recentlyDeleted.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'deleted' ? 'bg-white text-amber-950' : 'bg-amber-100 text-amber-900'
                }`}>
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
              <p className="font-semibold">Recently Deleted Archive</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                These garments have been removed from the public storefront and customer cart listings. You can restore them anytime or permanently delete them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('all')}
            className="text-[11px] text-amber-900 font-semibold underline hover:text-amber-950 flex-shrink-0"
          >
            Back to Active Garments &rarr;
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
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
            {loading ? (
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
                        <span className="font-semibold text-stone-900 block line-through text-stone-500">{p.name}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{p.slug}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-medium">
                        {getCategoryName(p.category_id)}
                      </td>
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
                            className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-semibold px-2.5 py-1 rounded transition-colors shadow-2xs"
                            title="Restore garment to active catalogue"
                          >
                            <RotateCcw size={12} className={restoringId === p.id ? 'animate-spin' : ''} />
                            <span>{restoringId === p.id ? 'Restoring...' : 'Restore'}</span>
                          </button>
                          <button
                            onClick={() => setPendingPermanentDelete({ id: p.id, name: p.name })}
                            className="p-1 text-stone-400 hover:text-red-600 transition-colors"
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
                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {getCategoryName(p.category_id)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                      ₦{p.base_price?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-stone-700 font-medium">
                        {(p.variations || []).length} variations
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        ({totalStock} total units)
                      </span>
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
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          p.is_published
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {p.is_published ? 'Published' : 'Draft'}
                      </span>
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
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors"
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
              className="p-1 text-stone-400 hover:text-white"
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
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={archivingId !== null}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-700 transition-colors shadow-xs"
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
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteConfirm}
                disabled={permanentDeletingId !== null}
                className="flex-1 py-2.5 bg-red-700 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-800 transition-colors shadow-xs"
              >
                {permanentDeletingId ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
