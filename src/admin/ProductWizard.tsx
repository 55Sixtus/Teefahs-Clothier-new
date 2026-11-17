import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
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
  Trash2,
  Save,
  Video,
  Ruler,
  Layers,
  Tag,
  Flag,
} from 'lucide-react';
import {
  saveProduct,
  getProductById,
  archiveProduct,
  getAllCategories,
  uploadProductImage,
  uploadProductVideo,
  generateValidUuid,
  isValidUuid,
  SaveProductResult,
} from '../lib/api';
import {
  Category,
  ConstructionDetails,
  FitType,
  GarmentMeasurementRow,
  GarmentMeasurements,
  ImageAuthenticityLabel,
  ImageViewType,
  Product,
  SizingSystem,
} from '../types/product';
import { ASSETS } from '../data/assets';
import { useAuth } from '../context/AuthContext';

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

const DEFAULT_HEX_BY_NAME: Record<string, string> = {
  'midnight black': '#141414',
  black: '#141414',
  'navy blue': '#1e293b',
  navy: '#1e293b',
  'olive green': '#4d5d3b',
  olive: '#4d5d3b',
  'dusty rose': '#c0848a',
  'chocolate brown': '#4a2c1d',
  brown: '#5c3a21',
  'crisp white': '#f5f5f4',
  white: '#f5f5f4',
  'sage green': '#849b87',
  'champagne gold': '#c8ab75',
  gold: '#c8ab75',
  maroon: '#661a24',
  burgundy: '#5a1622',
  cream: '#efe8d8',
  beige: '#d8c9b0',
  plum: '#4f284b',
  lavender: '#b5a3c9',
  emerald: '#14533c',
  teal: '#1b5f63',
  blue: '#26466d',
};

const guessColourHex = (colourName: string): string => {
  const lower = colourName.trim().toLowerCase();
  for (const [k, hex] of Object.entries(DEFAULT_HEX_BY_NAME)) {
    if (lower === k || lower.includes(k)) return hex;
  }
  return '#78716c';
};

const VIEW_TYPE_OPTIONS: { value: ImageViewType; label: string }[] = [
  { value: 'front', label: 'Front View' },
  { value: 'back', label: 'Back View' },
  { value: 'side', label: 'Side / Silhouette' },
  { value: 'top', label: 'Top View' },
  { value: 'closeup', label: 'Close-Up' },
  { value: 'fabric', label: 'Fabric Texture' },
  { value: 'detail', label: 'Detail / Embroidery' },
  { value: 'worn', label: 'Full Worn Drape' },
  { value: 'other', label: 'Other' },
];

const AUTHENTICITY_OPTIONS: { value: ImageAuthenticityLabel; label: string }[] = [
  { value: 'actual_product', label: 'Actual Garment Photo' },
  { value: 'ai_enhanced', label: 'Studio Retouched' },
  { value: 'illustrative_model', label: 'Model / Illustrative' },
];

const SIZING_SYSTEMS: { value: SizingSystem; label: string }[] = [
  { value: 'NG', label: 'Nigeria (Abaya Length / Standard)' },
  { value: 'UAE', label: 'UAE / Dubai Abaya Sizing (50–62)' },
  { value: 'UK', label: 'UK Dress Sizing' },
  { value: 'US', label: 'US Dress Sizing' },
  { value: 'EU', label: 'EU Dress Sizing' },
  { value: 'EG', label: 'Egyptian / Middle Eastern' },
  { value: 'FREE_SIZE', label: 'Free Size / One Size Fits Most' },
];

const FIT_TYPES: { value: FitType; label: string }[] = [
  { value: 'loose', label: 'Loose & Flowing Modest Cut' },
  { value: 'regular', label: 'Regular Tailored Fit' },
  { value: 'fitted', label: 'Structured / Fitted' },
  { value: 'free_size', label: 'Relaxed Free-Size Drape' },
];

const WIZARD_STEPS = [
  { id: 1, title: 'Identity & Price', icon: Tag },
  { id: 2, title: 'Photos & Angles', icon: ImageIcon },
  { id: 3, title: 'Sizes, Colours & Stock', icon: Layers },
  { id: 4, title: 'Specs & Measurements', icon: Ruler },
  { id: 5, title: 'Video, Audit & Save', icon: Video },
] as const;

interface PhotoDraft {
  id: string;
  image_url: string;
  view_type: ImageViewType;
  colour_tag: string;
  authenticity_label: ImageAuthenticityLabel;
  caption: string;
}

interface VariationDraft {
  id: string;
  sku: string;
  size: string;
  colour: string;
  colour_hex: string;
  image_url: string;
  price_adjustment: number;
  price_override: string;
  stock_quantity: number;
  is_active: boolean;
}

const makeVarKey = (size: string, colour: string) => `${size}:::${colour}`;

const cmToInchesDisplay = (cm?: number | null): string => {
  if (cm === null || cm === undefined || !Number.isFinite(cm) || cm <= 0) return '—';
  return `${(cm / 2.54).toFixed(1)}″`;
};

interface ProductWizardProps {
  mode: 'create' | 'edit';
  productId?: string;
}

export default function ProductWizard({ mode, productId }: ProductWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetIdx, setReplaceTargetIdx] = useState<number | null>(null);

  const [activeStep, setActiveStep] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [schemaNotice, setSchemaNotice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [savedSummary, setSavedSummary] = useState<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    slug?: string;
  } | null>(null);

  // Step 1 — Identity & Pricing
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [collectionOrigin, setCollectionOrigin] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(mode === 'create');
  const [isFeatured, setIsFeatured] = useState(false);

  // Step 2 — Multi-Angle Photos & Authenticity
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3 — Sizing, Colours, Swatches & Per-Variation Matrix
  const [selectedSizes, setSelectedSizes] = useState<string[]>(mode === 'create' ? ['54', '56'] : []);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedColours, setSelectedColours] = useState<string[]>(
    mode === 'create' ? ['Midnight Black'] : []
  );
  const [customColourInput, setCustomColourInput] = useState('');
  const [bulkStockInput, setBulkStockInput] = useState<string>(mode === 'create' ? '10' : '0');
  const [variationMap, setVariationMap] = useState<Record<string, VariationDraft>>({});

  // Step 4 — Fabric, Construction & Measurements
  const [fabricType, setFabricType] = useState('');
  const [fabricTexture, setFabricTexture] = useState('');
  const [fabricWeight, setFabricWeight] = useState('');
  const [transparencyLining, setTransparencyLining] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [whatsIncluded, setWhatsIncluded] = useState('');
  const [construction, setConstruction] = useState<ConstructionDetails>({});
  const [sizingSystem, setSizingSystem] = useState<SizingSystem>('NG');
  const [fitType, setFitType] = useState<FitType>('loose');
  const [fitGuidance, setFitGuidance] = useState('');
  const [measurementsCategory, setMeasurementsCategory] =
    useState<GarmentMeasurements['garment_category']>('abaya');
  const [modelHeightCm, setModelHeightCm] = useState('');
  const [modelWearingSize, setModelWearingSize] = useState('');
  const [measurementRows, setMeasurementRows] = useState<GarmentMeasurementRow[]>([]);

  // Step 5 — Video & Audit Flags
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [needsMoreImages, setNeedsMoreImages] = useState(false);
  const [needsOwnerReview, setNeedsOwnerReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const [showAdvancedSlug, setShowAdvancedSlug] = useState(false);

  const hydrateFormFromProduct = React.useCallback((prod: Product, cats: Category[]) => {
    setName(prod.name || '');
    setSlug(prod.slug || '');
    setSlugManuallyEdited(true);
    setSku(prod.sku || '');
    setPrice(prod.base_price !== undefined && prod.base_price !== null ? String(prod.base_price) : '');
    setSalePrice(prod.sale_price !== undefined && prod.sale_price !== null ? String(prod.sale_price) : '');
    setCountryOfOrigin(prod.country_of_origin || '');
    setCollectionOrigin(prod.collection_origin || '');
    setShortDescription(prod.short_description || '');
    setDescription(prod.description || '');
    setIsPublished(prod.is_published ?? true);
    setIsFeatured(prod.is_featured ?? false);
    setIsNewArrival(prod.is_new_arrival ?? false);

    let resolvedCatId = '';
    if (prod.category_id && cats.some((c) => c.id === prod.category_id)) {
      resolvedCatId = prod.category_id;
    } else if (prod.category_id) {
      const bySlug = cats.find((c) => c.slug === prod.category_id);
      if (bySlug) resolvedCatId = bySlug.id;
    }
    setCategoryId(resolvedCatId || prod.category_id || cats[0]?.id || '');

    const draftedPhotos: PhotoDraft[] = [];
    const seenUrls = new Set<string>();

    if (prod.images && prod.images.length > 0) {
      prod.images.forEach((img) => {
        if (!img.image_url || seenUrls.has(img.image_url)) return;
        seenUrls.add(img.image_url);
        draftedPhotos.push({
          id: isValidUuid(img.id) ? img.id : generateValidUuid(),
          image_url: img.image_url,
          view_type: img.view_type || 'front',
          colour_tag: img.colour_tag || '',
          authenticity_label: img.authenticity_label || 'actual_product',
          caption: img.caption || '',
        });
      });
    }

    if (prod.main_image_url && !seenUrls.has(prod.main_image_url)) {
      draftedPhotos.unshift({
        id: generateValidUuid(),
        image_url: prod.main_image_url,
        view_type: 'front',
        colour_tag: '',
        authenticity_label: 'actual_product',
        caption: '',
      });
    }

    const primaryIdx = Math.max(
      0,
      draftedPhotos.findIndex((p) => p.image_url === prod.main_image_url)
    );
    setPhotos(draftedPhotos);
    setMainPhotoIndex(primaryIdx);

    const initialVars: Record<string, VariationDraft> = {};
    if (prod.variations && prod.variations.length > 0) {
      const rawSizes = Array.from(new Set(prod.variations.map((v) => v.size || 'Standard')));
      const rawColours = Array.from(new Set(prod.variations.map((v) => v.colour || 'Original')));

      for (const v of prod.variations) {
        const sz = v.size || 'Standard';
        const clr = v.colour || 'Original';
        initialVars[makeVarKey(sz, clr)] = {
          id: isValidUuid(v.id) ? v.id : generateValidUuid(),
          sku:
            v.sku ||
            `TC-${(prod.slug || prod.name || 'ITEM')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 6)}-${sz.toUpperCase()}`,
          size: sz,
          colour: clr,
          colour_hex: v.colour_hex || guessColourHex(clr),
          image_url: v.image_url || '',
          price_adjustment: Number(v.price_adjustment) || 0,
          price_override:
            v.price_override !== null && v.price_override !== undefined
              ? String(v.price_override)
              : '',
          stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
          is_active: v.is_active ?? true,
        };
      }

      setSelectedSizes(rawSizes);
      setSelectedColours(rawColours);
      setVariationMap(initialVars);

      const avgStock = Math.round(
        prod.variations.reduce((sum, v) => sum + Math.max(0, Number(v.stock_quantity) || 0), 0) /
          prod.variations.length
      );
      setBulkStockInput(String(avgStock));
    } else {
      setSelectedSizes([]);
      setSelectedColours([]);
      setVariationMap({});
      setBulkStockInput('0');
    }

    setFabricType(prod.fabric_type || '');
    setFabricTexture(prod.fabric_texture || '');
    setFabricWeight(prod.fabric_weight || '');
    setTransparencyLining(prod.transparency_lining || '');
    setCareInstructions(prod.care_instructions || '');
    setWhatsIncluded(prod.whats_included || '');
    setConstruction(prod.construction_details || {});
    setSizingSystem(prod.sizing_system || 'NG');
    setFitType(prod.fit_type || 'loose');
    setFitGuidance(prod.fit_guidance || '');

    if (prod.measurements) {
      setMeasurementsCategory(prod.measurements.garment_category || 'abaya');
      setModelHeightCm(
        prod.measurements.model_height_cm ? String(prod.measurements.model_height_cm) : ''
      );
      setModelWearingSize(prod.measurements.model_wearing_size || '');
      setMeasurementRows(Array.isArray(prod.measurements.rows) ? prod.measurements.rows : []);
    }

    setVideoUrl(prod.video_url || '');
    setVideoCaption(prod.video_caption || '');
    setNeedsMoreImages(Boolean(prod.needs_more_images));
    setNeedsOwnerReview(Boolean(prod.needs_owner_review));
    setReviewNotes(prod.review_notes || '');
  }, []);

  // Load Categories (+ existing product in Edit mode)
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const cats = await getAllCategories();
        if (!active) return;
        setCategories(cats);

        if (mode === 'create') {
          if (cats.length > 0) setCategoryId((prev) => prev || cats[0].id);
          setLoadingInitial(false);
          return;
        }

        if (!productId) {
          setErrorMsg('No product identifier provided.');
          setLoadingInitial(false);
          return;
        }

        const prod: Product | null = await getProductById(productId);
        if (!active) return;

        if (!prod) {
          setErrorMsg('This product could not be found in your store catalogue.');
          setLoadingInitial(false);
          return;
        }

        hydrateFormFromProduct(prod, cats);
      } catch (err: any) {
        if (active) setErrorMsg(err?.message || 'Error loading product data.');
      } finally {
        if (active) setLoadingInitial(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [mode, productId, hydrateFormFromProduct]);

  // Auto-sync slug when creating unless manually edited
  useEffect(() => {
    if (mode === 'create' && !slugManuallyEdited) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  }, [name, slugManuallyEdited, mode]);

  // Synchronize variation matrix when sizes/colours change
  useEffect(() => {
    if (loadingInitial) return;
    if (selectedSizes.length === 0 && selectedColours.length === 0) {
      setVariationMap({});
      return;
    }
    const activeSizes = selectedSizes.length > 0 ? selectedSizes : ['Standard'];
    const activeColours = selectedColours.length > 0 ? selectedColours : ['Original'];
    const defaultQty = Math.max(0, parseInt(bulkStockInput, 10) || 0);

    setVariationMap((prev) => {
      const next: Record<string, VariationDraft> = {};
      for (const sz of activeSizes) {
        for (const clr of activeColours) {
          const key = makeVarKey(sz, clr);
          if (prev[key]) {
            next[key] = prev[key];
          } else {
            next[key] = {
              id: generateValidUuid(),
              sku: `TC-${(slug || name || 'ITEM')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 6)}-${sz.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
              size: sz,
              colour: clr,
              colour_hex: guessColourHex(clr),
              image_url: '',
              price_adjustment: 0,
              price_override: '',
              stock_quantity: defaultQty,
              is_active: true,
            };
          }
        }
      }
      return next;
    });
  }, [selectedSizes, selectedColours, loadingInitial]);

  // Image upload & photo list manipulation
  const processImageFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    setErrorMsg('');

    try {
      const added: PhotoDraft[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadProductImage(file);
        added.push({
          id: generateValidUuid(),
          image_url: url,
          view_type: photos.length === 0 && added.length === 0 ? 'front' : 'other',
          colour_tag: '',
          authenticity_label: 'actual_product',
          caption: '',
        });
      }
      if (added.length > 0) {
        setPhotos((prev) => [...prev, ...added]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = replaceTargetIdx;
    e.target.value = '';
    setReplaceTargetIdx(null);
    if (!file || idx === null) return;

    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const uploadedUrl = await uploadProductImage(file);
      setPhotos((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, image_url: uploadedUrl } : item))
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not replace photograph.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingVideo(true);
    setErrorMsg('');
    try {
      const uploadedUrl = await uploadProductVideo(file);
      setVideoUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not upload garment video.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const updatePhotoMeta = (idx: number, patch: Partial<PhotoDraft>) => {
    setPhotos((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (mainPhotoIndex === index) {
      setMainPhotoIndex(0);
    } else if (mainPhotoIndex > index) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
    if (mainPhotoIndex === index) setMainPhotoIndex(target);
    else if (mainPhotoIndex === target) setMainPhotoIndex(index);
  };

  // Variations helpers
  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) => (prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]));
  };

  const addCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes((prev) => [...prev, trimmed]);
      setCustomSizeInput('');
    }
  };

  const toggleColour = (clr: string) => {
    setSelectedColours((prev) =>
      prev.includes(clr) ? prev.filter((c) => c !== clr) : [...prev, clr]
    );
  };

  const addCustomColour = () => {
    const trimmed = customColourInput.trim();
    if (trimmed && !selectedColours.includes(trimmed)) {
      setSelectedColours((prev) => [...prev, trimmed]);
      setCustomColourInput('');
    }
  };

  const updateVariationField = (key: string, patch: Partial<VariationDraft>) => {
    setVariationMap((prev) => {
      const target = prev[key];
      if (!target) return prev;
      return {
        ...prev,
        [key]: { ...target, ...patch },
      };
    });
  };

  const applyBulkStockToAll = () => {
    const qty = Math.max(0, parseInt(bulkStockInput, 10) || 0);
    setVariationMap((prev) => {
      const next: Record<string, VariationDraft> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, stock_quantity: qty };
      }
      return next;
    });
  };

  // Measurement Rows helpers
  const addMeasurementRow = () => {
    const unusedSize =
      selectedSizes.find((s) => !measurementRows.some((r) => r.size_label === s)) ||
      `Size ${measurementRows.length + 1}`;
    setMeasurementRows((prev) => [...prev, { size_label: unusedSize }]);
  };

  const syncMeasurementRowsFromSizes = () => {
    const existingByLabel = new Map(measurementRows.map((r) => [r.size_label, r]));
    const merged: GarmentMeasurementRow[] = selectedSizes.map(
      (sz) => existingByLabel.get(sz) || { size_label: sz }
    );
    measurementRows.forEach((r) => {
      if (!selectedSizes.includes(r.size_label)) merged.push(r);
    });
    setMeasurementRows(merged);
  };

  const updateMeasurementRow = (idx: number, patch: Partial<GarmentMeasurementRow>) => {
    setMeasurementRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeMeasurementRow = (idx: number) => {
    setMeasurementRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const variationList = Object.values(variationMap);
  const totalUnitsInStock = variationList.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const availablePhotoColourOptions = Array.from(
    new Set(selectedColours.filter((c) => c && c !== 'Original'))
  );

  const executeSave = async () => {
    if (saving) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSchemaNotice(false);

    if (!name.trim()) {
      setErrorMsg('Please enter a product name.');
      setActiveStep(1);
      return;
    }

    const cleanedPrice = price.toString().replace(/,/g, '').trim();
    const parsedPrice = parseFloat(cleanedPrice);
    if (!cleanedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid selling price in Naira (₦), e.g. 1500 or 229500.');
      setActiveStep(1);
      return;
    }

    const cleanedSale = salePrice.toString().replace(/,/g, '').trim();
    const parsedSalePrice = cleanedSale ? parseFloat(cleanedSale) : undefined;
    if (cleanedSale && (isNaN(parsedSalePrice!) || parsedSalePrice! < 0)) {
      setErrorMsg('Original price before discount must be a valid non-negative number.');
      setActiveStep(1);
      return;
    }

    if (photos.length === 0) {
      setErrorMsg('Please upload or choose at least one product photo before saving.');
      setActiveStep(2);
      return;
    }

    setSaving(true);

    try {
      const finalSlug =
        (slug.trim() || name)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/(^-|-$)/g, '') || generateValidUuid();

      const primaryPhoto = photos[mainPhotoIndex] || photos[0];
      const orderedPhotos = [
        primaryPhoto,
        ...photos.filter((_, idx) => idx !== mainPhotoIndex),
      ];

      const formattedVariations = variationList.map((v, idx) => {
        const cleanedOverride = v.price_override.toString().replace(/,/g, '').trim();
        const parsedOverride = cleanedOverride ? parseFloat(cleanedOverride) : null;
        return {
          id: v.id || generateValidUuid(),
          product_id: mode === 'edit' && productId ? productId : '',
          sku:
            v.sku.trim() ||
            `TC-${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${idx + 1}`,
          size: v.size,
          colour: v.colour,
          colour_hex: v.colour_hex || guessColourHex(v.colour),
          image_url: v.image_url || undefined,
          price_adjustment: parsedOverride !== null ? v.price_adjustment || 0 : 0,
          price_override:
            parsedOverride !== null && Number.isFinite(parsedOverride) && parsedOverride >= 0
              ? Math.round(parsedOverride)
              : null,
          stock_quantity: Math.max(0, Math.round(Number(v.stock_quantity) || 0)),
          is_active: v.is_active ?? true,
        };
      });

      const parsedModelHeight = modelHeightCm.trim() ? Number(modelHeightCm) : null;
      const cleanedRows = measurementRows.filter((r) => r.size_label.trim().length > 0);
      const measurementsPayload: GarmentMeasurements = {
        garment_category: measurementsCategory,
        unit: 'cm',
        model_height_cm:
          parsedModelHeight && Number.isFinite(parsedModelHeight) ? parsedModelHeight : null,
        model_wearing_size: modelWearingSize.trim() || undefined,
        rows: cleanedRows,
      };

      const saved: SaveProductResult = await saveProduct({
        id: mode === 'edit' ? productId : undefined,
        name: name.trim(),
        slug: finalSlug,
        sku: sku.trim() || undefined,
        short_description: shortDescription.trim() || description.trim().slice(0, 160),
        description: description.trim(),
        category_id: categoryId,
        base_price: parsedPrice,
        sale_price: parsedSalePrice,
        currency: 'NGN',
        country_of_origin: countryOfOrigin.trim() || undefined,
        collection_origin: collectionOrigin.trim() || undefined,
        main_image_url: primaryPhoto.image_url,
        additionalImages: orderedPhotos.slice(1).map((p) => p.image_url),
        images: orderedPhotos.map((p, idx) => ({
          id: p.id || generateValidUuid(),
          image_url: p.image_url,
          alt_text: `${name.trim()} — ${p.view_type || 'front'} photograph ${idx + 1}`,
          view_type: p.view_type,
          colour_tag: p.colour_tag.trim() || undefined,
          authenticity_label: p.authenticity_label,
          caption: p.caption.trim() || undefined,
          is_primary: idx === 0,
          display_order: idx,
        })),
        fabric_type: fabricType.trim() || undefined,
        fabric_texture: fabricTexture.trim() || undefined,
        fabric_weight: fabricWeight.trim() || undefined,
        transparency_lining: transparencyLining.trim() || undefined,
        care_instructions: careInstructions.trim() || undefined,
        whats_included: whatsIncluded.trim() || undefined,
        construction_details: construction,
        sizing_system: sizingSystem,
        fit_type: fitType,
        fit_guidance: fitGuidance.trim() || undefined,
        measurements: measurementsPayload,
        video_url: videoUrl.trim() || undefined,
        video_caption: videoCaption.trim() || undefined,
        needs_more_images: needsMoreImages,
        needs_owner_review: needsOwnerReview,
        review_notes: reviewNotes.trim() || undefined,
        is_published: isPublished,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        variations: formattedVariations,
      });

      if (saved.__schemaUpgradePending) {
        setSchemaNotice(true);
      }

      if (mode === 'create') {
        setSavedSummary({
          id: saved.id,
          name: saved.name,
          price: Number(saved.base_price ?? parsedPrice),
          imageUrl: saved.main_image_url,
          slug: saved.slug,
        });
      } else {
        hydrateFormFromProduct(saved, categories);
        setSuccessMsg(
          `Confirmed saved: "${saved.name}" is now ₦${Number(saved.base_price).toLocaleString()} on your live storefront.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not save product changes. Your form edits are still intact — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSave();
  };

  const handleArchiveProduct = async () => {
    if (!productId || mode !== 'edit') return;
    setDeleting(true);
    setErrorMsg('');
    try {
      await archiveProduct(productId, user?.email || 'Authenticated Admin');
      navigate('/admin/products', {
        state: { archivedProductId: productId, archivedProductName: name },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to archive product.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full" />
        <p className="text-xs uppercase tracking-widest text-stone-500">
          Loading garment configuration from Supabase...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-20">
      {/* Hidden inputs for file/camera/video */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReplacePhoto}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleVideoFileUpload}
        className="hidden"
      />

      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/products"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Back to Products
        </Link>

        <div className="flex items-center gap-4">
          {mode === 'edit' && (slug || productId) && (
            <Link
              to={`/product/${slug || productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1"
            >
              <span>View on Storefront</span>
              <ExternalLink size={12} />
            </Link>
          )}
          <Link to="/" className="text-xs text-stone-600 hover:text-stone-900 font-medium">
            Storefront Home &rarr;
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-800 font-bold block mb-1">
            {mode === 'create' ? 'New Store Listing' : 'Product Editor'}
          </span>
          <h1 className="text-3xl font-serif text-stone-900">
            {mode === 'create' ? 'Add Product' : name || 'Edit Product'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Update product name, price, category, photos, or sizes and click Save Changes when done.
          </p>
        </div>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer self-start"
          >
            <Trash2 size={14} />
            <span>Delete Product</span>
          </button>
        )}
      </div>

      {/* Banners */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={executeSave}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[11px] font-semibold uppercase tracking-wider rounded-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Retrying...' : 'Retry Save'}
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          {(slug || productId) && (
            <Link
              to={`/product/${slug || productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold underline text-emerald-950"
            >
              Preview Live &rarr;
            </Link>
          )}
        </div>
      )}

      {schemaNotice && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-sm flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Price, photos, sizes, and visibility were saved to your store.
            </p>
            <p className="text-amber-800 mt-1">
              Optional extended measurement/video columns have not yet been enabled on the database server. Everything customers need to browse and order is already live.
            </p>
          </div>
        </div>
      )}

      {/* 5-Step Tab Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {WIZARD_STEPS.map((step) => {
          const Icon = step.icon;
          const isCurrent = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                isCurrent
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0 ${
                  isCurrent ? 'bg-amber-400 text-stone-950' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {step.id}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider block truncate">
                  {step.title}
                </span>
              </div>
              <Icon
                size={13}
                className={`ml-auto flex-shrink-0 hidden lg:block ${
                  isCurrent ? 'text-amber-300' : 'text-stone-400'
                }`}
              />
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ==================== STEP 1: IDENTITY & PRICING ==================== */}
        {activeStep === 1 && (
          <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-5">
            <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
              Step 1 · Product Name, Category &amp; Price
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Noor Embellished Luxury Abaya"
                  className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Product Code / SKU (Optional)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. TC-ABY-001"
                  className="w-full p-2.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Made In / Origin (Optional)
                </label>
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  placeholder="e.g. UAE, Nigeria, Turkey"
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Collection Line (Optional)
                </label>
                <input
                  type="text"
                  value={collectionOrigin}
                  onChange={(e) => setCollectionOrigin(e.target.value)}
                  placeholder="e.g. Dubai Atelier, Signature Line"
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedSlug((v) => !v)}
                className="text-[11px] font-medium text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                {showAdvancedSlug ? 'Hide Web Address Link' : 'Customise Web Address Link (Optional)'}
              </button>
              {showAdvancedSlug && (
                <div className="mt-2 max-w-md">
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Product Web Address
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="auto-generated-from-name"
                    className="w-full p-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 1500 or 229500"
                    className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-mono font-semibold tabular-nums"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['1500', '18000', '22000', '28000', '35000', '45000', '50000', '70000', '75000', '229500'].map(
                    (pVal) => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setPrice(pVal)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border cursor-pointer ${
                          price === pVal
                            ? 'bg-emerald-900 text-white border-emerald-950 font-bold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                        }`}
                      >
                        ₦{parseInt(pVal, 10).toLocaleString()}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Original Price Before Discount (Optional ₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Leave blank if no strike-through"
                    className="w-full pl-8 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 font-mono tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Only sets strike-through pricing when higher than selling price on eligible garments.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Boutique Category *
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-xs text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-900 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-amber-300" />}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.is_active ? '' : ' (Hidden)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Short Summary (1–2 lines for quick view)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Concise highlight of the silhouette & coverage..."
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Full Editorial Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the verified drape, modesty features, styling notes, and occasion fit..."
                  className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-sm focus:bg-white focus:outline-none focus:border-stone-900 leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-start gap-2.5 p-3 border border-stone-200 rounded-sm cursor-pointer hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-800"
                />
                <span className="text-xs">
                  <strong className="block text-stone-900">Published Live</strong>
                  <span className="text-[11px] text-stone-500">Visible to shoppers</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 border border-stone-200 rounded-sm cursor-pointer hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-800"
                />
                <span className="text-xs">
                  <strong className="block text-stone-900">New Arrival</strong>
                  <span className="text-[11px] text-stone-500">Include in New Arrivals</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 border border-stone-200 rounded-sm cursor-pointer hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-800"
                />
                <span className="text-xs">
                  <strong className="block text-stone-900">Homepage Featured</strong>
                  <span className="text-[11px] text-stone-500">Spotlight on home page</span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: MULTI-ANGLE PHOTOS ==================== */}
        {activeStep === 2 && (
          <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
              <div>
                <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Step 2 · Full-Frame Product Photographs & View Metadata
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  All photos render uncropped on the storefront (`object-contain`). Tag angles, colour variants, and authenticity.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-900">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            {photos.length < 2 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-700 flex-shrink-0" />
                <span>
                  Adding at least 2–3 angles (front, back/side, fabric close-up) strongly improves buyer confidence.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <Camera size={16} className="text-amber-300" />
                <span>Take Phone Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-stone-900 hover:bg-stone-800 text-white rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <Upload size={16} />
                <span>Upload Image(s)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGalleryPicker((v) => !v)}
                className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-sm flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <ImageIcon size={16} className="text-emerald-800" />
                <span>Studio Library ({ASSETS.productImages.length})</span>
                {showGalleryPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-5 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-emerald-700 bg-emerald-50/50'
                  : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
              }`}
            >
              <Upload size={22} className="mx-auto text-stone-400 mb-1" />
              <p className="text-xs font-semibold text-stone-800">
                Drag and drop JPG, PNG, or WebP garment images
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Optimized automatically and stored securely in Supabase `product-images`.
              </p>
            </div>

            {uploadingPhoto && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                <span>Optimizing and uploading photograph...</span>
              </div>
            )}

            {showGalleryPicker && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-sm">
                <p className="text-[11px] text-stone-600 mb-3">
                  Click a studio photograph to attach or remove it:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1">
                  {ASSETS.productImages.map((imgUrl, i) => {
                    const existingIdx = photos.findIndex((p) => p.image_url === imgUrl);
                    const isSelected = existingIdx !== -1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (isSelected) removePhoto(existingIdx);
                          else
                            setPhotos((prev) => [
                              ...prev,
                              {
                                id: generateValidUuid(),
                                image_url: imgUrl,
                                view_type: prev.length === 0 ? 'front' : 'other',
                                colour_tag: '',
                                authenticity_label: 'actual_product',
                                caption: '',
                              },
                            ]);
                        }}
                        className={`aspect-[3/4] relative rounded-xs overflow-hidden border-2 bg-white cursor-pointer ${
                          isSelected
                            ? 'border-emerald-700 ring-2 ring-emerald-400'
                            : 'border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Studio ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-950/35 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
                {photos.map((item, idx) => {
                  const isMain = idx === mainPhotoIndex;
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`border rounded-sm p-3 space-y-2.5 bg-stone-50 ${
                        isMain ? 'border-emerald-700 ring-2 ring-emerald-200' : 'border-stone-200'
                      }`}
                    >
                      <div className="aspect-[3/4] bg-white border border-stone-200 rounded-xs relative flex items-center justify-center overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={`View ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        {isMain && (
                          <span className="absolute top-2 left-2 bg-emerald-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                            Primary Cover
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => setMainPhotoIndex(idx)}
                            className="text-stone-800 hover:text-emerald-900 font-semibold cursor-pointer"
                          >
                            Set as Primary
                          </button>
                        ) : (
                          <span className="text-emerald-800 font-semibold inline-flex items-center gap-1">
                            <Star size={12} fill="currentColor" /> Cover Photo
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePhoto(idx, -1)}
                            className="p-1 border border-stone-200 bg-white rounded-xs disabled:opacity-30 cursor-pointer"
                            title="Move earlier"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === photos.length - 1}
                            onClick={() => movePhoto(idx, 1)}
                            className="p-1 border border-stone-200 bg-white rounded-xs disabled:opacity-30 cursor-pointer"
                            title="Move later"
                          >
                            <ChevronRight size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceTargetIdx(idx);
                              replaceInputRef.current?.click();
                            }}
                            className="px-2 py-1 border border-stone-300 bg-white text-[10px] font-semibold rounded-xs inline-flex items-center gap-1 cursor-pointer"
                            title="Replace image"
                          >
                            <RefreshCw size={10} />
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-0.5">
                            Angle / View
                          </label>
                          <select
                            value={item.view_type}
                            onChange={(e) =>
                              updatePhotoMeta(idx, { view_type: e.target.value as ImageViewType })
                            }
                            className="w-full p-1.5 text-[11px] bg-white border border-stone-300 rounded-xs"
                          >
                            {VIEW_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-0.5">
                            Linked Colour
                          </label>
                          <select
                            value={item.colour_tag}
                            onChange={(e) => updatePhotoMeta(idx, { colour_tag: e.target.value })}
                            className="w-full p-1.5 text-[11px] bg-white border border-stone-300 rounded-xs"
                          >
                            <option value="">All / Shared</option>
                            {availablePhotoColourOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-0.5">
                            Photo Authenticity
                          </label>
                          <select
                            value={item.authenticity_label}
                            onChange={(e) =>
                              updatePhotoMeta(idx, {
                                authenticity_label: e.target.value as ImageAuthenticityLabel,
                              })
                            }
                            className="w-full p-1.5 text-[11px] bg-white border border-stone-300 rounded-xs"
                          >
                            {AUTHENTICITY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-0.5">
                            Optional Caption
                          </label>
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) => updatePhotoMeta(idx, { caption: e.target.value })}
                            placeholder="e.g. Sleeve detail"
                            className="w-full p-1.5 text-[11px] bg-white border border-stone-300 rounded-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 3: VARIATIONS, SWATCHES & STOCK ==================== */}
        {activeStep === 3 && (
          <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
              <div>
                <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Step 3 · Sizes, Colour Swatches, Per-Variant Photo & Price
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Customers can click colour swatches to switch gallery photos and check exact size availability.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                Total Stock: {totalUnitsInStock} {totalUnitsInStock === 1 ? 'unit' : 'units'}
              </span>
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Available Sizes
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...PRESET_SIZES, ...selectedSizes])).map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer ${
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
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSize();
                    }
                  }}
                  placeholder="Custom size (e.g. 50, UK 14)"
                  className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1"
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
                Available Colours
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([...PRESET_COLOURS, ...selectedColours])).map((clr) => {
                  const isSelected = selectedColours.includes(clr);
                  return (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => toggleColour(clr)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer inline-flex items-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-900 text-white border-emerald-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 inline-block"
                        style={{ backgroundColor: guessColourHex(clr) }}
                      />
                      <span>{clr}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 max-w-xs mt-2">
                <input
                  type="text"
                  value={customColourInput}
                  onChange={(e) => setCustomColourInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomColour();
                    }
                  }}
                  placeholder="Custom colour (e.g. Teal Blue, Plum)"
                  className="p-1.5 text-xs bg-stone-50 border border-stone-300 rounded-sm flex-1"
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

            {/* Matrix */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-800">
                    Variation Matrix ({variationList.length}{' '}
                    {variationList.length === 1 ? 'combination' : 'combinations'})
                  </label>
                  <p className="text-[11px] text-stone-500">
                    Assign exact stock, swatch hex, linked photo, or optional variation price override (leave price blank to use garment base price).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={bulkStockInput}
                    onChange={(e) => setBulkStockInput(e.target.value)}
                    className="w-20 p-1.5 text-xs font-mono text-center bg-stone-50 border border-stone-300 rounded-sm"
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

              {variationList.length === 0 ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-sm text-center text-xs text-amber-900">
                  Select at least one Size or Colour above to generate inventory variations.
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200 rounded-sm">
                  <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-3 font-semibold">Size</th>
                        <th className="py-2 px-3 font-semibold">Colour &amp; Swatch</th>
                        <th className="py-2 px-3 font-semibold">SKU</th>
                        <th className="py-2 px-3 font-semibold">Variant Photo</th>
                        <th className="py-2 px-3 font-semibold">Price Override (₦)</th>
                        <th className="py-2 px-3 font-semibold text-center">Active</th>
                        <th className="py-2 px-3 font-semibold text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {variationList.map((v) => {
                        const key = makeVarKey(v.size, v.colour);
                        return (
                          <tr key={key} className="hover:bg-stone-50/70">
                            <td className="py-2 px-3 font-semibold text-stone-900">{v.size}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={v.colour_hex || '#78716c'}
                                  onChange={(e) =>
                                    updateVariationField(key, { colour_hex: e.target.value })
                                  }
                                  className="w-6 h-6 p-0 border border-stone-300 rounded-xs cursor-pointer bg-white"
                                  title="Swatch colour hex"
                                />
                                <span className="text-stone-800">{v.colour}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => updateVariationField(key, { sku: e.target.value })}
                                className="w-32 p-1 text-[11px] font-mono bg-stone-50 border border-stone-200 rounded"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={v.image_url}
                                onChange={(e) =>
                                  updateVariationField(key, { image_url: e.target.value })
                                }
                                className="w-36 p-1 text-[11px] bg-stone-50 border border-stone-200 rounded"
                              >
                                <option value="">Default cover photo</option>
                                {photos.map((ph, idx) => (
                                  <option key={ph.id} value={ph.image_url}>
                                    Photo #{idx + 1} ({ph.view_type}
                                    {ph.colour_tag ? ` · ${ph.colour_tag}` : ''})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={v.price_override}
                                onChange={(e) =>
                                  updateVariationField(key, {
                                    price_override: e.target.value.replace(/[^0-9.]/g, ''),
                                  })
                                }
                                placeholder="Use base"
                                className="w-24 p-1 text-[11px] font-mono bg-stone-50 border border-stone-200 rounded"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={(e) =>
                                  updateVariationField(key, { is_active: e.target.checked })
                                }
                                className="w-4 h-4 text-emerald-800"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={v.stock_quantity}
                                onChange={(e) =>
                                  updateVariationField(key, {
                                    stock_quantity: Math.max(
                                      0,
                                      Math.round(parseInt(e.target.value, 10) || 0)
                                    ),
                                  })
                                }
                                className="w-20 p-1 text-center font-mono font-semibold text-xs bg-stone-50 border border-stone-300 rounded"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STEP 4: FABRIC, CONSTRUCTION & MEASUREMENTS ==================== */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
              <div className="pb-2 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Step 4A · Verified Fabric &amp; Garment Construction Specs
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Leave unknown attributes blank rather than guessing; the storefront cleanly hides empty fields.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Fabric Composition / Type
                  </label>
                  <input
                    type="text"
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value)}
                    placeholder="e.g. Nida, Medina Silk, Stretch Jersey"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Fabric Texture
                  </label>
                  <input
                    type="text"
                    value={fabricTexture}
                    onChange={(e) => setFabricTexture(e.target.value)}
                    placeholder="e.g. Smooth matte, Crinkled chiffon"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Fabric Weight
                  </label>
                  <input
                    type="text"
                    value={fabricWeight}
                    onChange={(e) => setFabricWeight(e.target.value)}
                    placeholder="e.g. Lightweight, Medium breathable"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Opacity &amp; Lining
                  </label>
                  <input
                    type="text"
                    value={transparencyLining}
                    onChange={(e) => setTransparencyLining(e.target.value)}
                    placeholder="e.g. Fully opaque, Inner slip recommended"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    What&apos;s Included
                  </label>
                  <input
                    type="text"
                    value={whatsIncluded}
                    onChange={(e) => setWhatsIncluded(e.target.value)}
                    placeholder="e.g. Abaya + matching shawl + belt"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Care Instructions
                  </label>
                  <input
                    type="text"
                    value={careInstructions}
                    onChange={(e) => setCareInstructions(e.target.value)}
                    placeholder="e.g. Gentle cold hand wash, steam low"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: 'sleeve_style', label: 'Sleeve Style', placeholder: 'e.g. Wide kimono sleeve' },
                  { key: 'neckline', label: 'Neckline', placeholder: 'e.g. Round collar' },
                  { key: 'closure_type', label: 'Closure', placeholder: 'e.g. Hidden front buttons' },
                  { key: 'hood_or_veil', label: 'Hood / Veil', placeholder: 'e.g. Integrated tie-back' },
                  { key: 'embroidery', label: 'Embroidery / Trim', placeholder: 'e.g. Hand-beaded cuff' },
                  { key: 'pockets', label: 'Pockets', placeholder: 'e.g. Two hidden side pockets' },
                  { key: 'waist_or_belt', label: 'Waist / Belt', placeholder: 'e.g. Detachable waist tie' },
                  { key: 'occasion', label: 'Occasion', placeholder: 'e.g. Eid, Nikah, Daily Workwear' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={(construction as Record<string, string>)[field.key] || ''}
                      onChange={(e) =>
                        setConstruction((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* International Measurements Guide */}
            <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                    Step 4B · Sizing System &amp; Garment Measurements (cm → auto inches)
                  </h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Enter verified measurements in centimetres (cm); the storefront automatically converts cm ↔ inches for diaspora shoppers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSizes.length > 0 && (
                    <button
                      type="button"
                      onClick={syncMeasurementRowsFromSizes}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold border border-stone-300 rounded-sm cursor-pointer"
                    >
                      Populate From Selected Sizes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addMeasurementRow}
                    className="px-3 py-1.5 bg-stone-900 text-white text-[11px] font-semibold rounded-sm cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Size Row
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Sizing System
                  </label>
                  <select
                    value={sizingSystem}
                    onChange={(e) => setSizingSystem(e.target.value as SizingSystem)}
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  >
                    {SIZING_SYSTEMS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Garment Cut / Fit
                  </label>
                  <select
                    value={fitType}
                    onChange={(e) => setFitType(e.target.value as FitType)}
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  >
                    {FIT_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Measurement Template
                  </label>
                  <select
                    value={measurementsCategory}
                    onChange={(e) =>
                      setMeasurementsCategory(
                        e.target.value as GarmentMeasurements['garment_category']
                      )
                    }
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  >
                    <option value="abaya">Abaya / Dress</option>
                    <option value="khimar">Khimar / Prayer Wear</option>
                    <option value="hijab">Hijab / Veil / Wrap</option>
                    <option value="set">Two-Piece / Co-ord Set</option>
                    <option value="cap">Under-Cap / Accessory</option>
                    <option value="general">General Modestwear</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Model Height (cm)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="220"
                      value={modelHeightCm}
                      onChange={(e) => setModelHeightCm(e.target.value)}
                      placeholder="170"
                      className="w-full p-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Model Wears
                    </label>
                    <input
                      type="text"
                      value={modelWearingSize}
                      onChange={(e) => setModelWearingSize(e.target.value)}
                      placeholder="56"
                      className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Fit Guidance Note (For Customers)
                </label>
                <input
                  type="text"
                  value={fitGuidance}
                  onChange={(e) => setFitGuidance(e.target.value)}
                  placeholder="e.g. Generous batwing cut; choose length by height in cm/inches."
                  className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                />
              </div>

              {measurementRows.length > 0 && (
                <div className="overflow-x-auto border border-stone-200 rounded-sm">
                  <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-2.5">Size</th>
                        <th className="py-2 px-2.5">Chest (cm)</th>
                        <th className="py-2 px-2.5">Waist (cm)</th>
                        <th className="py-2 px-2.5">Hip (cm)</th>
                        <th className="py-2 px-2.5">Length (cm)</th>
                        <th className="py-2 px-2.5">Sleeve (cm)</th>
                        <th className="py-2 px-2.5">Front / Back (cm)</th>
                        <th className="py-2 px-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {measurementRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              value={row.size_label}
                              onChange={(e) =>
                                updateMeasurementRow(idx, { size_label: e.target.value })
                              }
                              className="w-20 p-1 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xs"
                            />
                          </td>
                          {(
                            [
                              'chest_cm',
                              'waist_cm',
                              'hip_cm',
                              'length_cm',
                              'sleeve_cm',
                            ] as const
                          ).map((field) => (
                            <td key={field} className="py-2 px-2.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={row[field] ?? ''}
                                onChange={(e) =>
                                  updateMeasurementRow(idx, {
                                    [field]: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                placeholder="cm"
                                className="w-16 p-1 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xs"
                              />
                              <span className="block text-[10px] text-stone-400 font-mono">
                                {cmToInchesDisplay(row[field])}
                              </span>
                            </td>
                          ))}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={row.front_length_cm ?? ''}
                                onChange={(e) =>
                                  updateMeasurementRow(idx, {
                                    front_length_cm: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  })
                                }
                                placeholder="Front"
                                className="w-14 p-1 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xs"
                              />
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={row.back_length_cm ?? ''}
                                onChange={(e) =>
                                  updateMeasurementRow(idx, {
                                    back_length_cm: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  })
                                }
                                placeholder="Back"
                                className="w-14 p-1 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xs"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeMeasurementRow(idx)}
                              className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
                              title="Remove row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STEP 5: VIDEO & OWNER AUDIT FLAGS ==================== */}
        {activeStep === 5 && (
          <div className="space-y-6">
            <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
              <div className="pb-2 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Step 5A · Optional Garment Drape / Showcase Video
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Upload MP4, WebM, or MOV (up to 30MB) or paste a hosted HTTPS video URL. Optional — never required.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploadingVideo}
                  onClick={() => videoInputRef.current?.click()}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Video size={14} />
                  <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}</span>
                </button>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('');
                      setVideoCaption('');
                    }}
                    className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-sm cursor-pointer"
                  >
                    Remove Video
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Video Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    placeholder="e.g. Natural daylight movement clip"
                    className="w-full p-2 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                  />
                </div>
              </div>

              {videoUrl && (
                <div className="max-w-md border border-stone-200 rounded-sm overflow-hidden bg-stone-950">
                  <video src={videoUrl} controls className="w-full max-h-72 object-contain" />
                </div>
              )}
            </div>

            <div className="bg-white p-6 border border-stone-200 rounded-sm shadow-2xs space-y-4">
              <div className="pb-2 border-b border-stone-100 flex items-center gap-2">
                <Flag size={15} className="text-amber-700" />
                <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Step 5B · Owner Audit Flags &amp; Summary Review
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 border border-stone-200 rounded-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsMoreImages}
                    onChange={(e) => setNeedsMoreImages(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-amber-700"
                  />
                  <span className="text-xs">
                    <strong className="block text-stone-900">Needs More Angle Photos</strong>
                    <span className="text-[11px] text-stone-500">
                      Flags item in Admin Catalogue Health for follow-up photoshoot
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 border border-stone-200 rounded-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsOwnerReview}
                    onChange={(e) => setNeedsOwnerReview(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-amber-700"
                  />
                  <span className="text-xs">
                    <strong className="block text-stone-900">Needs Owner Review</strong>
                    <span className="text-[11px] text-stone-500">
                      Marks title/category/specs for Queen Lateefah review
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Internal Review Notes (Admin Only)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional note about naming, restock, or replacement photography..."
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-sm"
                />
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Garment</span>
                  <strong className="text-stone-900">{name || 'Untitled'}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Selling Price</span>
                  <strong className="font-mono text-emerald-900 tabular-nums">
                    {price ? `₦${Number(price).toLocaleString()}` : 'Not set'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Photos / Variants</span>
                  <strong className="text-stone-900">
                    {photos.length} photos · {variationList.length} variations
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Total Stock</span>
                  <strong className="font-mono text-stone-900">{totalUnitsInStock} units</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation & Persistent Save */}
        <div className="bg-white p-4 border border-stone-200 rounded-sm shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-sm disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            {activeStep < 5 && (
              <button
                type="button"
                onClick={() => setActiveStep((s) => Math.min(5, s + 1))}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                Next Step &rarr;
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="px-5 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-medium hover:bg-stone-50 rounded-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-white text-xs uppercase tracking-widest font-semibold rounded-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save size={14} />
              <span>
                {saving
                  ? 'Saving Changes...'
                  : mode === 'create'
                  ? 'Add & Publish Product'
                  : 'Save Changes'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* Creation Success Modal */}
      {savedSummary && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 text-center space-y-5 shadow-2xl border border-stone-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <h2 className="text-xl font-serif text-stone-900">Product Added to Storefront</h2>
              <p className="text-xs text-stone-600 mt-1">
                Confirmed saved and live across your catalogue.
              </p>
            </div>
            <div className="flex items-center gap-3.5 p-3 bg-stone-50 border border-stone-200 rounded-sm text-left">
              {savedSummary.imageUrl && (
                <img
                  src={savedSummary.imageUrl}
                  alt={savedSummary.name}
                  className="w-14 h-16 object-contain bg-white rounded-xs border border-stone-200 flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900 text-sm truncate">{savedSummary.name}</p>
                <p className="text-sm font-mono font-bold text-emerald-900 tabular-nums mt-0.5">
                  ₦{savedSummary.price.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Link
                to={`/product/${savedSummary.slug || savedSummary.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2"
              >
                <span>View Live Product</span>
                <ExternalLink size={13} />
              </Link>
              <Link
                to="/admin/products"
                className="w-full py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-xs block text-center"
              >
                Back to Products
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal (Edit Mode) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-serif text-lg text-stone-900 text-center">
              Delete &ldquo;{name}&rdquo;?
            </h3>
            <p className="text-xs text-stone-600 text-center leading-relaxed">
              This removes the product from your live storefront and shopping bags immediately. You can still restore or permanently remove it later from Recently Deleted.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveProduct}
                disabled={deleting}
                className="flex-1 py-2 bg-red-700 text-white text-xs uppercase tracking-wider font-semibold rounded-sm cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
