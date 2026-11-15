import { supabase } from './supabase';
import { Product, Category, ProductVariation } from '../types/product';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/initialCatalogue';

const LOCAL_PRODUCTS_KEY = 'teefahs_products_v13_authoritative';
const LOCAL_CATEGORIES_KEY = 'teefahs_categories_v13_authoritative';
const RECENTLY_DELETED_KEY = 'teefahs_recently_deleted_v13';
const LEGACY_STORAGE_KEYS = [
  'teefahs_products_v12_covers',
  'teefahs_categories_v12_covers',
  'teefahs_recently_deleted_products_v1',
];

// Clean up stale legacy cache keys once so old phantom items never resurface
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  LEGACY_STORAGE_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

const MAX_NAME_LENGTH = 180;
const MAX_SLUG_LENGTH = 140;
const MAX_SHORT_DESC_LENGTH = 300;
const MAX_DESC_LENGTH = 5000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PROCESSED_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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

export const logAdminAuditEvent = async (
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const actor = userData?.user;
    if (!actor) return;

    await supabase.from('admin_audit_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email || 'unknown',
      action: sanitizeText(action, 80),
      target_type: sanitizeText(targetType, 60),
      target_id: sanitizeText(targetId, 120),
      details,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    });
  } catch {
    // Non-blocking: admin_audit_logs table is provisioned via database/security-hardening.sql
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
  dataSource: 'supabase' | 'catalogue_fallback';
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
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
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

const setLocalStoredProducts = (products: Product[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore storage quota errors
  }
};

const getLocalStoredProducts = (): Product[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_PRODUCTS;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to seed
  }
  return INITIAL_PRODUCTS;
};

const setLocalStoredCategories = (categories: Category[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    // ignore storage quota errors
  }
};

const getLocalStoredCategories = (): Category[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_CATEGORIES;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to seed
  }
  return INITIAL_CATEGORIES;
};

export const getRecentlyDeletedProducts = (): Product[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTLY_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
};

export const setRecentlyDeletedProducts = (products: Product[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RECENTLY_DELETED_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
};

const mapSupabaseProduct = (p: any): Product => {
  const sortedImages = Array.isArray(p.product_images)
    ? [...p.product_images]
        .filter((img: any) => isSafeUrl(typeof img === 'string' ? img : img?.image_url))
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];
  const variations = Array.isArray(p.product_variations) ? p.product_variations : [];
  const basePrice = p.base_price !== null && p.base_price !== undefined ? Number(p.base_price) : 0;
  const salePrice = p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : undefined;
  const safeMainImg = isSafeUrl(p.main_image_url) ? p.main_image_url : '';

  return {
    ...p,
    base_price: Number.isFinite(basePrice) ? basePrice : 0,
    sale_price: salePrice !== undefined && Number.isFinite(salePrice) ? salePrice : undefined,
    name: p.name || '',
    slug: p.slug || '',
    description: p.description || '',
    short_description: p.short_description || '',
    main_image_url: safeMainImg || sortedImages[0]?.image_url || '',
    currency: p.currency || 'NGN',
    is_published: Boolean(p.is_published),
    is_featured: Boolean(p.is_featured),
    is_new_arrival: Boolean(p.is_new_arrival),
    is_archived: Boolean(p.is_archived),
    deleted_at: p.deleted_at || null,
    deleted_by: p.deleted_by || undefined,
    variations,
    images: sortedImages,
    additionalImages: sortedImages
      .map((img: any) => (typeof img === 'string' ? img : img.image_url))
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
        dataSource: 'catalogue_fallback',
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
      dataSource: isPopulated ? 'supabase' : 'catalogue_fallback',
    };
  } catch {
    return {
      status: 'connection_error',
      errorDetails: 'Network connectivity error',
      counts: { categories: 0, products: 0, images: 0, variations: 0, totalStock: 0 },
      isPopulated: false,
      dataSource: 'catalogue_fallback',
    };
  }
};

// Products API (Authoritative Supabase reads; invalidate stale cache on DB success)
export const getPublishedProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq('is_published', true)
      .or('is_archived.is.null,is_archived.eq.false')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || [])
      .filter((p: any) => !p.is_archived && !p.deleted_at)
      .map(mapSupabaseProduct);

    setLocalStoredProducts(mapped);
    return mapped;
  } catch {
    return getLocalStoredProducts().filter(p => p.is_published && !p.is_archived && !p.deleted_at);
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .or('is_archived.is.null,is_archived.eq.false')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || [])
      .filter((p: any) => !p.is_archived && !p.deleted_at)
      .map(mapSupabaseProduct);

    setLocalStoredProducts(mapped);
    return mapped;
  } catch {
    return getLocalStoredProducts().filter(p => !p.is_archived && !p.deleted_at);
  }
};

export const getArchivedProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .or('is_archived.eq.true,deleted_at.not.is.null')
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(mapSupabaseProduct);
    setRecentlyDeletedProducts(mapped);
    return mapped;
  } catch {
    return getRecentlyDeletedProducts();
  }
};

export const getProductById = async (idOrSlug: string): Promise<Product | null> => {
  const cleaned = sanitizeText(idOrSlug, MAX_SLUG_LENGTH);
  if (!cleaned) return null;

  try {
    const column = isValidUuid(cleaned) ? 'id' : 'slug';
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq(column, cleaned)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return mapSupabaseProduct(data);
    }
    return null;
  } catch {
    const cached = getLocalStoredProducts();
    return cached.find(p => p.id === cleaned || p.slug === cleaned) || null;
  }
};

export const saveProduct = async (product: Partial<Product>): Promise<Product> => {
  const cleanName = sanitizeText(product.name, MAX_NAME_LENGTH);
  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  if (product.main_image_url && !isSafeUrl(product.main_image_url)) {
    throw new Error('Invalid main image URL protocol. Only HTTPS, HTTP, or local /assets/ paths are permitted.');
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

  // Verify whether this product already exists in Supabase
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

  // Ensure slug uniqueness when inserting a brand-new product
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

  const dbPayload = {
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

  if (existsInDb) {
    const { error: prodErr } = await supabase
      .from('products')
      .update(dbPayload)
      .eq('id', candidateId);

    if (prodErr) {
      throw new Error(formatSafeError(prodErr, 'Could not update garment.'));
    }
  } else {
    const { error: insErr } = await supabase.from('products').insert({
      id: candidateId,
      ...dbPayload,
      is_archived: false,
      deleted_at: null,
      created_at: nowIso,
    });

    if (insErr) {
      throw new Error(formatSafeError(insErr, 'Could not create garment.'));
    }
  }

  // Re-sync product_images cleanly in Supabase
  if (product.images && Array.isArray(product.images)) {
    const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', candidateId);
    if (delImgErr) {
      throw new Error(formatSafeError(delImgErr, 'Could not update product gallery images.'));
    }

    const uniqueImages = product.images
      .map((img: any) => ({
        url: typeof img === 'string' ? img.trim() : String(img?.image_url || '').trim(),
        alt: typeof img === 'object' ? sanitizeText(img?.alt_text, 200) : undefined,
        id: typeof img === 'object' && isValidUuid(img?.id) ? img.id : generateValidUuid(),
      }))
      .filter((img) => Boolean(img.url) && isSafeUrl(img.url));

    if (uniqueImages.length > 0) {
      const formattedImages = uniqueImages.map((img, idx) => ({
        id: img.id,
        product_id: candidateId,
        image_url: img.url,
        alt_text: img.alt || `${cleanName} photograph ${idx + 1}`,
        display_order: idx,
      }));

      const { error: insImgErr } = await supabase.from('product_images').insert(formattedImages);
      if (insImgErr) {
        throw new Error(formatSafeError(insImgErr, 'Could not save gallery photographs.'));
      }
    }
  }

  // Re-sync product_variations cleanly (delete removed variations, upsert current ones)
  if (product.variations && Array.isArray(product.variations)) {
    const { data: dbVars, error: fetchVarErr } = await supabase
      .from('product_variations')
      .select('id')
      .eq('product_id', candidateId);

    if (fetchVarErr) {
      throw new Error(formatSafeError(fetchVarErr, 'Could not verify existing variations.'));
    }

    const formattedVars = product.variations.map((v: any, idx: number) => ({
      id: isValidUuid(v.id) ? v.id : generateValidUuid(),
      product_id: candidateId,
      sku:
        sanitizeText(v.sku, 60) ||
        `TC-${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${idx + 1}`,
      size: sanitizeText(v.size, 60) || 'One Size',
      colour: sanitizeText(v.colour, 60) || 'Standard',
      stock_quantity: Math.max(0, Math.round(Number(v.stock_quantity) || 0)),
      price_adjustment: Number.isFinite(Number(v.price_adjustment)) ? Number(v.price_adjustment) : 0,
      is_active: v.is_active ?? true,
    }));

    const submittedIds = new Set(formattedVars.map(v => v.id));
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

    if (formattedVars.length > 0) {
      const { error: upsertVarErr } = await supabase
        .from('product_variations')
        .upsert(formattedVars, { onConflict: 'id' });

      if (upsertVarErr) {
        throw new Error(formatSafeError(upsertVarErr, 'Could not save sizes/colours/stock.'));
      }
    }
  }

  await logAdminAuditEvent(existsInDb ? 'product_updated' : 'product_created', 'product', candidateId, {
    name: cleanName,
    base_price: numericPrice,
    is_published: dbPayload.is_published,
  });

  const freshProduct = await getProductById(candidateId);
  const current = getLocalStoredProducts();
  const savedProduct =
    freshProduct ||
    ({
      ...product,
      id: candidateId,
      ...dbPayload,
      variations: product.variations || [],
      images: product.images || [],
    } as Product);

  const updatedCache = current.some(p => p.id === candidateId)
    ? current.map(p => (p.id === candidateId ? savedProduct : p))
    : [savedProduct, ...current];
  setLocalStoredProducts(updatedCache);

  notifyCatalogueUpdated({ productId: savedProduct.id });
  return savedProduct;
};

export const updateProductPrice = async (productId: string, newPrice: number): Promise<Product> => {
  const numericPrice = Number(newPrice);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Please provide a valid non-negative numeric price.');
  }

  const nowIso = new Date().toISOString();
  const column = isValidUuid(productId) ? 'id' : 'slug';

  const { data: updatedRow, error } = await supabase
    .from('products')
    .update({
      base_price: numericPrice,
      updated_at: nowIso,
    })
    .eq(column, productId)
    .select('*, product_variations(*), product_images(*)')
    .single();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not update price in database.'));
  }

  const mapped = mapSupabaseProduct(updatedRow);
  await logAdminAuditEvent('product_price_updated', 'product', mapped.id, {
    name: mapped.name,
    new_price: numericPrice,
  });

  const current = getLocalStoredProducts();
  const nextCache = current.some(p => p.id === mapped.id)
    ? current.map(p => (p.id === mapped.id ? mapped : p))
    : [mapped, ...current];
  setLocalStoredProducts(nextCache);

  notifyCatalogueUpdated({ productId: mapped.id, price: numericPrice });
  return mapped;
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
    .single();

  if (error) {
    throw new Error(formatSafeError(error, 'Could not update product status.'));
  }

  const mapped = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_status_updated', 'product', mapped.id, fields);

  const current = getLocalStoredProducts();
  setLocalStoredProducts(current.map(p => (p.id === mapped.id ? mapped : p)));
  notifyCatalogueUpdated({ productId: mapped.id });
  return mapped;
};

// Promotions Management API
export const getActivePromotion = async () => {
  const defaultPromo = {
    title: 'Special Season Offer',
    message: 'Enjoy seasonal bespoke craft across luxury abayas & modest dresses.',
    badge_text: 'Special Season Offer',
    subtext: 'Luxurious Modest Couture • Express Delivery Across Nigeria',
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
    // use default fallback
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
    .single();

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to delete garment in database.'));
  }

  const archivedProduct = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_archived', 'product', id, { name: archivedProduct.name });

  setLocalStoredProducts(getLocalStoredProducts().filter(p => p.id !== id));
  const deletedList = getRecentlyDeletedProducts().filter(p => p.id !== id);
  setRecentlyDeletedProducts([archivedProduct, ...deletedList]);

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
    .single();

  if (error) {
    throw new Error(formatSafeError(error, 'Failed to restore garment in database.'));
  }

  const restoredProduct = mapSupabaseProduct(data);
  await logAdminAuditEvent('product_restored', 'product', id, { name: restoredProduct.name });

  setRecentlyDeletedProducts(getRecentlyDeletedProducts().filter(p => p.id !== id));
  const current = getLocalStoredProducts().filter(p => p.id !== id);
  setLocalStoredProducts([restoredProduct, ...current]);

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

  const { error: prodErr } = await supabase.from('products').delete().eq('id', id);
  if (prodErr) {
    throw new Error(formatSafeError(prodErr, 'Could not permanently delete garment.'));
  }

  await logAdminAuditEvent('product_permanently_deleted', 'product', id, {});

  setRecentlyDeletedProducts(getRecentlyDeletedProducts().filter(p => p.id !== id));
  setLocalStoredProducts(getLocalStoredProducts().filter(p => p.id !== id));

  notifyCatalogueUpdated({ productId: id, deleted: true });
};

export const deleteProduct = archiveProduct;

// Categories API (No hardcoded image overrides)
export const getActiveCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    const list = (data || []) as Category[];
    setLocalStoredCategories(list);
    return list;
  } catch {
    return getLocalStoredCategories().filter(c => c.is_active);
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order');

    if (error) throw error;

    const list = (data || []) as Category[];
    setLocalStoredCategories(list);
    return list;
  } catch {
    return getLocalStoredCategories();
  }
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

  const current = getLocalStoredCategories();
  const next = current.some(c => c.id === savedRow.id)
    ? current.map(c => (c.id === savedRow.id ? savedRow : c))
    : [...current, savedRow];
  setLocalStoredCategories(next);

  notifyCatalogueUpdated({ categoryId: savedRow.id });
  return savedRow;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    throw new Error(formatSafeError(error, 'Could not delete category.'));
  }
  await logAdminAuditEvent('category_deleted', 'category', id, {});
  setLocalStoredCategories(getLocalStoredCategories().filter(c => c.id !== id));
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

  const products = getLocalStoredProducts();
  const updatedProds = products.map(p => ({
    ...p,
    variations: (p.variations || []).map(v =>
      v.id === variationId ? { ...v, stock_quantity: cleanQty } : v
    ),
  }));
  setLocalStoredProducts(updatedProds);

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
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
};

// Image Upload API — validates MIME & magic bytes, re-encodes to sanitized JPEG, and fails loudly on errors
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
