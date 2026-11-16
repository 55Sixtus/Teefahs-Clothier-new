import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Edit2,
  Tag,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { updateVariationStock, updateProductPrice } from '../lib/api';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';

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
  const { products, loading, error: realtimeError, refreshProducts } = useRealtimeProducts({
    includeUnpublished: true,
  });

  const [draftStocks, setDraftStocks] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Price Modal state
  const [quickPriceItem, setQuickPriceItem] = useState<FlatVariation | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState('');

  const items: FlatVariation[] = useMemo(() => {
    const flatList: FlatVariation[] = [];
    for (const p of products) {
      if (p.variations && p.variations.length > 0) {
        for (const v of p.variations) {
          const liveQty = Math.max(0, Number(v.stock_quantity) || 0);
          const effectivePrice =
            v.price_override != null && Number.isFinite(Number(v.price_override))
              ? Number(v.price_override)
              : Math.max(0, Number(p.base_price || 0) + Number(v.price_adjustment || 0));
          flatList.push({
            id: v.id,
            productId: p.id,
            productName: p.name,
            productImage: p.main_image_url || '',
            size: v.size || 'One Size',
            colour: v.colour || 'Standard',
            stockQuantity: draftStocks[v.id] !== undefined ? draftStocks[v.id] : liveQty,
            price: effectivePrice,
          });
        }
      }
    }
    return flatList;
  }, [products, draftStocks]);

  const handleStockChange = (id: string, newQty: number) => {
    const validQty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    setDraftStocks(prev => ({ ...prev, [id]: validQty }));
  };

  const handleCommitStock = async (id: string, newQty: number) => {
    if (savingId) return;
    const validQty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    setSavingId(id);
    setErrorMsg('');
    try {
      await updateVariationStock(id, validQty);
      setDraftStocks(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavedSuccessId(id);
      setSuccessMsg(`Stock confirmed at ${validQty} units.`);
      await refreshProducts();
      setTimeout(() => {
        setSavedSuccessId(null);
        setSuccessMsg('');
      }, 2500);
    } catch (e: any) {
      console.error('Failed to commit stock:', e);
      setErrorMsg(e?.message || 'Could not update stock level. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const openQuickPrice = (item: FlatVariation) => {
    setQuickPriceItem(item);
    setNewPriceInput(item.price ? item.price.toString() : '');
    setQuickPriceError('');
  };

  const handleSavePrice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickPriceItem || savingPrice) return;

    const parsed = parseFloat(newPriceInput);
    if (isNaN(parsed) || parsed < 0) {
      setQuickPriceError('Please enter a valid price in Naira (₦).');
      return;
    }

    setSavingPrice(true);
    setQuickPriceError('');
    setErrorMsg('');
    try {
      const updated = await updateProductPrice(quickPriceItem.productId, parsed);
      setSuccessMsg(
        `Saved! "${updated.name}" price is now confirmed at ₦${Number(updated.base_price || 0).toLocaleString()}.`
      );
      setQuickPriceItem(null);
      await refreshProducts();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error('Failed to update price:', err);
      setQuickPriceError(
        err?.message || 'Could not save the new price. Your entered value is kept — please retry.'
      );
    } finally {
      setSavingPrice(false);
    }
  };

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

  const totalUnits = items.reduce((sum, item) => sum + item.stockQuantity, 0);
  const lowStockCount = items.filter(item => item.stockQuantity > 0 && item.stockQuantity < 5).length;
  const outOfStockCount = items.filter(item => item.stockQuantity === 0).length;

  return (
    <div className="space-y-8 pb-16">
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
          onClick={() => refreshProducts()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Stock</span>
        </button>
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

        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
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

      {/* Horizontal Scroll Hint */}
      <div className="flex items-center justify-between p-2.5 bg-stone-100/80 border border-stone-200/90 rounded-sm text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="text-emerald-700 flex-shrink-0" />
          <span className="font-medium text-stone-800">Inventory Table:</span>
          <span className="text-stone-500 text-[11px] hidden sm:inline">
            Edit any quantity and click Save (or leave the field) to commit directly to Supabase.
          </span>
        </div>
        <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {filtered.length} Variations
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
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full mb-2" />
                  <p className="text-xs uppercase tracking-wider">Loading Inventory...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
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
                          onChange={e => handleStockChange(v.id, parseInt(e.target.value, 10))}
                          className="w-16 p-1 text-center font-mono text-xs bg-stone-50 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                        />
                        <button
                          type="button"
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

      {/* Quick Price Edit Modal */}
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
                <h3 className="font-serif text-base text-stone-900 font-semibold">Change Price</h3>
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

            {quickPriceError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{quickPriceError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSavePrice()}
                  disabled={savingPrice}
                  className="px-2 py-0.5 bg-red-700 text-white rounded text-[10px] font-semibold flex-shrink-0 cursor-pointer hover:bg-red-800"
                >
                  Retry
                </button>
              </div>
            )}

            <form onSubmit={handleSavePrice} noValidate className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-semibold text-stone-600 block mb-1">
                  New Selling Price (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newPriceInput}
                    onChange={e => setNewPriceInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 1500 or 229500"
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
                  {savingPrice ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
