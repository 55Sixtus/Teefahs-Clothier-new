import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Edit2, Trash2, Eye, AlertCircle } from 'lucide-react';
import { getAllProducts, getAllCategories, deleteProduct } from '../lib/api';
import { Product, Category } from '../types/product';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'new_arrival'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getAllProducts(), getAllCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      await deleteProduct(pendingDelete.id);
      await loadData();
    } catch (e) {
      console.error('Failed to delete product', e);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Unassigned';
    const match = categories.find(c => c.id === catId);
    return match ? match.name : catId;
  };

  // Filter products
  const filtered = products.filter(p => {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-1">
            Store Catalogue
          </span>
          <h1 className="text-3xl font-serif text-stone-900">Garments &amp; Collections</h1>
          <p className="text-xs text-stone-500 mt-1 font-light">
            Manage your bespoke abayas, French khimars, prayer wear, and accessories.
          </p>
        </div>
        <Link
          to="/admin/products/add"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-800 transition-colors shadow-xs self-start sm:self-auto"
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

          {/* Status Tabs */}
          <div className="flex items-center border border-stone-200 rounded-sm bg-white overflow-hidden">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              All
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
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-16">Photo</th>
              <th className="py-3 px-4 font-semibold">Garment Name</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Price (NGN)</th>
              <th className="py-3 px-4 font-semibold text-center">Variations</th>
              <th className="py-3 px-4 font-semibold text-center">Badges</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full mb-2" />
                  <p className="text-xs uppercase tracking-wider">Loading Catalogue...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500 font-light">
                  No garments match your current search and filters.
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const totalStock = (p.variations || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

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
                          onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                          disabled={deletingId === p.id}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete garment"
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

      {/* Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="text-center">
              <h3 className="font-serif text-lg text-stone-900">Delete This Garment?</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong>"{pendingDelete.name}"</strong>?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-700 transition-colors shadow-xs"
              >
                {deletingId ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
