import { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Image as ImageIcon, FolderTree, AlertCircle } from 'lucide-react';
import { getAllCategories, saveCategory, getAllProducts, uploadProductImage } from '../lib/api';
import { Category } from '../types/product';
import { ASSETS } from '../data/assets';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([getAllCategories(), getAllProducts()]);
      setCategories(cats);

      // Compute counts
      const counts: Record<string, number> = {};
      for (const p of prods) {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      }
      setProductCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl(ASSETS.productImages[0] || '');
    setIsActive(true);
    setDisplayOrder(categories.length + 1);
    setIsEditing(true);
    setMsg(null);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.image_url || '');
    setIsActive(cat.is_active ?? true);
    setDisplayOrder(cat.display_order ?? 1);
    setIsEditing(true);
    setMsg(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setImageUrl(url);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Image upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMsg(null);
    try {
      await saveCategory({
        id: editingId || undefined,
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description.trim(),
        image_url: imageUrl,
        display_order: Number(displayOrder) || 1,
        is_active: isActive,
      });

      setMsg({ type: 'success', text: `Category "${name}" successfully saved.` });
      await loadData();
      setTimeout(() => {
        setIsEditing(false);
      }, 1000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save category.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-1">
            Taxonomy &amp; Hierarchy
          </span>
          <h1 className="text-3xl font-serif text-stone-900">Categories Management</h1>
          <p className="text-xs text-stone-500 mt-1 font-light">
            Manage your storefront collection categories, photographic banners, and visibility.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-800 transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-16">Cover</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold hidden md:table-cell">Slug</th>
              <th className="py-3 px-4 font-semibold hidden lg:table-cell">Description</th>
              <th className="py-3 px-4 font-semibold text-center">Items</th>
              <th className="py-3 px-4 font-semibold text-center">Order</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {categories.map(c => (
              <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                <td className="py-3 px-4">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-10 h-14 object-cover object-top rounded-xs border border-stone-200"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-stone-100 flex items-center justify-center rounded-xs text-stone-400">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-stone-900 block">{c.name}</span>
                </td>
                <td className="py-3 px-4 text-stone-500 font-mono text-[11px] hidden md:table-cell">
                  {c.slug}
                </td>
                <td className="py-3 px-4 text-stone-600 line-clamp-2 max-w-xs hidden lg:table-cell font-light">
                  {c.description || '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded font-semibold text-[11px]">
                    {productCounts[c.id] || 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-stone-500 font-medium">
                  {c.display_order ?? 1}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      c.is_active ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => openEditModal(c)}
                    className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium px-2 py-1 border border-stone-200 rounded hover:border-stone-400 transition-colors"
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-xl font-serif text-stone-900">
                {editingId ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            {msg && (
              <div
                className={`p-3 text-xs rounded-sm flex items-center gap-2 ${
                  msg.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                {msg.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
                <span>{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-semibold text-stone-700 tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!editingId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 text-stone-900"
                  placeholder="e.g. Occasion Wear"
                />
              </div>

              <div>
                <label className="block uppercase font-semibold text-stone-700 tracking-wider mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 text-stone-900"
                  placeholder="occasion-wear"
                />
              </div>

              <div>
                <label className="block uppercase font-semibold text-stone-700 tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900 text-stone-900"
                  placeholder="Brief narrative for collection cards..."
                />
              </div>

              <div>
                <label className="block uppercase font-semibold text-stone-700 tracking-wider mb-1">
                  Category Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-sm text-stone-900 text-xs"
                    placeholder="https://..."
                  />
                  <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold uppercase tracking-wider border border-stone-300 rounded-sm cursor-pointer transition-colors flex items-center gap-1">
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                {imageUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={imageUrl} alt="preview" className="w-12 h-14 object-cover rounded border" />
                    <span className="text-[11px] text-stone-500">Preview</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block uppercase font-semibold text-stone-700 tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={e => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-sm text-stone-900"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-800 rounded"
                    />
                    <span className="font-semibold text-stone-800">Category Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 uppercase font-semibold tracking-wider hover:bg-stone-50 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-stone-900 text-white uppercase font-semibold tracking-wider hover:bg-stone-800 rounded-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
