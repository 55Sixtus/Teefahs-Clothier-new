import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Save, Edit2 } from 'lucide-react';
import { getAllProducts, updateVariationStock } from '../lib/api';
import { Product, ProductVariation } from '../types/product';

interface FlatVariation {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  colour: string;
  stockQuantity: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<FlatVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
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
            Monitor real-time variation levels, adjust available stock, and replenish modest pieces.
          </p>
        </div>
        <button
          onClick={loadInventory}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-50 transition-colors self-start sm:self-auto"
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
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            All Variations ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('low')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
              filterMode === 'low'
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterMode('out')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
              filterMode === 'out'
                ? 'bg-red-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Variations Table */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-16">Garment</th>
              <th className="py-3 px-4 font-semibold">Product Name</th>
              <th className="py-3 px-4 font-semibold">Size</th>
              <th className="py-3 px-4 font-semibold">Colour</th>
              <th className="py-3 px-4 font-semibold">Stock Level</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Quick Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500 font-light">
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
                          title="Edit product pricing and details"
                        >
                          <Edit2 size={12} />
                          <span>Edit Price &amp; Details</span>
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
                          className={`p-1.5 rounded transition-colors ${
                            savedSuccessId === v.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                          title="Save stock level"
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
    </div>
  );
}
