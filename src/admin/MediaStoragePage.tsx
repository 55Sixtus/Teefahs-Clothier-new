import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Image as ImageIcon, 
  Upload, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  Zap,
  HardDrive,
  Info,
  Maximize2,
  X,
  Edit2
} from 'lucide-react';
import { SUPPLIED_PHOTOS, NEW_PRODUCT_PHOTOS } from '../data/assets';
import { uploadProductImage } from '../lib/api';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  category: string;
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

  // Build the complete boutique media registry
  const mediaList: MediaItem[] = useMemo(() => {
    const list: MediaItem[] = [];

    // 1. 54 Editorial Photoshoot Photographs
    SUPPLIED_PHOTOS.forEach((url, idx) => {
      list.push({
        id: `editorial-${idx + 1}`,
        url,
        title: `Editorial Photoshoot #${idx + 1}`,
        category: 'Editorial Studio',
        productName: idx < 10 ? 'Noor Abaya' : idx < 16 ? 'Ameera Abaya' : idx < 21 ? 'Zahra Khimar' : 'Boutique Collection',
      });
    });

    // 2. 34 New Product Photographs
    NEW_PRODUCT_PHOTOS.malaysianHijabs.forEach((url, idx) => {
      list.push({
        id: `malaysian-${idx + 1}`,
        url,
        title: `Malaysian Hijabs - Shot ${idx + 1}`,
        category: 'Hijabs',
        productName: 'Malaysian Hijabs (XL)',
      });
    });

    NEW_PRODUCT_PHOTOS.luxeJerseyVeil.forEach((url, idx) => {
      list.push({
        id: `luxe-veil-${idx + 1}`,
        url,
        title: `Luxe Jersey Veil - Shot ${idx + 1}`,
        category: 'Veils',
        productName: 'Luxe Jersey Veil (Medium)',
      });
    });

    NEW_PRODUCT_PHOTOS.khadeejahHijab.forEach((url, idx) => {
      list.push({
        id: `khadeejah-${idx + 1}`,
        url,
        title: `Khadeejah Hijab - Shot ${idx + 1}`,
        category: 'Hijabs',
        productName: 'Khadeejah Hijab (4XL)',
      });
    });

    NEW_PRODUCT_PHOTOS.aishaLuxeAllWhite.forEach((url, idx) => {
      list.push({
        id: `aisha-${idx + 1}`,
        url,
        title: `Aisha Luxe All-White - Shot ${idx + 1}`,
        category: 'Hijabs',
        productName: 'Aisha Luxe All-White (4XL)',
      });
    });

    NEW_PRODUCT_PHOTOS.jacquardJerseyLaserCutHijab.forEach((url, idx) => {
      list.push({
        id: `jacquard-${idx + 1}`,
        url,
        title: `Jacquard Laser-Cut - Shot ${idx + 1}`,
        category: 'Hijabs',
        productName: 'Jacquard Jersey Laser-Cut Hijab (XL, 2XL)',
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
      setUploadSuccess(`Image uploaded successfully and optimized! URL: ${uploadedUrl.slice(0, 40)}...`);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
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
              CDN & Storage Management
            </span>
          </div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight">
            Media & Storage Manager
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light max-w-2xl leading-relaxed">
            Manage your high-resolution garment photographs, inspect CDN delivery status, and upload compressed assets.
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
              <p className="text-[11px] text-stone-600 mt-0.5">High-speed global image delivery via ImageBB & SSL</p>
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
          <Info size={16} className="text-red-700" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-stone-200 rounded-sm shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search photographs..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'Editorial Studio', 'Hijabs', 'Veils'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat === 'all' ? 'All Images' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMedia.map(item => (
          <div
            key={item.id}
            className="group bg-white border border-stone-200 rounded-sm overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="aspect-[3/4] bg-stone-100 relative overflow-hidden">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
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

            <div className="p-2.5">
              <p className="text-[11px] font-semibold text-stone-900 truncate" title={item.title}>
                {item.title}
              </p>
              {item.productName && (
                <p className="text-[10px] text-stone-500 truncate mt-0.5">
                  {item.productName}
                </p>
              )}
              <button
                type="button"
                onClick={() => copyUrl(item.id, item.url)}
                className={`mt-2 w-full py-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors ${
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
              <Link
                to="/admin/products"
                className="mt-1.5 w-full py-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 transition-colors text-center"
                title="Edit product pricing and details"
              >
                <Edit2 size={10} />
                <span>Edit Price</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

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
