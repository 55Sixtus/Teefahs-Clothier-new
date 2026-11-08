import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  Star, 
  Sparkle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { saveProduct, getActiveCategories, uploadProductImage, generateValidUuid } from '../lib/api';
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

export default function AddProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Core Simple Product Details
  const [name, setName] = useState('');
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
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['54', '56']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedColours, setSelectedColours] = useState<string[]>(['Midnight Black']);
  const [customColourInput, setCustomColourInput] = useState('');
  const [stockAvailable, setStockAvailable] = useState<number>(10);

  // 4. Publishing
  const [isPublished, setIsPublished] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    getActiveCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  // Handle file uploads (click or drag-and-drop)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Please enter a product name.');
      return;
    }

    const cleanedPrice = price.toString().replace(/,/g, '').trim();
    const parsedPrice = parseFloat(cleanedPrice);
    if (!cleanedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid selling price in Naira (₦), e.g. 700 or 1500.');
      return;
    }

    if (photos.length === 0) {
      setErrorMsg('Please upload at least one product photo or pick one from the photoshoot collection.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Auto generate slug
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const primaryImage = photos[mainPhotoIndex] || photos[0];
      const additionalImages = photos.filter((_, idx) => idx !== mainPhotoIndex);

      // Construct variations automatically from chosen sizes and colours using valid UUIDs
      const variations: Array<{
        id: string;
        product_id: string;
        size: string;
        colour: string;
        price_adjustment: number;
        stock_quantity: number;
        is_active: boolean;
      }> = [];

      const activeSizes = selectedSizes.length > 0 ? selectedSizes : ['Standard'];
      const activeColours = selectedColours.length > 0 ? selectedColours : ['Original'];

      for (const sz of activeSizes) {
        for (const clr of activeColours) {
          variations.push({
            id: generateValidUuid(),
            product_id: '',
            size: sz,
            colour: clr,
            price_adjustment: 0,
            stock_quantity: Math.max(1, Math.round(stockAvailable / (activeSizes.length * activeColours.length))),
            is_active: true,
          });
        }
      }

      await saveProduct({
        name: name.trim(),
        slug: generatedSlug,
        short_description: description.trim().slice(0, 160),
        description: description.trim(),
        category_id: categoryId,
        base_price: parsedPrice,
        sale_price: salePrice ? parseFloat(salePrice) : undefined,
        currency: 'NGN',
        main_image_url: primaryImage,
        additionalImages,
        images: additionalImages.map((url) => ({
          id: generateValidUuid(),
          image_url: url,
        })),
        is_published: isPublished,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        variations,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated'));
      }

      navigate('/admin/products');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not save the product. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-16">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/products"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Back to Products
        </Link>
        <Link
          to="/"
          className="text-xs text-emerald-800 hover:text-emerald-950 font-medium"
        >
          Visit Storefront &rarr;
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-serif text-stone-900">Add New Garment</h1>
        <p className="text-xs text-stone-500 mt-1">
          Fill in the simple fields below to list a new piece in your boutique. Technical settings are handled automatically.
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
                  placeholder="e.g. 700 or 1500"
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
                  type="text"
                  inputMode="decimal"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 1000"
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
              placeholder="Describe the fabric (e.g. lightweight Zoom fabric, double-georgette), cut, modesty coverage, and special care details..."
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
                Upload photos from your device, or pick directly from the 54 supplied photoshoot images.
              </p>
            </div>
            {photos.length > 0 && (
              <span className="text-xs text-emerald-800 font-medium">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'} added
              </span>
            )}
          </div>

          {/* Drag & Drop Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-emerald-700 bg-emerald-50/50'
                : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <Upload size={28} className="mx-auto text-stone-400 mb-2" />
              <p className="text-xs font-semibold text-stone-800">
                Click here to upload photos, or drag and drop images
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                PNG, JPG or WEBP supported. You can upload multiple angles.
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
                        className={`aspect-[3/4] relative rounded-xs overflow-hidden border-2 transition-all group ${
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
                Selected Photos (Click 'Set as Main' to choose front cover):
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
            className="flex-1 sm:flex-none px-8 py-3.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
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
    </div>
  );
}
