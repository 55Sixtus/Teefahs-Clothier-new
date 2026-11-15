import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Camera,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { saveProduct, getAllCategories, uploadProductImage, generateValidUuid } from '../lib/api';
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
  'Champagne Gold',
];

interface VariationDraft {
  id: string;
  sku: string;
  size: string;
  colour: string;
  stock_quantity: number;
}

const makeVarKey = (size: string, colour: string) => `${size}:::${colour}`;

export default function AddProductPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetIdx, setReplaceTargetIdx] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdProduct, setCreatedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    slug?: string;
  } | null>(null);

  // 1. Core Simple Product Details
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // 2. Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 3. Sizing, Colours & Per-Variation Stock
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['54', '56']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedColours, setSelectedColours] = useState<string[]>(['Midnight Black']);
  const [customColourInput, setCustomColourInput] = useState('');
  const [bulkStockInput, setBulkStockInput] = useState<string>('10');
  const [variationMap, setVariationMap] = useState<Record<string, VariationDraft>>({});

  // 4. Publishing
  const [isPublished, setIsPublished] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    getAllCategories()
      .then(cats => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      })
      .catch(err => {
        setErrorMsg(err?.message || 'Could not load categories.');
      });
  }, []);

  // Auto-sync slug unless owner edited slug manually
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  }, [name, slugManuallyEdited]);

  // Keep variationMap synchronized with selectedSizes × selectedColours
  useEffect(() => {
    const activeSizes = selectedSizes.length > 0 ? selectedSizes : ['Standard'];
    const activeColours = selectedColours.length > 0 ? selectedColours : ['Original'];
    const defaultQty = Math.max(0, parseInt(bulkStockInput, 10) || 0);

    setVariationMap(prev => {
      const next: Record<string, VariationDraft> = {};
      for (const sz of activeSizes) {
        for (const clr of activeColours) {
          const key = makeVarKey(sz, clr);
          if (prev[key]) {
            next[key] = prev[key];
          } else {
            next[key] = {
              id: generateValidUuid(),
              sku: `TC-${(slug || name || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${sz.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
              size: sz,
              colour: clr,
              stock_quantity: defaultQty,
            };
          }
        }
      }
      return next;
    });
  }, [selectedSizes, selectedColours]);

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
      setErrorMsg(err.message || 'Image upload could not be completed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = replaceTargetIdx;
    e.target.value = '';
    setReplaceTargetIdx(null);

    if (!file || idx === null) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const uploadedUrl = await uploadProductImage(file);
      setPhotos(prev => prev.map((url, i) => (i === idx ? uploadedUrl : url)));
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not replace photograph.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (mainPhotoIndex === index) {
      setMainPhotoIndex(0);
    } else if (mainPhotoIndex > index) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    setPhotos(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });

    if (mainPhotoIndex === index) {
      setMainPhotoIndex(targetIndex);
    } else if (mainPhotoIndex === targetIndex) {
      setMainPhotoIndex(index);
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

  const updateVariationStock = (key: string, qty: number) => {
    const valid = Math.max(0, Math.round(qty) || 0);
    setVariationMap(prev => {
      const target = prev[key];
      if (!target) return prev;
      return {
        ...prev,
        [key]: { ...target, stock_quantity: valid },
      };
    });
  };

  const updateVariationSku = (key: string, nextSku: string) => {
    setVariationMap(prev => {
      const target = prev[key];
      if (!target) return prev;
      return {
        ...prev,
        [key]: { ...target, sku: nextSku },
      };
    });
  };

  const applyBulkStockToAll = () => {
    const qty = Math.max(0, parseInt(bulkStockInput, 10) || 0);
    setVariationMap(prev => {
      const next: Record<string, VariationDraft> = {};
      for (const [key, v] of Object.entries(prev)) {
        next[key] = { ...v, stock_quantity: qty };
      }
      return next;
    });
  };

  const variationList = Object.values(variationMap);
  const totalUnitsInStock = variationList.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Please enter a product name.');
      return;
    }

    const cleanedPrice = price.toString().replace(/,/g, '').trim();
    const parsedPrice = parseFloat(cleanedPrice);
    if (!cleanedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid selling price in Naira (₦), e.g. 1500 or 229500.');
      return;
    }

    const cleanedSale = salePrice.toString().replace(/,/g, '').trim();
    const parsedSalePrice = cleanedSale ? parseFloat(cleanedSale) : undefined;
    if (cleanedSale && (isNaN(parsedSalePrice!) || parsedSalePrice! < 0)) {
      setErrorMsg('Please enter a valid optional original strike-through price.');
      return;
    }

    if (photos.length === 0) {
      setErrorMsg('Please upload at least one product photo or pick one from the studio collection.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const finalSlug =
        (slug.trim() || name)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/(^-|-$)/g, '') || generateValidUuid();

      const primaryImage = photos[mainPhotoIndex] || photos[0];
      const additionalImages = photos.filter((_, idx) => idx !== mainPhotoIndex);

      const variations = variationList.map((v, idx) => ({
        id: v.id || generateValidUuid(),
        product_id: '',
        sku:
          v.sku.trim() ||
          `TC-${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${idx + 1}`,
        size: v.size,
        colour: v.colour,
        price_adjustment: 0,
        stock_quantity: Math.max(0, Math.round(Number(v.stock_quantity) || 0)),
        is_active: true,
      }));

      const saved = await saveProduct({
        name: name.trim(),
        slug: finalSlug,
        short_description: description.trim().slice(0, 160),
        description: description.trim(),
        category_id: categoryId,
        base_price: parsedPrice,
        sale_price: parsedSalePrice,
        currency: 'NGN',
        main_image_url: primaryImage,
        additionalImages,
        images: [primaryImage, ...additionalImages].map((url, idx) => ({
          id: generateValidUuid(),
          image_url: url,
          alt_text: `${name.trim()} photograph ${idx + 1}`,
        })),
        is_published: isPublished,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        variations,
      });

      setCreatedProduct({
        id: saved.id,
        name: saved.name,
        price: saved.base_price || parsedPrice,
        imageUrl: saved.main_image_url,
        slug: saved.slug,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not save the product. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-16">
      {/* Hidden input for replacing a single photo slot */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplacePhoto}
        className="hidden"
      />

      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/products"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Back to Products
        </Link>
        <Link to="/" className="text-xs text-emerald-800 hover:text-emerald-950 font-medium">
          Visit Storefront &rarr;
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-serif text-stone-900">Add New Garment</h1>
        <p className="text-xs text-stone-500 mt-1">
          Fill in the fields below to create and save a new garment directly to Supabase.
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Garment Details */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Zahra Luxury French Khimar & Skirt Set"
                className="w-full p-3 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                URL Slug (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="auto-generated-from-name"
                className="w-full p-3 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>
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
                  type="text"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 1500 or 229500"
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-mono font-semibold"
                />
              </div>

              <div className="mt-2">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
                  Quick Select Price:
                </p>
                <div className="flex flex-wrap gap-1">
                  {['1500', '15000', '35000', '68000', '85000', '130000', '229500'].map(pVal => (
                    <button
                      key={pVal}
                      type="button"
                      onClick={() => setPrice(pVal)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-xs border transition-colors cursor-pointer ${
                        price === pVal
                          ? 'bg-emerald-900 text-white border-emerald-950 font-bold'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                      }`}
                    >
                      ₦{parseInt(pVal, 10).toLocaleString()}
                    </button>
                  ))}
                </div>
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
                  type="text"
                  inputMode="decimal"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 255000"
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-mono"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Leave empty if no strike-through original price is needed. If higher than selling price, non-accessory garments display the discount savings automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Choose Category *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categories.map(cat => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-900 text-white shadow-xs ring-2 ring-emerald-950/20'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} className="text-amber-300" />}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-medium text-stone-800"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}{cat.is_active ? '' : ' (Hidden)'}
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
              placeholder="Describe the fabric (e.g. lightweight Zoom fabric, double-georgette, crepe), cut, modesty coverage, matching scarf, and special care details..."
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
                Snap a new photo with your smartphone camera, upload from your photo gallery, or pick from the official studio photographs.
              </p>
            </div>
            {photos.length > 0 && (
              <span className="text-xs text-emerald-800 font-medium">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'} added
              </span>
            )}
          </div>

          {/* Hidden Direct File and Camera Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Mobile-Friendly Upload Buttons Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              <Camera size={16} className="text-amber-300" />
              <span>Take Phone Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-stone-900 hover:bg-stone-800 text-white rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              <Upload size={16} />
              <span>Choose from Photos</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGalleryPicker(!showGalleryPicker)}
              className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ImageIcon size={16} className="text-emerald-800" />
              <span>{ASSETS.productImages.length} Studio Photos</span>
            </button>
          </div>

          {/* Drag & Drop Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-sm p-5 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-emerald-700 bg-emerald-50/50'
                : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto text-stone-400 mb-1.5" />
            <p className="text-xs font-semibold text-stone-800">
              Drag and drop garment images here
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              High resolution phone photos are automatically optimized and uploaded to Supabase Storage.
            </p>
          </div>

          {uploading && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
              <span>Optimizing and uploading photo...</span>
            </div>
          )}

          {/* Quick Select from Official Studio Photographs */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowGalleryPicker(!showGalleryPicker)}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon size={14} />
              <span>
                {showGalleryPicker
                  ? 'Hide studio collection'
                  : `Choose from ${ASSETS.productImages.length} official studio photographs`}
              </span>
              {showGalleryPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showGalleryPicker && (
              <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-sm">
                <p className="text-[11px] text-stone-600 mb-3">
                  Click any photo below to add it to this product:
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
                        className={`aspect-[3/4] relative rounded-xs overflow-hidden border-2 transition-all group cursor-pointer ${
                          isSelected
                            ? 'border-emerald-700 ring-2 ring-emerald-400'
                            : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
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

          {/* Photo Previews with Main Photo, Replace, Reorder, & Remove */}
          {photos.length > 0 && (
            <div className="pt-3 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-800 mb-2">
                Selected Photos (Click 'Set as Main' to choose front cover):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((url, idx) => {
                  const isMain = idx === mainPhotoIndex;
                  return (
                    <div
                      key={`${url}-${idx}`}
                      className={`relative bg-stone-100 border rounded-sm overflow-hidden p-1.5 transition-all space-y-1.5 ${
                        isMain ? 'border-emerald-700 ring-2 ring-emerald-300' : 'border-stone-200'
                      }`}
                    >
                      <div className="aspect-[3/4] overflow-hidden rounded-xs bg-stone-200 relative">
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
                            className="text-stone-700 hover:text-emerald-800 font-semibold cursor-pointer"
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
                          className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-200/70">
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTargetIdx(idx);
                            replaceInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-700 hover:text-emerald-900 bg-white border border-stone-300 px-1.5 py-0.5 rounded-xs cursor-pointer"
                          title="Replace this photograph"
                        >
                          <RefreshCw size={10} />
                          <span>Replace</span>
                        </button>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePhoto(idx, -1)}
                            className="p-0.5 text-stone-600 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                            title="Move left"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === photos.length - 1}
                            onClick={() => movePhoto(idx, 1)}
                            className="p-0.5 text-stone-600 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                            title="Move right"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Sizing, Colours & Per-Variation Stock */}
        <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
              3. Sizes, Colours &amp; Stock Control
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              Total Stock: {totalUnitsInStock} {totalUnitsInStock === 1 ? 'unit' : 'units'}
            </span>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Available Sizes (Tap to select or unselect):
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.from(new Set([...PRESET_SIZES, ...selectedSizes])).map(sz => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all cursor-pointer ${
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

            <div className="flex items-center gap-2 max-w-xs mt-2">
              <input
                type="text"
                value={customSizeInput}
                onChange={e => setCustomSizeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSize();
                  }
                }}
                placeholder="Add other size (e.g. 50, Plus Size)"
                className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomSize}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 rounded-sm cursor-pointer"
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
              {Array.from(new Set([...PRESET_COLOURS, ...selectedColours])).map(col => {
                const isSelected = selectedColours.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleColour(col)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all cursor-pointer ${
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

            <div className="flex items-center gap-2 max-w-xs mt-2">
              <input
                type="text"
                value={customColourInput}
                onChange={e => setCustomColourInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomColour();
                  }
                }}
                placeholder="Add other colour (e.g. Lavender, Plum)"
                className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomColour}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 rounded-sm cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Per-Variation Stock Matrix */}
          <div className="pt-3 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Per-Variation Stock ({variationList.length}{' '}
                  {variationList.length === 1 ? 'combination' : 'combinations'})
                </label>
                <p className="text-[11px] text-stone-500">
                  Set stock quantities individually per size and colour (0 is allowed for out-of-stock variants).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={bulkStockInput}
                  onChange={e => setBulkStockInput(e.target.value)}
                  className="w-20 p-1.5 text-xs font-mono text-center bg-stone-50 border border-stone-300 rounded-sm focus:outline-none"
                  aria-label="Bulk stock quantity"
                />
                <button
                  type="button"
                  onClick={applyBulkStockToAll}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold border border-stone-300 rounded-sm cursor-pointer whitespace-nowrap"
                >
                  Apply Stock to All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3 font-semibold">Size</th>
                    <th className="py-2 px-3 font-semibold">Colour</th>
                    <th className="py-2 px-3 font-semibold">SKU</th>
                    <th className="py-2 px-3 font-semibold text-right">Stock Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {variationList.map(v => {
                    const key = makeVarKey(v.size, v.colour);
                    return (
                      <tr key={key} className="hover:bg-stone-50/70">
                        <td className="py-2 px-3 font-semibold text-stone-900">{v.size}</td>
                        <td className="py-2 px-3 text-stone-700">{v.colour}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={e => updateVariationSku(key, e.target.value)}
                            className="w-full min-w-[120px] p-1 text-[11px] font-mono bg-stone-50 border border-stone-200 rounded focus:outline-none focus:border-stone-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={v.stock_quantity}
                            onChange={e => updateVariationStock(key, parseInt(e.target.value, 10))}
                            className="w-20 p-1 text-center font-mono font-semibold text-xs bg-stone-50 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                  Item will appear live on the Shop All page.
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
            disabled={loading}
            className="flex-1 sm:flex-none px-8 py-3.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving Garment...' : 'Save & Publish Product'}
          </button>
          <Link
            to="/admin/products"
            className="px-6 py-3.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-widest font-medium hover:bg-stone-50 transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Success Modal */}
      {createdProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 text-center space-y-5 shadow-2xl border border-stone-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-900 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Saved to Supabase
              </span>
              <h2 className="text-xl font-serif text-stone-900 mt-2">Garment Successfully Saved!</h2>
              <p className="text-xs text-stone-600 mt-1">
                Your new piece has been persisted in Supabase and synced across the catalogue.
              </p>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-stone-50 border border-stone-200 rounded text-left">
              {createdProduct.imageUrl ? (
                <img
                  src={createdProduct.imageUrl}
                  alt={createdProduct.name}
                  className="w-14 h-18 object-cover rounded-xs border border-stone-200 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-18 bg-stone-200 rounded-xs flex items-center justify-center text-stone-400 text-xs">
                  Garment
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-sm truncate">{createdProduct.name}</p>
                <p className="text-sm font-mono font-bold text-emerald-900 mt-0.5">
                  ₦{createdProduct.price.toLocaleString()}
                </p>
                <span className="text-[10px] text-stone-500 block mt-1">Ready for Customer Orders &amp; WhatsApp</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                to={`/product/${createdProduct.slug || createdProduct.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>View on Live Storefront</span>
                <ExternalLink size={14} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setCreatedProduct(null);
                  setName('');
                  setSlug('');
                  setSlugManuallyEdited(false);
                  setPrice('');
                  setSalePrice('');
                  setDescription('');
                  setPhotos([]);
                  setMainPhotoIndex(0);
                }}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Upload Another Garment</span>
              </button>

              <Link
                to="/admin/products"
                className="w-full py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-xs block transition-colors text-center"
              >
                Go to All Garments
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
