import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Copy,
  Check,
  ExternalLink,
  Search,
  Zap,
  HardDrive,
  Maximize2,
  X,
  Edit2,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { SUPPLIED_PHOTOS, NEW_PRODUCT_PHOTOS } from '../data/assets';
import { uploadProductImage, updateProductPrice } from '../lib/api';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { Product } from '../types/product';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  category: string;
  productSlug?: string;
  productName?: string;
}

export default function MediaStoragePage() {
  const { products, categories, refreshProducts } = useRealtimeProducts({ includeUnpublished: true });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Quick Price Edit Modal
  const [quickPriceProduct, setQuickPriceProduct] = useState<{ product: Product; itemTitle: string } | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [quickPriceSuccess, setQuickPriceSuccess] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState('');

  const findProductForMedia = (item: MediaItem): Product | undefined => {
    if (item.productSlug) {
      const matchSlug = products.find(p => p.slug === item.productSlug);
      if (matchSlug) return matchSlug;
    }

    if (item.productName) {
      const matchName = products.find(p => p.name.toLowerCase() === item.productName?.toLowerCase());
      if (matchName) return matchName;
    }

    const exactMain = products.find(p => p.main_image_url === item.url);
    if (exactMain) return exactMain;

    const exactGallery = products.find(
      p =>
        p.images &&
        p.images.some(img => {
          const url = typeof img === 'string' ? img : img.image_url;
          return url === item.url;
        })
    );
    if (exactGallery) return exactGallery;

    return undefined;
  };

  // Build verified media registry dynamically from approved studio photography + live Supabase products
  const mediaList: MediaItem[] = useMemo(() => {
    const list: MediaItem[] = [];
    const seenUrls = new Set<string>();

    const getCatName = (catId?: string) => {
      if (!catId) return 'Boutique Garments';
      const found = categories.find(c => c.id === catId || c.slug === catId);
      return found ? found.name : 'Boutique Garments';
    };

    // 1. Live Supabase products & attached photos (always authoritative first)
    products.forEach(p => {
      const catName = getCatName(p.category_id);
      if (p.main_image_url && !seenUrls.has(p.main_image_url)) {
        seenUrls.add(p.main_image_url);
        list.push({
          id: `live-main-${p.id}`,
          url: p.main_image_url,
          title: `${p.name} (Main Photo)`,
          category: catName,
          productSlug: p.slug,
          productName: p.name,
        });
      }
      (p.images || []).forEach((img, idx) => {
        const url = typeof img === 'string' ? img : img.image_url;
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          list.push({
            id: `live-img-${p.id}-${idx}`,
            url,
            title: `${p.name} - View ${idx + 2}`,
            category: catName,
            productSlug: p.slug,
            productName: p.name,
          });
        }
      });
    });

    // 2. Approved editorial studio photography not already represented above
    SUPPLIED_PHOTOS.forEach((url, idx) => {
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      let title = `Editorial Photograph #${idx + 1}`;
      let category = 'Editorial Studio';
      let productSlug = '';
      let productName = '';

      if (idx === 0) {
        title = 'Royal Black Embellished Occasion Abaya';
        category = 'Occasion Wear';
        productSlug = 'royal-black-embellished-occasion-abaya';
        productName = 'Royal Black Embellished Occasion Abaya';
      } else if (idx === 1) {
        title = 'Noor Ceremonial Black Silk Occasion Robe';
        category = 'Occasion Wear';
        productSlug = 'noor-ceremonial-black-silk-occasion-robe';
        productName = 'Noor Ceremonial Black Silk Occasion Robe';
      } else if (idx === 2) {
        title = 'Kamp Elegance Embroidered Evening Abaya';
        category = 'Occasion Wear';
        productSlug = 'kamp-elegance-embroidered-evening-abaya';
        productName = 'Kamp Elegance Embroidered Evening Abaya';
      } else if (idx >= 3 && idx <= 8) {
        title = `Noor Embellished Luxury Abaya - Angle ${idx - 2}`;
        category = 'Abayas';
        productSlug = 'noor-embroidered-luxury-abaya';
        productName = 'Noor Embellished Luxury Abaya';
      } else if (idx >= 9 && idx <= 14) {
        title = `Ameera Tiered Chiffon Open Abaya - Shot ${idx - 8}`;
        category = 'Abayas';
        productSlug = 'ameera-tiered-chiffon-open-abaya';
        productName = 'Ameera Tiered Chiffon Open Abaya';
      } else if (idx >= 15 && idx <= 19) {
        title = `Zahra French Diamond Khimar - Angle ${idx - 14}`;
        category = 'Khimars';
        productSlug = 'zahra-french-diamond-khimar';
        productName = 'Zahra French Diamond Khimar';
      } else if (idx >= 20 && idx <= 25) {
        title = `Maryam Flowing Prayer Set - View ${idx - 19}`;
        category = 'Prayer Wear';
        productSlug = 'maryam-flowing-two-piece-prayer-set';
        productName = 'Maryam Flowing Two-Piece Prayer Set';
      } else if (idx >= 49 && idx <= 53) {
        title = `Zainab Modal Hijab & Under-Cap - Shot ${idx - 48}`;
        category = 'Caps';
        productSlug = 'zainab-luxe-modal-hijab-under-cap-set';
        productName = 'Zainab Luxe Modal Hijab & Under-Cap Set';
      }

      list.push({
        id: `editorial-${idx + 1}`,
        url,
        title,
        category,
        productSlug,
        productName,
      });
    });

    // 3. Approved Hijab & Veil studio batch
    const addBatch = (urls: string[], prefix: string, cat: string, slug: string, name: string) => {
      urls.forEach((url, idx) => {
        if (seenUrls.has(url)) return;
        seenUrls.add(url);
        list.push({
          id: `${prefix}-${idx + 1}`,
          url,
          title: `${name} - Shot ${idx + 1}`,
          category: cat,
          productSlug: slug,
          productName: name,
        });
      });
    };

    addBatch(NEW_PRODUCT_PHOTOS.malaysianHijabs, 'malaysian', 'Hijabs', 'malaysian-hijabs', 'Malaysian Hijabs');
    addBatch(NEW_PRODUCT_PHOTOS.luxeJerseyVeil, 'luxe-veil', 'Veils', 'luxe-jersey-veil', 'Luxe Jersey Veil');
    addBatch(NEW_PRODUCT_PHOTOS.khadeejahHijab, 'khadeejah', 'Hijabs', 'khadeejah-hijab', 'Khadeejah Hijab');
    addBatch(NEW_PRODUCT_PHOTOS.aishaLuxeAllWhite, 'aisha', 'Hijabs', 'aisha-luxe-all-white', 'Aisha Luxe All-White');
    addBatch(
      NEW_PRODUCT_PHOTOS.jacquardJerseyLaserCutHijab,
      'jacquard',
      'Hijabs',
      'jacquard-jersey-laser-cut-hijab',
      'Jacquard Jersey Laser-Cut Hijab'
    );

    return list;
  }, [products, categories]);

  const categoryTabs = useMemo(() => {
    const uniqueCats = Array.from(new Set(mediaList.map(m => m.category).filter(Boolean)));
    return ['all', ...uniqueCats];
  }, [mediaList]);

  const filteredMedia = useMemo(() => {
    return mediaList.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [mediaList, selectedCategory, searchQuery]);

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const file = files[0];
      const uploadedUrl = await uploadProductImage(file);
      setUploadSuccess(`Uploaded to Supabase Storage: ${uploadedUrl}`);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openQuickPrice = (product: Product, itemTitle: string) => {
    setQuickPriceProduct({ product, itemTitle });
    setNewPriceInput(product.base_price?.toString() || '');
    setQuickPriceSuccess(false);
    setQuickPriceError('');
  };

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
      await updateProductPrice(quickPriceProduct.product.id, priceNum);
      setQuickPriceSuccess(true);
      await refreshProducts();
      setTimeout(() => {
        setQuickPriceProduct(null);
        setQuickPriceSuccess(false);
      }, 650);
    } catch (err: any) {
      console.error('Failed to update price:', err);
      setQuickPriceError(err?.message || 'Could not update price in Supabase.');
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold">
              Boutique Assets
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[11px] font-medium text-stone-500">
              Supabase Storage &amp; Studio Library
            </span>
          </div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight">
            Media &amp; Storage Manager
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light max-w-2xl leading-relaxed">
            Manage approved garment photographs, inspect connected Supabase products, edit prices directly, and upload new assets.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-emerald-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-sm self-start sm:self-auto">
          <Upload size={15} />
          <span>{uploading ? 'Compressing & Uploading...' : 'Upload New Photo'}</span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Live Storage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold font-serif text-lg">
              {mediaList.length}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-950">Approved Photographs</p>
              <p className="text-[11px] text-stone-600 mt-0.5">Verified boutique studio &amp; live Supabase assets</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-950">Supabase Storage</p>
              <p className="text-[11px] text-stone-600 mt-0.5">Direct authenticated uploads to `product-images`</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-stone-200 text-stone-800 flex items-center justify-center font-bold">
              <HardDrive size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-900">Auto Optimization</p>
              <p className="text-[11px] text-stone-600 mt-0.5">Resized JPEG (85% quality) for fast mobile loads</p>
            </div>
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check size={16} className="text-emerald-700 flex-shrink-0" />
            <span className="truncate">{uploadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(uploadSuccess.replace('Uploaded to Supabase Storage: ', ''))}
            className="text-[11px] font-semibold underline flex-shrink-0 cursor-pointer"
          >
            Copy URL
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded flex items-center gap-2">
          <AlertCircle size={16} className="text-red-700 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by photo title or product..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categoryTabs.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {cat === 'all' ? `All (${mediaList.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMedia.map(item => {
          const matchedProduct = findProductForMedia(item);

          return (
            <div
              key={item.id}
              className="bg-white border border-stone-200 rounded-sm overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div className="aspect-[3/4] bg-stone-100 relative overflow-hidden">
                <img
                  src={item.url}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-stone-900/80 text-white rounded-xs">
                    {item.category}
                  </span>
                </div>

                {matchedProduct?.base_price !== undefined && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-emerald-900/90 text-white rounded-xs shadow-sm">
                      ₦{matchedProduct.base_price.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(item.url)}
                    className="p-1.5 bg-white text-stone-900 rounded-full hover:bg-stone-100 shadow-md cursor-pointer"
                    title="Preview image full screen"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white text-stone-900 rounded-full hover:bg-stone-100 shadow-md"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="p-2.5 flex flex-col justify-between flex-1 gap-2 bg-white">
                <div>
                  <p className="text-[11px] font-semibold text-stone-900 line-clamp-1" title={item.title}>
                    {item.title}
                  </p>
                  {matchedProduct ? (
                    <div className="mt-1">
                      <p className="text-[10px] text-emerald-800 font-semibold truncate">
                        {matchedProduct.name}
                      </p>
                      <p className="text-xs font-mono font-bold text-stone-900 mt-0.5">
                        ₦{matchedProduct.base_price ? matchedProduct.base_price.toLocaleString() : 'Enquire'}
                      </p>
                    </div>
                  ) : item.productName ? (
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">{item.productName}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => copyUrl(item.id, item.url)}
                    className={`w-full py-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      copiedId === item.id
                        ? 'bg-emerald-800 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check size={11} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  {matchedProduct ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openQuickPrice(matchedProduct, item.title)}
                        className="flex-1 py-1.5 px-2 bg-emerald-900 hover:bg-emerald-800 text-white text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors text-center shadow-2xs cursor-pointer"
                      >
                        <Tag size={11} className="text-amber-300" />
                        <span>Edit Price</span>
                      </button>

                      <Link
                        to={`/admin/products/edit/${matchedProduct.id}`}
                        className="py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center"
                        title="Open full garment editor"
                      >
                        <Edit2 size={11} />
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to="/admin/products/add"
                      className="w-full py-1 px-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors text-center"
                    >
                      <span>+ Create Garment</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Price Edit Modal */}
      {quickPriceProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
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
              <p className="text-xs font-semibold text-stone-900">{quickPriceProduct.product.name}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Asset: {quickPriceProduct.itemTitle}</p>
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
              </div>

              {quickPriceSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded flex items-center gap-1.5 font-medium">
                  <Check size={14} className="text-emerald-700" />
                  <span>Price successfully updated!</span>
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

      {/* Full-Screen Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-stone-900 p-2 rounded-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-stone-900 rounded-full hover:bg-stone-200 shadow-lg cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
