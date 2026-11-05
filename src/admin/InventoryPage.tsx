import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Save, Edit2, Tag, X, ArrowRightLeft } from 'lucide-react';
import { getAllProducts, updateVariationStock, updateProductPrice } from '../lib/api';
import { Product, ProductVariation } from '../types/product';

interface FlatVariation {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  colour: string;
  stockQuantity: number;
  price: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<FlatVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Quick Price Modal state
  const [quickPriceItem, setQuickPriceItem] = useState<FlatVariation | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    loadInventory();

    const handleCatalogueUpdated = () => {
      loadInventory();
    };
    window.addEventListener('teefahs_catalogue_updated', handleCatalogueUpdated);
    return () => window.removeEventListener('teefahs_catalogue_updated', handleCatalogueUpdated);
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const prods = await getAllProducts();
      const flatList: FlatVariation[] = [];

      for (const p of prods) {
        if (p.variations && p.variations.length > 0) {
          for (const v of p.variations) {
            flatList.push({
              id: v.id,
              productId: p.id,
              productName: p.name,
              productImage: p.main_image_url || '',
              size: v.size || 'One Size',
              colour: v.colour || 'Standard',
              stockQuantity: Number(v.stock_quantity) || 0,
              price: Number(v.price ?? p.base_price) || 0,
            });
          }
        }
      }
      setItems(flatList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (id: string, newQty: number) => {
    const validQty = Math.max(0, newQty);
    setItems(prev => prev.map(item => item.id === id ? { ...item, stockQuantity: validQty } : item));
  };

  const handleCommitStock = async (id: string, newQty: number) => {
    setSavingId(id);
    try {
      await updateVariationStock(id, newQty);
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 2000);
    } catch (e) {
      console.error('Failed to commit stock:', e);
    } finally {
      setSavingId(null);
    }
  };

  const openQuickPrice = (item: FlatVariation) => {
    setQuickPriceItem(item);
    setNewPriceInput(item.price ? item.price.toString() : '');
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceItem) return;

    const parsed = parseFloat(newPriceInput);
    if (isNaN(parsed) || parsed < 0) return;

    setSavingPrice(true);
    try {
      await updateProductPrice(quickPriceItem.productId, parsed);
      // Update local item row prices
      setItems(prev => prev.map(i => i.productId === quickPriceItem.productId ? { ...i, price: parsed } : i));
      setQuickPriceItem(null);
    } catch (err) {
      console.error('Failed to update price:', err);
    } finally {
      setSavingPrice(false);
    }
  };

  // Filter items
  const filtered = items.filter(item => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.colour.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.size.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'low') return item.stockQuantity > 0 && item.stockQuantity < 5;
    if (filterMode === 'out') return item.stockQuantity === 0;
    return true;
  });

  // KPI stats
  const totalUnits = items.reduce((sum, item) => sum + item.stockQuantity, 0);
  const lowStockCount = items.filter(item => item.stockQuantity > 0 && item.stockQuantity < 5).length;
  const outOfStockCount = items.filter(item => item.stockQuantity === 0).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-800 font-bold block mb-1">
            Warehouse &amp; Stock Control
          </span>
          <h1 className="text-3xl font-serif text-stone-900">Inventory Management</h1>
          <p className="text-xs text-stone-500 mt-1 font-light">
            Monitor real-time variation levels, adjust available stock, and update selling prices directly.
          </p>
        </div>
        <button
          onClick={loadInventory}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 border border-stone-200 rounded-sm shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
            Total Inventory Units
          </span>
          <div className="text-2xl font-serif text-stone-900">{totalUnits}</div>
          <span className="text-[11px] text-stone-400 mt-1 block">Across all sizes and colourways</span>
        </div>

        <div className="bg-white p-5 border border-amber-200/80 rounded-sm shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Low Stock Variations (&lt; 5)
            </span>
            <AlertTriangle size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-serif text-amber-900">{lowStockCount}</div>
          <span className="text-[11px] text-amber-700/80 mt-1 block">Require tailoring re-order</span>
        </div>

        <div className="bg-white p-5 border border-red-200/80 rounded-sm shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-800">
              Out of Stock Variations
            </span>
            <XCircle size={15} className="text-red-600" />
          </div>
          <div className="text-2xl font-serif text-red-900">{outOfStockCount}</div>
          <span className="text-[11px] text-red-700/80 mt-1 block">Unavailable on storefront</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search garment, size, colour..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 placeholder:text-stone-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            All Variations ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('low')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
              filterMode === 'low'
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterMode('out')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
              filterMode === 'out'
                ? 'bg-red-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Hint Banner for Mobile / Smaller Screens */}
      <div className="flex items-center justify-between p-2.5 bg-stone-100/80 border border-stone-200/90 rounded-sm text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="text-emerald-700 flex-shrink-0" />
          <span className="font-medium text-stone-800">
            Horizontal Scroll Enabled:
          </span>
          <span className="text-stone-500 text-[11px] hidden sm:inline">
            Scroll sideways to view all columns, prices, and quick stock updates.
          </span>
          <span className="text-stone-500 text-[11px] sm:hidden">
            Swipe left/right to view price &amp; update buttons.
          </span>
        </div>
        <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {filtered.length} Items Loaded
        </span>
      </div>

      {/* Variations Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-x-auto w-full scrollbar-thin">
        <table className="w-full min-w-[980px] text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-16">Garment</th>
              <th className="py-3 px-4 font-semibold">Product Name</th>
              <th className="py-3 px-4 font-semibold">Size</th>
              <th className="py-3 px-4 font-semibold">Colour</th>
              <th className="py-3 px-4 font-semibold">Price (NGN)</th>
              <th className="py-3 px-4 font-semibold">Stock Level</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Quick Stock Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500 font-light">
                  No inventory variations found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map(v => {
                const isOutOfStock = v.stockQuantity === 0;
                const isLowStock = v.stockQuantity > 0 && v.stockQuantity < 5;

                return (
                  <tr key={v.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      {v.productImage ? (
                        <img
                          src={v.productImage}
                          alt={v.productName}
                          className="w-10 h-14 object-cover object-top rounded-xs border border-stone-200"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-stone-100 rounded-xs" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-900 block">{v.productName}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-700">{v.size}</td>
                    <td className="py-3 px-4 font-medium text-stone-700">{v.colour}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                      <div className="flex items-center gap-2">
                        <span>₦{v.price.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => openQuickPrice(v)}
                          className="p-1 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-[10px] font-sans font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Change price quickly"
                        >
                          <Tag size={11} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-sm text-stone-900">{v.stockQuantity}</span>{' '}
                      <span className="text-[11px] text-stone-400">units</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                          <XCircle size={11} /> Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={11} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} /> In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <Link
                          to={`/admin/products/edit/${v.productId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded transition-colors"
                          title="Edit full product details and imagery"
                        >
                          <Edit2 size={12} />
                          <span>Full Edit</span>
                        </Link>
                        <input
                          type="number"
                          min="0"
                          value={v.stockQuantity}
                          onChange={e => handleStockChange(v.id, parseInt(e.target.value) || 0)}
                          onBlur={e => handleCommitStock(v.id, parseInt(e.target.value) || 0)}
                          className="w-16 p-1 text-center font-mono text-xs bg-stone-50 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                        />
                        <button
                          onClick={() => handleCommitStock(v.id, v.stockQuantity)}
                          disabled={savingId === v.id}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            savedSuccessId === v.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                          title="Save stock quantity"
                        >
                          <Save size={13} />
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

      {/* Quick Price Edit Modal for Inventory */}
      {quickPriceItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQuickPriceItem(null)}
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
                onClick={() => setQuickPriceItem(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-900">{quickPriceItem.productName}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Size: {quickPriceItem.size} | Colour: {quickPriceItem.colour}
              </p>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-semibold text-stone-600 block mb-1">
                  New Selling Price (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newPriceInput}
                    onChange={e => setNewPriceInput(e.target.value)}
                    placeholder="e.g. 70000"
                    autoFocus
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-semibold bg-stone-50 border border-stone-300 rounded focus:outline-none focus:border-stone-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceItem(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice || !newPriceInput}
                  className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 rounded transition-colors cursor-pointer shadow-sm"
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

