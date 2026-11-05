import { useState, useMemo, useEffect } from 'react';
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
  Tag
} from 'lucide-react';
import { SUPPLIED_PHOTOS, NEW_PRODUCT_PHOTOS } from '../data/assets';
import { uploadProductImage, getAllProducts, saveProduct } from '../lib/api';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Quick Price Edit Modal
  const [quickPriceProduct, setQuickPriceProduct] = useState<{ product: Product; itemTitle: string } | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [quickPriceSuccess, setQuickPriceSuccess] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const prods = await getAllProducts();
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  // Find exact matching product for media item (never fall back to first product)
  const findProductForMedia = (item: MediaItem): Product | undefined => {
    // 1. Match by exact main_image_url
    const exactMain = products.find(p => p.main_image_url === item.url);
    if (exactMain) return exactMain;

    // 2. Match by images list
    const exactGallery = products.find(p => p.images && p.images.some(img => {
      const url = typeof img === 'string' ? img : img.image_url;
      return url === item.url;
    }));
    if (exactGallery) return exactGallery;

    // 3. Match by specific product slug
    if (item.productSlug) {
      const matchSlug = products.find(p => p.slug === item.productSlug);
      if (matchSlug) return matchSlug;
    }

    // 4. Match by exact product name
    if (item.productName) {
      const matchName = products.find(p => p.name.toLowerCase() === item.productName?.toLowerCase());
      if (matchName) return matchName;
    }

    return undefined;
  };

  // Build the complete boutique media registry
  const mediaList: MediaItem[] = useMemo(() => {
    const list: MediaItem[] = [];

    // 1. 54 Editorial Photoshoot Photographs
    SUPPLIED_PHOTOS.forEach((url, idx) => {
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
        title = `Noor Luxury Embroidered Abaya - Angle ${idx - 2}`;
        category = 'Abayas';
        productSlug = 'noor-embroidered-luxury-abaya';
        productName = 'Noor Embroidered Luxury Abaya';
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
      } else if (idx === 26) {
        title = 'Layla Embellished Luxury Occasion Silk Abaya';
        category = 'Occasion Wear';
        productSlug = 'layla-embellished-occasion-silk-abaya';
        productName = 'Layla Embellished Luxury Occasion Silk Abaya';
      } else if (idx === 27) {
        title = 'Zeenat Royal Gold Thread Occasion Abaya';
        category = 'Occasion Wear';
        productSlug = 'zeenat-royal-gold-thread-occasion-abaya';
        productName = 'Zeenat Royal Gold Thread Occasion Abaya';
      } else if (idx === 28) {
        title = 'Malika Crystal-Draped Evening Occasion Gown';
        category = 'Occasion Wear';
        productSlug = 'malika-crystal-draped-evening-occasion-gown';
        productName = 'Malika Crystal-Draped Evening Occasion Gown';
      } else if (idx >= 29 && idx <= 32) {
        title = `Hafsah Medina Silk Rounded Khimar - View ${idx - 28}`;
        category = 'Khimars';
        productSlug = 'hafsah-medina-silk-rounded-khimar';
        productName = 'Hafsah Medina Silk Rounded Khimar';
      } else if (idx >= 33 && idx <= 34) {
        title = `Fatima Pleated Hem Minimalist Abaya - Shot ${idx - 32}`;
        category = 'Abayas';
        productSlug = 'fatima-pleated-hem-minimalist-abaya';
        productName = 'Fatima Pleated Hem Minimalist Abaya';
      } else if (idx >= 35 && idx <= 39) {
        title = `Amani Breathable Chiffon Veil & Hijab - Shot ${idx - 34}`;
        category = 'Veils & Hijabs';
        productSlug = 'amani-breathable-chiffon-veil-hijab-set';
        productName = 'Amani Breathable Chiffon Veil & Hijab Set';
      } else if (idx === 40) {
        title = 'Sultana Beaded Evening Occasion Kimono';
        category = 'Occasion Wear';
        productSlug = 'sultana-beaded-evening-occasion-kimono';
        productName = 'Sultana Beaded Evening Occasion Kimono';
      } else if (idx === 41) {
        title = 'Soraya Hand-Beaded Black Occasion Kimono';
        category = 'Occasion Wear';
        productSlug = 'soraya-hand-beaded-black-occasion-kimono';
        productName = 'Soraya Hand-Beaded Black Occasion Kimono';
      } else if (idx === 42) {
        title = 'Jawhara Royal Evening Silk Kimono';
        category = 'Occasion Wear';
        productSlug = 'jawhara-royal-evening-silk-kimono';
        productName = 'Jawhara Royal Evening Silk Kimono';
      } else if (idx === 43) {
        title = 'Sultana Beaded Sweeping Hemline Kimono';
        category = 'Occasion Wear';
        productSlug = 'sultana-beaded-sweeping-hemline-kimono';
        productName = 'Sultana Beaded Sweeping Hemline Kimono';
      } else if (idx >= 44 && idx <= 48) {
        title = `Rukayyah Zip-Front Prayer Abaya - Shot ${idx - 43}`;
        category = 'Prayer Wear';
        productSlug = 'rukayyah-zip-front-hooded-prayer-abaya';
        productName = 'Rukayyah Zip-Front Hooded Prayer Abaya';
      } else if (idx >= 49 && idx <= 53) {
        title = `Zainab Modal Hijab & Under-Cap - Shot ${idx - 48}`;
        category = 'Caps & Hijabs';
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

    // 2. 34 New Product Photographs
    NEW_PRODUCT_PHOTOS.malaysianHijabs.forEach((url, idx) => {
      list.push({
        id: `malaysian-${idx + 1}`,
        url,
        title: `Malaysian Hijabs - Shot ${idx + 1}`,
        category: 'Hijabs',
        productSlug: 'malaysian-hijabs',
        productName: 'Malaysian Hijabs',
      });
    });

    NEW_PRODUCT_PHOTOS.luxeJerseyVeil.forEach((url, idx) => {
      list.push({
        id: `luxe-veil-${idx + 1}`,
        url,
        title: `Luxe Jersey Veil - Shot ${idx + 1}`,
        category: 'Veils',
        productSlug: 'luxe-jersey-veil',
        productName: 'Luxe Jersey Veil',
      });
    });

    NEW_PRODUCT_PHOTOS.khadeejahHijab.forEach((url, idx) => {
      list.push({
        id: `khadeejah-${idx + 1}`,
        url,
        title: `Khadeejah Hijab - Shot ${idx + 1}`,
        category: 'Hijabs',
        productSlug: 'khadeejah-hijab',
        productName: 'Khadeejah Hijab',
      });
    });

    NEW_PRODUCT_PHOTOS.aishaLuxeAllWhite.forEach((url, idx) => {
      list.push({
        id: `aisha-${idx + 1}`,
        url,
        title: `Aisha Luxe All-White - Shot ${idx + 1}`,
        category: 'Hijabs',
        productSlug: 'aisha-luxe-all-white',
        productName: 'Aisha Luxe All-White',
      });
    });

    NEW_PRODUCT_PHOTOS.jacquardJerseyLaserCutHijab.forEach((url, idx) => {
      list.push({
        id: `jacquard-${idx + 1}`,
        url,
        title: `Jacquard Laser-Cut - Shot ${idx + 1}`,
        category: 'Hijabs',
        productSlug: 'jacquard-jersey-laser-cut-hijab',
        productName: 'Jacquard Jersey Laser-Cut Hijab',
      });
    });

    return list;
  }, []);

  const filteredMedia = useMemo(() => {
    return mediaList.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
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
      setUploadSuccess(`Image uploaded successfully! URL: ${uploadedUrl.slice(0, 40)}...`);
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
  };

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    const priceNum = parseFloat(newPriceInput);
    if (isNaN(priceNum) || priceNum < 0) return;

    setSavingPrice(true);
    try {
      await saveProduct({
        ...quickPriceProduct.product,
        base_price: priceNum,
      });
      setQuickPriceSuccess(true);
      await loadProducts();
      setTimeout(() => {
        setQuickPriceProduct(null);
        setQuickPriceSuccess(false);
      }, 900);
    } catch (err) {
      console.error('Failed to update price:', err);
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
              CDN &amp; Storage Management
            </span>
          </div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight">
            Media &amp; Storage Manager
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light max-w-2xl leading-relaxed">
            Manage your high-resolution garment photographs, view connected products, edit prices directly, and upload new boutique assets.
          </p>
        </div>

        {/* Upload Trigger */}
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

      {/* Storage Health & Optimization Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold font-serif text-lg">
              88
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-950">Active Photographs</p>
              <p className="text-[11px] text-stone-600 mt-0.5">54 editorial photoshoot + 34 new product batch</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-950">CDN Acceleration</p>
              <p className="text-[11px] text-stone-600 mt-0.5">High-speed global image delivery via ImageBB &amp; SSL</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-stone-200 text-stone-800 flex items-center justify-center font-bold">
              <HardDrive size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-900">Auto Compression</p>
              <p className="text-[11px] text-stone-600 mt-0.5">Canvas 82% quality WebP/JPEG keeps storage light</p>
            </div>
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded flex items-center gap-2">
          <Check size={16} className="text-emerald-700" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded flex items-center gap-2">
          <X size={16} className="text-red-700" />
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
          {['all', 'Occasion Wear', 'Abayas', 'Khimars', 'Prayer Wear', 'Hijabs', 'Veils', 'Caps & Hijabs'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap ${
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
              {/* Image Frame */}
              <div className="aspect-[3/4] bg-stone-100 relative overflow-hidden">
                <img
                  src={item.url}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />

                {/* Category Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-stone-900/80 text-white rounded-xs">
                    {item.category}
                  </span>
                </div>

                {/* Live Price Tag on image if product matched */}
                {matchedProduct?.base_price && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-emerald-900/90 text-white rounded-xs shadow-sm">
                      ₦{matchedProduct.base_price.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Overlay actions */}
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

              {/* Card Meta & Dedicated Edit Action */}
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
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                      {item.productName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  {/* Copy URL */}
                  <button
                    type="button"
                    onClick={() => copyUrl(item.id, item.url)}
                    className={`w-full py-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors ${
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

                  {/* Primary Edit Button for Owner */}
                  {matchedProduct ? (
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/admin/products/edit/${matchedProduct.id}`}
                        className="flex-1 py-1 px-1.5 bg-emerald-900 hover:bg-emerald-800 text-white text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors text-center shadow-2xs"
                        title="Edit garment pricing and details"
                      >
                        <Edit2 size={10} />
                        <span>Edit Price</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => openQuickPrice(matchedProduct, item.title)}
                        className="py-1 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold uppercase tracking-wider rounded-xs transition-colors"
                        title="Quick edit price without leaving this screen"
                      >
                        ⚡
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/admin/products/add"
                      className="w-full py-1 px-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors text-center"
                      title="Create garment listing for this photograph"
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
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-900">{quickPriceProduct.product.name}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Asset: {quickPriceProduct.itemTitle}</p>
            </div>

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
                    step="500"
                    required
                    value={newPriceInput}
                    onChange={e => setNewPriceInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                    placeholder="e.g. 130000"
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
                  className="w-1/2 py-2 border border-stone-300 text-xs font-semibold rounded hover:bg-stone-50 text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="w-1/2 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded transition-colors shadow-xs"
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
          <div className="relative max-w-3xl max-h-[90vh] bg-stone-900 p-2 rounded-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-stone-900 rounded-full hover:bg-stone-200 shadow-lg"
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
