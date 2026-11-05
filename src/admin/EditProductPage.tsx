import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  Star, 
  Trash2, 
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getProductById, saveProduct, archiveProduct, getActiveCategories, uploadProductImage, generateValidUuid } from '../lib/api';
import { Category } from '../types/product';
import { ASSETS } from '../data/assets';

const PRESET_SIZES = ['52', '54', '56', '58', '60', 'Free Size', 'S', 'M', 'L', 'XL'];
const PRESET_COLOURS = [
  'Midnight Black', 
  'Navy Blue', 
  'Olive Green', 
  'Dusty Rose', 
  'Chocolate Brown', 
  'Crisp White', 
  'Sage Green', 
  'Champagne Gold'
];

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingVariations, setExistingVariations] = useState<any[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

  // 1. Core Simple Product Details
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // 2. Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 3. Sizing & Colours
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [customColourInput, setCustomColourInput] = useState('');
  const [stockAvailable, setStockAvailable] = useState<number>(10);

  // 4. Publishing
  const [isPublished, setIsPublished] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const [cats, prod] = await Promise.all([
          getActiveCategories(),
          getProductById(id),
        ]);
        setCategories(cats);

        if (prod) {
          setName(prod.name);
          setSlug(prod.slug || '');
          setCategoryId(prod.category_id || (cats[0]?.id || ''));
          setPrice(prod.base_price?.toString() || '');
          setSalePrice(prod.sale_price !== undefined && prod.sale_price !== null ? prod.sale_price.toString() : '');
          setDescription(prod.description || prod.short_description || '');
          setIsPublished(prod.is_published ?? true);
          setIsFeatured(prod.is_featured ?? false);
          setIsNewArrival(prod.is_new_arrival ?? false);
          setExistingVariations(prod.variations || []);
          setExistingImages(prod.images || []);

          // Build photo list
          const photoList: string[] = [];
          if (prod.main_image_url) {
            photoList.push(prod.main_image_url);
          }
          if (prod.images) {
            for (const img of prod.images) {
              const url = typeof img === 'string' ? img : img.image_url;
              if (url && !photoList.includes(url)) {
                photoList.push(url);
              }
            }
          }
          if (photoList.length === 0) {
            photoList.push(ASSETS.productImages[0]);
          }
          setPhotos(photoList);
          setMainPhotoIndex(0);

          // Extract sizes and colours from variations
          if (prod.variations && prod.variations.length > 0) {
            const rawSizes = Array.from(new Set(prod.variations.map(v => v.size).filter(Boolean))) as string[];
            const rawColours = Array.from(new Set(prod.variations.map(v => v.colour).filter(Boolean))) as string[];
            const totalStock = prod.variations.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

            setSelectedSizes(rawSizes.length > 0 ? rawSizes : ['54', '56']);
            setSelectedColours(rawColours.length > 0 ? rawColours : ['Midnight Black']);
            setStockAvailable(totalStock > 0 ? totalStock : 10);
          } else {
            setSelectedSizes(['54', '56']);
            setSelectedColours(['Midnight Black']);
            setStockAvailable(10);
          }
        } else {
          setErrorMsg('Product could not be found.');
        }
      } catch (err: any) {
        console.error('Error loading product:', err);
        setErrorMsg('Error loading product details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMsg('');

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const uploadedUrl = await uploadProductImage(file);
        newUrls.push(uploadedUrl);
      }

      if (newUrls.length > 0) {
        setPhotos(prev => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (mainPhotoIndex >= index && mainPhotoIndex > 0) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const addCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes(prev => [...prev, trimmed]);
      setCustomSizeInput('');
    }
  };

  const toggleColour = (col: string) => {
    setSelectedColours(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const addCustomColour = () => {
    const trimmed = customColourInput.trim();
    if (trimmed && !selectedColours.includes(trimmed)) {
      setSelectedColours(prev => [...prev, trimmed]);
      setCustomColourInput('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!name.trim()) {
      setErrorMsg('Please enter a product name.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid selling price in Naira (₦).');
      return;
    }

    if (photos.length === 0) {
      setErrorMsg('Please keep or upload at least one product photo.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const primaryImage = photos[mainPhotoIndex] || photos[0];
      const additionalImages = photos.filter((_, idx) => idx !== mainPhotoIndex);

      const activeSizes = selectedSizes.length > 0 ? selectedSizes : ['Standard'];
      const activeColours = selectedColours.length > 0 ? selectedColours : ['Original'];

      const variations: Array<{
        id: string;
        product_id: string;
        sku?: string;
        size: string;
        colour: string;
        price_adjustment: number;
        stock_quantity: number;
        is_active: boolean;
      }> = [];

      for (const sz of activeSizes) {
        for (const clr of activeColours) {
          const match = existingVariations.find(v => v.size === sz && v.colour === clr);
          variations.push({
            id: match?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)
              ? match.id
              : generateValidUuid(),
            product_id: id,
            sku: match?.sku || `TC-${(slug || name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${sz.toUpperCase()}`,
            size: sz,
            colour: clr,
            price_adjustment: match?.price_adjustment || 0,
            stock_quantity: match?.stock_quantity !== undefined 
              ? match.stock_quantity 
              : Math.max(1, Math.round(stockAvailable / (activeSizes.length * activeColours.length))),
            is_active: true,
          });
        }
      }

      const formattedImages = additionalImages.map((url, idx) => {
        const match = existingImages.find(img => (typeof img === 'string' ? img : img.image_url) === url);
        return {
          id: match?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)
            ? match.id
            : generateValidUuid(),
          image_url: url,
          alt_text: `${name} photograph ${idx + 1}`,
        };
      });

      await saveProduct({
        id,
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        short_description: description.trim().slice(0, 160),
        description: description.trim(),
        category_id: categoryId,
        base_price: parsedPrice,
        sale_price: salePrice ? parseFloat(salePrice) : undefined,
        currency: 'NGN',
        main_image_url: primaryImage,
        additionalImages,
        images: formattedImages,
        is_published: isPublished,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        variations,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: id } }));
      }

      setSuccessMsg('Product details successfully updated!');
      setTimeout(() => {
        navigate('/admin/products');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not update the product.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setShowDeleteConfirm(false);

    try {
      await archiveProduct(id, 'Queen Lateefah');
      navigate('/admin/products', {
        state: {
          archivedProductName: name,
          archivedProductId: id,
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to move product to Recently Deleted.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full mb-3" />
        <p className="text-xs uppercase tracking-wider text-stone-500 font-medium">Loading Garment Details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl pb-16">
      {/* Back button & Delete */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/products"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Back to Products
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium px-3 py-1.5 border border-red-200 hover:border-red-400 rounded-sm transition-colors"
        >
          <Trash2 size={13} />
          <span>{deleting ? 'Deleting...' : 'Delete Garment'}</span>
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-serif text-stone-900">Edit Garment: {name}</h1>
        <p className="text-xs text-stone-500 mt-1">
          Update prices, photos, sizes, colours, or stock. Changes are reflected on the storefront immediately.
        </p>
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-start gap-2.5">
          <Save size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Garment Details */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            1. Basic Information
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Selling Price (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                  ₦
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Original Price (Optional Strike-through)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Choose Category *
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-medium text-stone-800"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Product Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2: Upload Product Photo */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                2. Upload Product Photo *
              </h2>
              <p className="text-[11px] text-stone-500 font-light mt-0.5">
                Upload new photos or choose from the 54 supplied photoshoot photos.
              </p>
            </div>
            {photos.length > 0 && (
              <span className="text-xs text-emerald-800 font-medium">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'} attached
              </span>
            )}
          </div>

          {/* Upload Button & Drop zone */}
          <div className="border-2 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50/50 rounded-sm p-6 text-center cursor-pointer">
            <input
              type="file"
              id="edit-file-upload"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <label htmlFor="edit-file-upload" className="cursor-pointer block">
              <Upload size={28} className="mx-auto text-stone-400 mb-2" />
              <p className="text-xs font-semibold text-stone-800">
                Click here to add new photos from your device
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                PNG, JPG or WEBP supported.
              </p>
            </label>
          </div>

          {uploading && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
              <span>Optimizing and uploading photo...</span>
            </div>
          )}

          {/* Quick Select from 54 supplied photoshoot photos */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowGalleryPicker(!showGalleryPicker)}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1.5"
            >
              <ImageIcon size={14} />
              <span>
                {showGalleryPicker ? 'Hide photoshoot collection' : `Choose from 54 official photoshoot photographs`}
              </span>
              {showGalleryPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showGalleryPicker && (
              <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-sm">
                <p className="text-[11px] text-stone-600 mb-3">
                  Click any photo below to add it to this garment:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                  {ASSETS.productImages.map((imgUrl, i) => {
                    const isSelected = photos.includes(imgUrl);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            const idx = photos.indexOf(imgUrl);
                            removePhoto(idx);
                          } else {
                            setPhotos(prev => [...prev, imgUrl]);
                          }
                        }}
                        className={`aspect-[3/4] relative rounded-xs overflow-hidden border-2 transition-all ${
                          isSelected ? 'border-emerald-700 ring-2 ring-emerald-400' : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Asset ${i + 1}`} className="w-full h-full object-cover object-top" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Photo Previews with "Main Photo" Selector & Remove */}
          {photos.length > 0 && (
            <div className="pt-3 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-800 mb-2">
                Attached Photos (Click 'Set as Main' to choose front cover):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((url, idx) => {
                  const isMain = idx === mainPhotoIndex;
                  return (
                    <div
                      key={idx}
                      className={`relative bg-stone-100 border rounded-sm overflow-hidden p-1.5 transition-all ${
                        isMain ? 'border-emerald-700 ring-2 ring-emerald-300' : 'border-stone-200'
                      }`}
                    >
                      <div className="aspect-[3/4] overflow-hidden rounded-xs bg-stone-200 relative mb-1.5">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover object-top" />
                        {isMain && (
                          <span className="absolute top-1.5 left-1.5 bg-emerald-800 text-white text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-xs shadow-xs">
                            Main Photo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => setMainPhotoIndex(idx)}
                            className="text-stone-700 hover:text-emerald-800 font-semibold"
                          >
                            Set as Main
                          </button>
                        ) : (
                          <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <Star size={11} fill="currentColor" /> Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="text-red-600 hover:text-red-800 p-0.5"
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Sizing, Colours & Stock */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-5">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            3. Available Sizes &amp; Colours
          </h2>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Available Sizes (Tap to select or unselect):
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_SIZES.map(sz => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {sz} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Custom Size Adder */}
            <div className="flex items-center gap-2 max-w-xs mt-2">
              <input
                type="text"
                value={customSizeInput}
                onChange={e => setCustomSizeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                placeholder="Add other size (e.g. 50, Plus Size)"
                className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomSize}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 rounded-sm"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Colours */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Available Colours (Tap to select or unselect):
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLOURS.map(col => {
                const isSelected = selectedColours.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleColour(col)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all ${
                      isSelected
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {col} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Custom Colour Adder */}
            <div className="flex items-center gap-2 max-w-xs mt-2">
              <input
                type="text"
                value={customColourInput}
                onChange={e => setCustomColourInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColour(); } }}
                placeholder="Add other colour (e.g. Lavender, Plum)"
                className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomColour}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 rounded-sm"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Stock Available */}
          <div className="pt-2 border-t border-stone-100 max-w-xs">
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Stock Available (Units)
            </label>
            <input
              type="number"
              min="0"
              value={stockAvailable}
              onChange={e => setStockAvailable(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:outline-none focus:border-stone-900"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Total quantity in stock ready for shipping.
            </p>
          </div>
        </div>

        {/* Section 4: Publishing & Display Options */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-3">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            4. Publishing Options
          </h2>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-emerald-800 rounded focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">
                  Make available to customers immediately
                </span>
                <span className="text-[11px] text-stone-500">
                  Item appears live on the Shop All page.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={e => setIsNewArrival(e.target.checked)}
                className="w-4 h-4 text-emerald-800 rounded focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">
                  Show in "New Arrivals" section
                </span>
                <span className="text-[11px] text-stone-500">
                  Feature in the new season spotlight.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-emerald-800 rounded focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold text-stone-900 block">
                  Feature on the Homepage
                </span>
                <span className="text-[11px] text-stone-500">
                  Showcase in the Signature Collection banner on the home page.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none px-8 py-3.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save & Update Garment'}
          </button>
          <Link
            to="/admin/products"
            className="px-6 py-3.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-widest font-medium hover:bg-stone-50 transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="text-center">
              <h3 className="font-serif text-lg text-stone-900">Move to Recently Deleted?</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Garment <strong>"{name}"</strong> will be removed from the public storefront. You can restore it anytime with all its photos, variations, and prices intact from the <strong>Recently Deleted</strong> tab.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-red-700 transition-colors shadow-xs"
              >
                {deleting ? 'Moving...' : 'Move to Deleted'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
