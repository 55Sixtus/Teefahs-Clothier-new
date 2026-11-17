import { supabase } from './supabase';
import {
  Product,
  Category,
  ProductVariation,
  ProductImage,
  ImageViewType,
  ImageAuthenticityLabel,
} from '../types/product';

// Remove any legacy browser-cached catalogue keys so localStorage is never authoritative
const LEGACY_STORAGE_KEYS = [
  'teefahs_products_v13_authoritative',
  'teefahs_categories_v13_authoritative',
  'teefahs_recently_deleted_v13',
  'teefahs_products_v12_covers',
  'teefahs_categories_v12_covers',
  'teefahs_recently_deleted_products_v1',
];

if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  LEGACY_STORAGE_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore storage errors
    }
  });
}

const MAX_NAME_LENGTH = 180;
const MAX_SLUG_LENGTH = 140;
const MAX_SHORT_DESC_LENGTH = 300;
const MAX_DESC_LENGTH = 8000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_PROCESSED_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export const isSafeUrl = (value?: string | null, allowRelative = true): boolean => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const sanitizeText = (value: unknown, maxLen: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
};

const isMissingColumnError = (err: any): boolean => {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('could not find the') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
};

const formatSafeError = (err: any, fallbackMessage: string): string => {
  const raw = String(err?.message || '');
  const code = String(err?.code || '');
  if (
    code === '42501' ||
    raw.toLowerCase().includes('row-level security') ||
    raw.toLowerCase().includes('permission denied')
  ) {
    return 'Administrator authorization required. Please sign in with a verified admin account.';
  }
  if (code === '23505' || raw.toLowerCase().includes('duplicate key')) {
    return 'A record with that unique slug or identifier already exists.';
  }
  if (code === '23503') {
    return 'Cannot complete operation because referenced records are still linked.';
  }
  return fallbackMessage;
};

let auditLogsTableUnavailable = false;

export const logAdminAuditEvent = async (
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> => {
  if (auditLogsTableUnavailable) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const actor = userData?.user;
    if (!actor) return;

    const { error } = await supabase.from('admin_audit_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email || 'unknown',
      action: sanitizeText(action, 80),
      target_type: sanitizeText(targetType, 60),
      target_id: sanitizeText(targetId, 120),
      details,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    });

    if (error) {
      const code = String((error as any)?.code || '');
      const msg = String(error.message || '').toLowerCase();
      if (code === 'PGRST205' || code === '42P01' || msg.includes('could not find the table')) {
        auditLogsTableUnavailable = true;
      }
    }
  } catch {
    // Non-blocking audit log
  }
};

export interface DatabaseDiagnostics {
  status: 'fully_synchronized' | 'partially_populated' | 'connected_empty' | 'permission_denied' | 'connection_error';
  errorDetails?: string;
  counts: {
    categories: number;
    products: number;
    images: number;
    variations: number;
    totalStock?: number;
  };
  isPopulated: boolean;
  dataSource: 'supabase' | 'error';
}

export const generateValidUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const isValidUuid = (id?: string): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const notifyCatalogueUpdated = (detail: Record<string, any> = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail }));
  }
};

const normalizeViewType = (val?: string): ImageViewType => {
  const allowed: ImageViewType[] = ['front', 'back', 'side', 'top', 'closeup', 'fabric', 'detail', 'worn', 'other'];
  if (val && allowed.includes(val as ImageViewType)) return val as ImageViewType;
  return 'front';
};

const normalizeAuthenticity = (val?: string): ImageAuthenticityLabel => {
  const allowed: ImageAuthenticityLabel[] = ['actual_product', 'ai_enhanced', 'illustrative_model'];
  if (val && allowed.includes(val as ImageAuthenticityLabel)) return val as ImageAuthenticityLabel;
  return 'actual_product';
};

const mapSupabaseProduct = (p: any): Product => {
  const sortedImages: ProductImage[] = Array.isArray(p.product_images)
    ? [...p.product_images]
        .filter((img: any) => isSafeUrl(typeof img === 'string' ? img : img?.image_url))
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((img: any, idx: number) => ({
          id: img.id || `img-${idx}`,
          product_id: img.product_id || p.id,
          image_url: typeof img === 'string' ? img : img.image_url,
          alt_text: img.alt_text || '',
          view_type: normalizeViewType(img.view_type),
          colour_tag: img.colour_tag || undefined,
          authenticity_label: img.authenticity_label ? normalizeAuthenticity(img.authenticity_label) : undefined,
          caption: img.caption || undefined,
          is_primary: Boolean(img.is_primary) || (Boolean(p.main_image_url) && img.image_url === p.main_image_url),
          display_order: img.display_order ?? idx,
        }))
    : [];

  const variations: ProductVariation[] = Array.isArray(p.product_variations)
    ? p.product_variations.map((v: any) => ({
        ...v,
        price_adjustment: Number(v.price_adjustment) || 0,
        price_override:
          v.price_override !== null && v.price_override !== undefined
            ? Number(v.price_override)
            : null,
        stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
        is_active: v.is_active ?? true,
        colour_hex: v.colour_hex || undefined,
        image_url: isSafeUrl(v.image_url) ? v.image_url || undefined : undefined,
        measurements: v.measurements || undefined,
      }))
    : [];

  const basePrice = p.base_price !== null && p.base_price !== undefined ? Number(p.base_price) : 0;
  const salePrice = p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : undefined;
  const safeMainImg = isSafeUrl(p.main_image_url) ? p.main_image_url : '';

  return {
    ...p,
    base_price: Number.isFinite(basePrice) ? basePrice : 0,
    sale_price: salePrice !== undefined && Number.isFinite(salePrice) ? salePrice : undefined,
    name: p.name || '',
    slug: p.slug || '',
    sku: p.sku || undefined,
    description: p.description || '',
    short_description: p.short_description || '',
    main_image_url: safeMainImg || sortedImages[0]?.image_url || '',
    currency: p.currency || 'NGN',
    country_of_origin: p.country_of_origin || undefined,
    collection_origin: p.collection_origin || undefined,
    fabric_type: p.fabric_type || undefined,
    fabric_texture: p.fabric_texture || undefined,
    fabric_weight: p.fabric_weight || undefined,
    transparency_lining: p.transparency_lining || undefined,
    care_instructions: p.care_instructions || undefined,
    construction_details: p.construction_details || undefined,
    whats_included: p.whats_included || undefined,
    sizing_system: p.sizing_system || 'NG',
    fit_type: p.fit_type || 'loose',
    fit_guidance: p.fit_guidance || undefined,
    measurements_unit_note: p.measurements_unit_note || undefined,
    measurements: p.measurements || undefined,
    video_url: isSafeUrl(p.video_url) ? p.video_url || undefined : undefined,
    video_caption: p.video_caption || undefined,
    needs_more_images: Boolean(p.needs_more_images),
    needs_owner_review: Boolean(p.needs_owner_review),
    review_notes: p.review_notes || undefined,
    is_published: Boolean(p.is_published),
    is_featured: Boolean(p.is_featured),
    is_new_arrival: Boolean(p.is_new_arrival),
    is_archived: Boolean(p.is_archived),
    deleted_at: p.deleted_at || null,
    deleted_by: p.deleted_by || undefined,
    variations,
    images: sortedImages,
    additionalImages: sortedImages
      .map((img) => img.image_url)
      .filter((url: string) => Boolean(url) && url !== safeMainImg),
  };
};

export const getDatabaseDiagnostics = async (): Promise<DatabaseDiagnostics> => {
  try {
    const [catRes, prodRes, imgRes, varRes] = await Promise.all([
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).or('is_archived.is.null,is_archived.eq.false'),
      supabase.from('product_images').select('*', { count: 'exact', head: true }),
      supabase.from('product_variations').select('*', { count: 'exact', head: true }),
    ]);

    const hasError = catRes.error || prodRes.error || imgRes.error || varRes.error;
    if (hasError) {
      const err = catRes.error || prodRes.error || imgRes.error || varRes.error;
      const isPermissionDenied =
        err?.code === '42501' ||
        err?.message?.toLowerCase().includes('permission denied') ||
        err?.message?.toLowerCase().includes('row-level security');

      return {
        status: isPermissionDenied ? 'permission_denied' : 'connection_error',
        errorDetails: formatSafeError(err, 'Database diagnostics error'),
        counts: {
          categories: catRes.count ?? 0,
          products: prodRes.count ?? 0,
          images: imgRes.count ?? 0,
          variations: varRes.count ?? 0,
          totalStock: 0,
        },
        isPopulated: false,
        dataSource: 'error',
      };
    }

    const prodCount = prodRes.count ?? 0;
    const catCount = catRes.count ?? 0;
    const imgCount = imgRes.count ?? 0;
    const varCount = varRes.count ?? 0;

    let totalStock = 0;
    if (varCount > 0) {
      const { data: stockData } = await supabase.from('product_variations').select('stock_quantity');
      if (stockData && Array.isArray(stockData)) {
        totalStock = stockData.reduce((acc, row: any) => acc + (row.stock_quantity || 0), 0);
      }
    }

    const isPopulated = prodCount > 0 && catCount > 0;
    let status: DatabaseDiagnostics['status'] = 'connected_empty';
    if (isPopulated && imgCount > 0 && varCount > 0) {
      status = 'fully_synchronized';
    } else if (prodCount > 0 || catCount > 0) {
      status = 'partially_populated';
    }

    return {
      status,
      counts: {
        categories: catCount,
        products: prodCount,
        images: imgCount,
        variations: varCount,
        totalStock,
      },
      isPopulated,
      dataSource: 'supabase',
    };
  } catch {
    return {
      status: 'connection_error',
      errorDetails: 'Network connectivity error',
      counts: { categories: 0, products: 0, images: 0, variations: 0, totalStock: 0 },
      isPopulated: false,
      dataSource: 'error',
    };
  }
};

// Products API — Live Supabase only (zero stale localStorage fallbacks)
export const getPublishedProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*), product_images(*)')
    .eq('is_published', true)
    .or('is_archived.is.null,is_archived.eq.false')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to fetch storefront products from Supabase.'));
  }

  return (data || [])
    .filter((p: any) => !p.is_archived && !p.deleted_at)
    .map(mapSupabaseProduct);
};

export const getAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*), product_images(*)')
    .or('is_archived.is.null,is_archived.eq.false')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to fetch admin products from Supabase.'));
  }

  return (data || [])
    .filter((p: any) => !p.is_archived && !p.deleted_at)
    .map(mapSupabaseProduct);
};

export const getArchivedProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*), product_images(*)')
    .or('is_archived.eq.true,deleted_at.not.is.null')
    .order('deleted_at', { ascending: false });

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to load archived products.'));
  }

  return (data || []).map(mapSupabaseProduct);
};

export const getProductById = async (idOrSlug: string): Promise<Product | null> => {
  const cleaned = sanitizeText(idOrSlug, MAX_SLUG_LENGTH);
  if (!cleaned) return null;

  const column = isValidUuid(cleaned) ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*), product_images(*)')
    .eq(column, cleaned)
    .maybeSingle();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not load product record.'));
  }
  return data ? mapSupabaseProduct(data) : null;
};

export type SaveProductResult = Product & { __schemaUpgradePending?: boolean };

export const saveProduct = async (product: Partial<Product>): Promise<SaveProductResult> => {
  const cleanName = sanitizeText(product.name, MAX_NAME_LENGTH);
  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  if (product.main_image_url && !isSafeUrl(product.main_image_url)) {
    throw new Error('Invalid main image URL protocol. Only HTTPS, HTTP, or local /assets/ paths are permitted.');
  }

  if (product.video_url && !isSafeUrl(product.video_url)) {
    throw new Error('Invalid video URL protocol. Only HTTPS, HTTP, or local /assets/ paths are permitted.');
  }

  const baseSlug =
    sanitizeText(product.slug || cleanName, MAX_SLUG_LENGTH)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || generateValidUuid();

  const rawPrice = Number(product.base_price);
  if (!Number.isFinite(rawPrice) || rawPrice < 0) {
    throw new Error('Product price must be a valid non-negative number.');
  }
  const numericPrice = Math.max(0, rawPrice);

  let numericSalePrice: number | null = null;
  if (product.sale_price !== undefined && product.sale_price !== null && String(product.sale_price) !== '') {
    const parsedSale = Number(product.sale_price);
    if (!Number.isFinite(parsedSale) || parsedSale < 0) {
      throw new Error('Original strike-through price must be a valid non-negative number.');
    }
    numericSalePrice = Math.max(0, parsedSale);
  }

  const nowIso = new Date().toISOString();

  let existsInDb = false;
  const candidateId = product.id && isValidUuid(product.id) ? product.id : generateValidUuid();

  if (product.id && isValidUuid(product.id)) {
    const { data: existingRow, error: lookupErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', product.id)
      .maybeSingle();

    if (lookupErr) {
      throw new Error(formatSafeError(lookupErr, 'Database lookup failed.'));
    }
    existsInDb = Boolean(existingRow?.id);
  }

  let finalSlug = baseSlug;
  if (!existsInDb) {
    const { data: slugCollision } = await supabase
      .from('products')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (slugCollision) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const cleanDesc = sanitizeText(product.description, MAX_DESC_LENGTH);
  const cleanShortDesc = sanitizeText(product.short_description || cleanDesc.slice(0, 160), MAX_SHORT_DESC_LENGTH);

  const corePayload = {
    name: cleanName,
    slug: finalSlug,
    short_description: cleanShortDesc,
    description: cleanDesc,
    category_id: product.category_id && isValidUuid(product.category_id) ? product.category_id : null,
    main_image_url: product.main_image_url?.trim() || '',
    base_price: numericPrice,
    sale_price: numericSalePrice,
    currency: 'NGN',
    is_published: product.is_published ?? true,
    is_featured: product.is_featured ?? false,
    is_new_arrival: product.is_new_arrival ?? false,
    updated_at: nowIso,
  };

  const extendedPayload = {
    ...corePayload,
    sku: sanitizeText(product.sku, 80) || null,
    country_of_origin: sanitizeText(product.country_of_origin, 120) || null,
    collection_origin: sanitizeText(product.collection_origin, 120) || null,
    fabric_type: sanitizeText(product.fabric_type, 160) || null,
    fabric_texture: sanitizeText(product.fabric_texture, 160) || null,
    fabric_weight: sanitizeText(product.fabric_weight, 120) || null,
    transparency_lining: sanitizeText(product.transparency_lining, 160) || null,
    care_instructions: sanitizeText(product.care_instructions, 600) || null,
    construction_details: product.construction_details || {},
    whats_included: sanitizeText(product.whats_included, 500) || null,
    sizing_system: product.sizing_system || 'NG',
    fit_type: product.fit_type || 'loose',
    fit_guidance: sanitizeText(product.fit_guidance, 600) || null,
    measurements_unit_note: sanitizeText(product.measurements_unit_note, 240) || 'Garment measurements in centimetres (cm)',
    measurements: product.measurements || {},
    video_url: product.video_url?.trim() || null,
    video_caption: sanitizeText(product.video_caption, 240) || null,
    needs_more_images: Boolean(product.needs_more_images),
    needs_owner_review: Boolean(product.needs_owner_review),
    review_notes: sanitizeText(product.review_notes, 600) || null,
  };

  let schemaUpgradePending = false;

  if (existsInDb) {
    let { data: updatedRow, error: prodErr } = await supabase
      .from('products')
      .update(extendedPayload)
      .eq('id', candidateId)
      .select('id')
      .maybeSingle();

    if (prodErr && isMissingColumnError(prodErr)) {
      schemaUpgradePending = true;
      const retry = await supabase
        .from('products')
        .update(corePayload)
        .eq('id', candidateId)
        .select('id')
        .maybeSingle();
      updatedRow = retry.data;
      prodErr = retry.error;
    }

    if (prodErr) {
      throw new Error(formatSafeError(prodErr, 'Could not save changes to product.'));
    }

    if (!updatedRow?.id) {
      throw new Error(
        'Could not confirm saved changes — no database row was updated. Please verify you are signed in as admin and try again.'
      );
    }
  } else {
    let { data: insertedRow, error: insErr } = await supabase
      .from('products')
      .insert({
        id: candidateId,
        ...extendedPayload,
        is_archived: false,
        deleted_at: null,
        created_at: nowIso,
      })
      .select('id')
      .maybeSingle();

    if (insErr && isMissingColumnError(insErr)) {
      schemaUpgradePending = true;
      const retry = await supabase
        .from('products')
        .insert({
          id: candidateId,
          ...corePayload,
          is_archived: false,
          deleted_at: null,
          created_at: nowIso,
        })
        .select('id')
        .maybeSingle();
      insertedRow = retry.data;
      insErr = retry.error;
    }

    if (insErr) {
      throw new Error(formatSafeError(insErr, 'Could not create product.'));
    }

    if (!insertedRow?.id) {
      throw new Error(
        'Product creation could not be confirmed in the database. Please verify your admin session and try again.'
      );
    }
  }

  // Re-sync product_images cleanly in Supabase
  if (product.images && Array.isArray(product.images)) {
    const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', candidateId);
    if (delImgErr) {
      throw new Error(formatSafeError(delImgErr, 'Could not update product gallery images.'));
    }

    const seenUrls = new Set<string>();
    const uniqueImages = product.images
      .map((img: any) => ({
        url: typeof img === 'string' ? img.trim() : String(img?.image_url || '').trim(),
        alt: typeof img === 'object' ? sanitizeText(img?.alt_text, 200) : undefined,
        id: typeof img === 'object' && isValidUuid(img?.id) ? img.id : generateValidUuid(),
        view_type: typeof img === 'object' ? normalizeViewType(img?.view_type) : 'front',
        colour_tag: typeof img === 'object' ? sanitizeText(img?.colour_tag, 60) || null : null,
        authenticity_label: typeof img === 'object' && img?.authenticity_label
          ? normalizeAuthenticity(img.authenticity_label)
          : 'actual_product',
        caption: typeof img === 'object' ? sanitizeText(img?.caption, 200) || null : null,
        is_primary: typeof img === 'object' ? Boolean(img?.is_primary) : false,
      }))
      .filter((img) => {
        if (!img.url || !isSafeUrl(img.url) || seenUrls.has(img.url)) return false;
        seenUrls.add(img.url);
        return true;
      });

    if (uniqueImages.length > 0) {
      const extendedImages = uniqueImages.map((img, idx) => ({
        id: img.id,
        product_id: candidateId,
        image_url: img.url,
        alt_text: img.alt || `${cleanName} photograph ${idx + 1}`,
        view_type: img.view_type,
        colour_tag: img.colour_tag,
        authenticity_label: img.authenticity_label,
        caption: img.caption,
        is_primary: img.is_primary || img.url === corePayload.main_image_url,
        display_order: idx,
      }));

      let { error: insImgErr } = await supabase.from('product_images').insert(extendedImages);
      if (insImgErr && isMissingColumnError(insImgErr)) {
        schemaUpgradePending = true;
        const basicImages = uniqueImages.map((img, idx) => ({
          id: img.id,
          product_id: candidateId,
          image_url: img.url,
          alt_text: img.alt || `${cleanName} photograph ${idx + 1}`,
          display_order: idx,
        }));
        const retryImg = await supabase.from('product_images').insert(basicImages);
        insImgErr = retryImg.error;
      }

      if (insImgErr) {
        throw new Error(formatSafeError(insImgErr, 'Could not save gallery photographs.'));
      }
    }
  }

  // Re-sync product_variations cleanly
  if (product.variations && Array.isArray(product.variations)) {
    const { data: dbVars, error: fetchVarErr } = await supabase
      .from('product_variations')
      .select('id')
      .eq('product_id', candidateId);

    if (fetchVarErr) {
      throw new Error(formatSafeError(fetchVarErr, 'Could not verify existing variations.'));
    }

    const extendedVars = product.variations.map((v: any, idx: number) => ({
      id: isValidUuid(v.id) ? v.id : generateValidUuid(),
      product_id: candidateId,
      sku:
        sanitizeText(v.sku, 60) ||
        `TC-${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${idx + 1}`,
      size: sanitizeText(v.size, 60) || 'One Size',
      colour: sanitizeText(v.colour, 60) || 'Standard',
      colour_hex: sanitizeText(v.colour_hex, 20) || null,
      image_url: v.image_url && isSafeUrl(v.image_url) ? v.image_url.trim() : null,
      measurements: v.measurements || null,
      stock_quantity: Math.max(0, Math.round(Number(v.stock_quantity) || 0)),
      price_adjustment: Number.isFinite(Number(v.price_adjustment)) ? Number(v.price_adjustment) : 0,
      price_override:
        v.price_override !== null && v.price_override !== undefined && String(v.price_override) !== ''
          ? Math.max(0, Number(v.price_override))
          : null,
      is_active: v.is_active ?? true,
    }));

    const submittedIds = new Set(extendedVars.map((v) => v.id));
    const removedIds = (dbVars || []).map((row: any) => row.id).filter((vid: string) => !submittedIds.has(vid));

    if (removedIds.length > 0) {
      const { error: delVarErr } = await supabase
        .from('product_variations')
        .delete()
        .in('id', removedIds);

      if (delVarErr) {
        throw new Error(formatSafeError(delVarErr, 'Could not remove deleted variations.'));
      }
    }

    if (extendedVars.length > 0) {
      let { error: upsertVarErr } = await supabase
        .from('product_variations')
        .upsert(extendedVars, { onConflict: 'id' });

      if (upsertVarErr && isMissingColumnError(upsertVarErr)) {
        schemaUpgradePending = true;
        const basicVars = extendedVars.map((v) => ({
          id: v.id,
          product_id: v.product_id,
          sku: v.sku,
          size: v.size,
          colour: v.colour,
          stock_quantity: v.stock_quantity,
          price_adjustment: v.price_adjustment,
          is_active: v.is_active,
        }));
        const retryVar = await supabase.from('product_variations').upsert(basicVars, { onConflict: 'id' });
        upsertVarErr = retryVar.error;
      }

      if (upsertVarErr) {
        throw new Error(formatSafeError(upsertVarErr, 'Could not save sizes/colours/stock.'));
      }
    }
  }

  await logAdminAuditEvent(existsInDb ? 'product_updated' : 'product_created', 'product', candidateId, {
    name: cleanName,
    base_price: numericPrice,
    is_published: corePayload.is_published,
    schema_upgrade_pending: schemaUpgradePending,
  });

  const freshProduct = await getProductById(candidateId);
  if (!freshProduct) {
    throw new Error(
      'Save could not be confirmed: the product record could not be reloaded from the database. Please try again.'
    );
  }

  if (
    freshProduct.name.trim() !== cleanName ||
    Math.round(Number(freshProduct.base_price)) !== Math.round(numericPrice)
  ) {
    throw new Error(
      'Save verification mismatch: the database still shows different details than entered. Please retry saving.'
    );
  }

  const savedProduct: SaveProductResult = freshProduct;
  if (schemaUpgradePending) {
    savedProduct.__schemaUpgradePending = true;
  }

  notifyCatalogueUpdated({ productId: savedProduct.id, price: savedProduct.base_price });
  return savedProduct;
};

export const updateProductPrice = async (
  productId: string,
  newPrice: number,
  options: { resetVariationOverrides?: boolean } = {}
): Promise<Product> => {
  const numericPrice = Number(newPrice);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Please provide a valid non-negative numeric price.');
  }

  const roundedTarget = Math.round(numericPrice);
  const nowIso = new Date().toISOString();
  const column = isValidUuid(productId) ? 'id' : 'slug';

  const { data: updatedRow, error } = await supabase
    .from('products')
    .update({
      base_price: numericPrice,
      updated_at: nowIso,
    })
    .eq(column, productId)
    .select('id, base_price')
    .maybeSingle();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not update price in database.'));
  }

  if (!updatedRow?.id) {
    throw new Error(
      'Price change could not be confirmed — zero database rows were updated. Please sign in as admin and try again.'
    );
  }

  // Clear variation overrides/adjustments unless explicitly disabled so storefront prices cannot stay shadowed
  if (options.resetVariationOverrides !== false) {
    let { error: varResetErr } = await supabase
      .from('product_variations')
      .update({ price_adjustment: 0, price_override: null })
      .eq('product_id', updatedRow.id);

    if (varResetErr && isMissingColumnError(varResetErr)) {
      const retryVarReset = await supabase
        .from('product_variations')
        .update({ price_adjustment: 0 })
        .eq('product_id', updatedRow.id);
      varResetErr = retryVarReset.error;
    }

    if (varResetErr) {
      throw new Error(
        formatSafeError(varResetErr, 'Base price updated, but variation prices could not be synchronized.')
      );
    }
  }

  // Re-fetch authoritative full product record and confirm persisted price
  const freshProduct = await getProductById(updatedRow.id);
  if (!freshProduct || Math.round(Number(freshProduct.base_price)) !== roundedTarget) {
    throw new Error(
      'Price save could not be confirmed on re-read from database. Please retry.'
    );
  }

  await logAdminAuditEvent('product_price_updated', 'product', freshProduct.id, {
    name: freshProduct.name,
    new_price: freshProduct.base_price,
  });

  notifyCatalogueUpdated({ productId: freshProduct.id, price: freshProduct.base_price });
  return freshProduct;
};

export const updateProductStatus = async (
  productId: string,
  fields: Partial<Pick<Product, 'is_published' | 'is_featured' | 'is_new_arrival'>>
): Promise<Product> => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('products')
    .update({ ...fields, updated_at: nowIso })
    .eq('id', productId)
    .select('*, product_variations(*), product_images(*)')
    .maybeSingle();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not update product status.'));
  }

  if (!data) {
    throw new Error('Could not confirm status change — verify admin permissions and refresh.');
  }

  const mapped = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_status_updated', 'product', mapped.id, fields);

  notifyCatalogueUpdated({ productId: mapped.id });
  return mapped;
};

// Promotions Management API
export const getActivePromotion = async () => {
  const defaultPromo = {
    title: 'Special Season Offer',
    message: 'Enjoy seasonal bespoke craft across luxury abayas & modest dresses.',
    badge_text: 'Special Season Offer',
    subtext: 'Luxurious Modest Couture • Dispatch Across Nigeria & Diaspora',
    link_url: '/shop',
    is_active: true,
  };

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        link_url: isSafeUrl(data.link_url) ? data.link_url : '/shop',
      };
    }
  } catch {
    // non-fatal promo fallback
  }

  return defaultPromo;
};

export const savePromotion = async (promo: any) => {
  const rawLinkUrl = typeof promo.link_url === 'string' ? promo.link_url.trim() : '/shop';
  if (rawLinkUrl && !isSafeUrl(rawLinkUrl)) {
    throw new Error('Invalid promotion link URL.');
  }

  const payload = {
    title: sanitizeText(promo.title, 120) || 'Special Season Offer',
    message: sanitizeText(promo.message, 300),
    badge_text: sanitizeText(promo.badge_text, 60) || 'PROMO ALERT',
    subtext: sanitizeText(promo.subtext, 240),
    link_url: rawLinkUrl || '/shop',
    is_active: promo.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (promo.id && isValidUuid(promo.id)) {
    const { data, error } = await supabase
      .from('promotions')
      .update(payload)
      .eq('id', promo.id)
      .select()
      .single();

    if (error) throw new Error(formatSafeError(error, 'Could not update promotion.'));
    await logAdminAuditEvent('promotion_updated', 'promotion', data.id, { is_active: payload.is_active });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teefahs_promo_updated', { detail: data }));
    }
    return data;
  } else {
    const { data: existingPromo } = await supabase
      .from('promotions')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPromo?.id) {
      const { data, error } = await supabase
        .from('promotions')
        .update(payload)
        .eq('id', existingPromo.id)
        .select()
        .single();

      if (error) throw new Error(formatSafeError(error, 'Could not update promotion.'));
      await logAdminAuditEvent('promotion_updated', 'promotion', data.id, { is_active: payload.is_active });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teefahs_promo_updated', { detail: data }));
      }
      return data;
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        id: generateValidUuid(),
        ...payload,
      })
      .select()
      .single();

    if (error) throw new Error(formatSafeError(error, 'Could not create promotion.'));
    await logAdminAuditEvent('promotion_created', 'promotion', data.id, { is_active: payload.is_active });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teefahs_promo_updated', { detail: data }));
    }
    return data;
  }
};

// Soft-Delete / Archive product in Supabase
export const archiveProduct = async (id: string, deletedBy?: string): Promise<Product> => {
  const deletedAt = new Date().toISOString();
  let actorLabel = sanitizeText(deletedBy, 120);
  if (!actorLabel) {
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    actorLabel = userData?.user?.email || 'Authenticated Admin';
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      is_published: false,
      is_archived: true,
      deleted_at: deletedAt,
      deleted_by: actorLabel,
      updated_at: deletedAt,
    })
    .eq('id', id)
    .select('*, product_variations(*), product_images(*)')
    .maybeSingle();

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to archive product in database.'));
  }

  if (!data) {
    throw new Error('Could not archive product — verify administrator permissions or refresh the list.');
  }

  const archivedProduct = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_archived', 'product', id, { name: archivedProduct.name });

  notifyCatalogueUpdated({ productId: id, archived: true });
  return archivedProduct;
};

// Restore product from Recently Deleted in Supabase
export const restoreProduct = async (id: string): Promise<Product> => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update({
      is_archived: false,
      deleted_at: null,
      deleted_by: null,
      is_published: true,
      updated_at: nowIso,
    })
    .eq('id', id)
    .select('*, product_variations(*), product_images(*)')
    .maybeSingle();

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to restore product in database.'));
  }

  if (!data) {
    throw new Error('Could not restore product — verify administrator permissions or refresh.');
  }

  const restoredProduct = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_restored', 'product', id, { name: restoredProduct.name });

  notifyCatalogueUpdated({ productId: id, restored: true });
  return restoredProduct;
};

// Permanent Hard Deletion from Supabase
export const permanentlyDeleteProduct = async (id: string): Promise<void> => {
  const { error: varErr } = await supabase.from('product_variations').delete().eq('product_id', id);
  if (varErr) {
    throw new Error(formatSafeError(varErr, 'Could not delete product variations.'));
  }

  const { error: imgErr } = await supabase.from('product_images').delete().eq('product_id', id);
  if (imgErr) {
    throw new Error(formatSafeError(imgErr, 'Could not delete product images.'));
  }

  const { data: deletedRows, error: prodErr } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select('id');

  if (prodErr) {
    if (String((prodErr as any)?.code || '') === '23503') {
      throw new Error(
        'This product is linked to existing customer order records and cannot be permanently deleted. Keep it archived in Recently Deleted instead.'
      );
    }
    throw new Error(formatSafeError(prodErr, 'Could not permanently delete product.'));
  }

  if (!deletedRows || deletedRows.length === 0) {
    throw new Error(
      'Deletion could not be confirmed — zero records were removed. Please verify you are signed in as admin.'
    );
  }

  await logAdminAuditEvent('product_permanently_deleted', 'product', id, {});
  notifyCatalogueUpdated({ productId: id, deleted: true });
};

export const deleteProduct = archiveProduct;

// Categories API — Live Supabase only
export const getActiveCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to load active categories.'));
  }

  return (data || []) as Category[];
};

export const getAllCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order');

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to load categories.'));
  }

  return (data || []) as Category[];
};

export const saveCategory = async (category: Partial<Category>): Promise<Category> => {
  const cleanName = sanitizeText(category.name, 100);
  if (!cleanName) throw new Error('Category name is required.');

  if (category.image_url && !isSafeUrl(category.image_url)) {
    throw new Error('Invalid category cover URL. Only HTTPS, HTTP, or local /assets/ paths are permitted.');
  }

  const payload = {
    name: cleanName,
    slug:
      sanitizeText(category.slug || cleanName, 100)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || generateValidUuid(),
    description: sanitizeText(category.description, 1000),
    image_url: category.image_url?.trim() || '',
    display_order: Math.max(0, Number(category.display_order) || 1),
    is_active: category.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  let savedRow: Category;

  if (category.id && isValidUuid(category.id)) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', category.id)
      .select()
      .single();

    if (error) {
      throw new Error(formatSafeError(error, 'Could not update category.'));
    }
    savedRow = data as Category;
    await logAdminAuditEvent('category_updated', 'category', savedRow.id, { name: savedRow.name });
  } else {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        id: generateValidUuid(),
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(formatSafeError(error, 'Could not create category.'));
    }
    savedRow = data as Category;
    await logAdminAuditEvent('category_created', 'category', savedRow.id, { name: savedRow.name });
  }

  notifyCatalogueUpdated({ categoryId: savedRow.id });
  return savedRow;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { data: deletedCats, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) {
    throw new Error(formatSafeError(error, 'Could not delete category.'));
  }
  if (!deletedCats || deletedCats.length === 0) {
    throw new Error('Could not confirm category deletion — zero rows were removed. Verify admin access.');
  }
  await logAdminAuditEvent('category_deleted', 'category', id, {});
  notifyCatalogueUpdated({ categoryId: id, categoryDeleted: true });
};

// Inventory & Variations API
export const updateVariationStock = async (variationId: string, quantity: number) => {
  const rawQty = Number(quantity);
  if (!Number.isFinite(rawQty) || rawQty < 0) {
    throw new Error('Stock quantity must be a valid non-negative integer.');
  }
  const cleanQty = Math.max(0, Math.round(rawQty));

  const { data, error } = await supabase
    .from('product_variations')
    .update({ stock_quantity: cleanQty, updated_at: new Date().toISOString() })
    .eq('id', variationId)
    .select()
    .single();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not update stock in database.'));
  }

  await logAdminAuditEvent('variation_stock_updated', 'product_variation', variationId, { stock_quantity: cleanQty });
  notifyCatalogueUpdated({ variationId, stockQuantity: cleanQty });
  return data;
};

export const upsertProductVariations = async (variations: ProductVariation[]) => {
  const { error } = await supabase.from('product_variations').upsert(variations, { onConflict: 'id' });
  if (error) {
    throw new Error(formatSafeError(error, 'Could not save variations.'));
  }
  notifyCatalogueUpdated({ variationsUpdated: true });
};

const verifyImageMagicBytes = async (file: File): Promise<boolean> => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
};

// Image Upload API
export const uploadProductImage = async (file: File): Promise<string> => {
  const mimeType = (file.type || '').toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new Error('Only JPG, PNG, and WebP photographs are allowed (SVG and scriptable files are blocked).');
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image size must be between 1 byte and 15MB.');
  }

  const hasValidSignature = await verifyImageMagicBytes(file);
  if (!hasValidSignature) {
    throw new Error('Selected file signature does not match a valid JPG, PNG, or WebP photograph.');
  }

  const compressedBlob: Blob = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as a valid image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1400;
          const MAX_HEIGHT = 1800;
          let width = img.width;
          let height = img.height;

          if (!width || !height) {
            reject(new Error('Invalid image dimensions.'));
            return;
          }

          if (width > height && width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else if (height >= width && height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Browser image processor unavailable; raw upload blocked for security.'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size <= MAX_PROCESSED_BYTES) {
                resolve(blob);
              } else if (blob) {
                reject(new Error('Processed image exceeds 5MB limit. Please choose a smaller image.'));
              } else {
                reject(new Error('Could not re-encode photograph cleanly.'));
              }
            },
            'image/jpeg',
            0.85
          );
        } catch {
          reject(new Error('Image sanitization failed.'));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });

  const fileName = `${Date.now()}-${generateValidUuid().slice(0, 8)}.jpg`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(formatSafeError(uploadError, 'Storage upload failed. Please ensure you are signed in as admin.'));
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded image.');
  }

  await logAdminAuditEvent('media_uploaded', 'storage_object', filePath, { size_bytes: compressedBlob.size });
  return data.publicUrl;
};

// Optional Product Video Upload (MP4, WebM, MOV <= 30MB)
export const uploadProductVideo = async (file: File): Promise<string> => {
  const mimeType = (file.type || '').toLowerCase();
  if (!ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    throw new Error('Only MP4, WebM, or QuickTime (MOV) videos are supported.');
  }
  if (file.size <= 0 || file.size > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error('Product video size must be 30MB or less.');
  }

  const ext = mimeType === 'video/webm' ? 'webm' : mimeType === 'video/quicktime' ? 'mov' : 'mp4';
  const filePath = `videos/${Date.now()}-${generateValidUuid().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      formatSafeError(
        uploadError,
        'Video upload failed. Ensure database/ecommerce-transformation-migration.sql is applied and you are signed in as admin.'
      )
    );
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded video.');
  }

  await logAdminAuditEvent('video_uploaded', 'storage_object', filePath, { size_bytes: file.size, mime: mimeType });
  return data.publicUrl;
};
