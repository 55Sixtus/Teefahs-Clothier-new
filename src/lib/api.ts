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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  } catch (e) {
    console.error('Error saving product cache:', e);
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
  } catch (e) {
    console.error('Error reading product cache:', e);
  }
  return INITIAL_PRODUCTS;
};

const setLocalStoredCategories = (categories: Category[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving category cache:', e);
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
  } catch (e) {
    console.error('Error reading category cache:', e);
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
  } catch (e) {
    console.error('Error reading deleted cache:', e);
  }
  return [];
};

export const setRecentlyDeletedProducts = (products: Product[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RECENTLY_DELETED_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving deleted cache:', e);
  }
};

const mapSupabaseProduct = (p: any): Product => {
  const sortedImages = Array.isArray(p.product_images)
    ? [...p.product_images].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];
  const variations = Array.isArray(p.product_variations) ? p.product_variations : [];
  const basePrice = p.base_price !== null && p.base_price !== undefined ? Number(p.base_price) : 0;
  const salePrice = p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : undefined;

  return {
    ...p,
    base_price: basePrice,
    sale_price: salePrice,
    name: p.name || '',
    slug: p.slug || '',
    description: p.description || '',
    short_description: p.short_description || '',
    main_image_url: p.main_image_url || sortedImages[0]?.image_url || '',
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
      .filter((url: string) => Boolean(url) && url !== p.main_image_url),
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
        errorDetails: err?.message || 'Database error',
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
  } catch (err: any) {
    return {
      status: 'connection_error',
      errorDetails: err?.message || 'Network connectivity error',
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

    // Replace cache with authoritative published DB list (merge carefully only if needed; keep clean)
    setLocalStoredProducts(mapped);
    return mapped;
  } catch (e) {
    console.warn('Supabase getPublishedProducts failed, falling back to local cache:', e);
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
  } catch (e) {
    console.warn('Supabase getAllProducts failed, falling back to local cache:', e);
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
  } catch (e) {
    console.warn('Supabase getArchivedProducts failed, using local deleted cache:', e);
    return getRecentlyDeletedProducts();
  }
};

export const getProductById = async (idOrSlug: string): Promise<Product | null> => {
  if (!idOrSlug) return null;

  try {
    const column = isValidUuid(idOrSlug) ? 'id' : 'slug';
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq(column, idOrSlug)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return mapSupabaseProduct(data);
    }
    return null;
  } catch (e) {
    console.warn('Supabase getProductById error, checking cache:', e);
    const cached = getLocalStoredProducts();
    return cached.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
  }
};

export const saveProduct = async (product: Partial<Product>): Promise<Product> => {
  const cleanName = (product.name || '').trim();
  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  const baseSlug = (product.slug || cleanName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || generateValidUuid();

  const numericPrice = Math.max(0, Number(product.base_price) || 0);
  const numericSalePrice =
    product.sale_price !== undefined && product.sale_price !== null && String(product.sale_price) !== ''
      ? Math.max(0, Number(product.sale_price))
      : null;

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
      throw new Error(`Database lookup failed: ${lookupErr.message}`);
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

  const dbPayload = {
    name: cleanName,
    slug: finalSlug,
    short_description: (product.short_description || product.description?.slice(0, 160) || '').trim(),
    description: (product.description || '').trim(),
    category_id: product.category_id || null,
    main_image_url: product.main_image_url || '',
    base_price: numericPrice,
    sale_price: numericSalePrice,
    currency: product.currency || 'NGN',
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
      throw new Error(`Could not update garment: ${prodErr.message}`);
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
      throw new Error(`Could not create garment: ${insErr.message}`);
    }
  }

  // Re-sync product_images cleanly in Supabase
  if (product.images && Array.isArray(product.images)) {
    const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', candidateId);
    if (delImgErr) {
      throw new Error(`Could not update product gallery images: ${delImgErr.message}`);
    }

    const uniqueImages = product.images
      .map((img: any) => ({
        url: typeof img === 'string' ? img : img?.image_url,
        alt: typeof img === 'object' ? img?.alt_text : undefined,
        id: typeof img === 'object' && isValidUuid(img?.id) ? img.id : generateValidUuid(),
      }))
      .filter((img) => Boolean(img.url));

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
        throw new Error(`Could not save gallery photographs: ${insImgErr.message}`);
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
      throw new Error(`Could not verify existing variations: ${fetchVarErr.message}`);
    }

    const formattedVars = product.variations.map((v: any, idx: number) => ({
      id: isValidUuid(v.id) ? v.id : generateValidUuid(),
      product_id: candidateId,
      sku: v.sku || `TC-${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${idx + 1}`,
      size: v.size || 'One Size',
      colour: v.colour || 'Standard',
      stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
      price_adjustment: Number(v.price_adjustment) || 0,
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
        throw new Error(`Could not remove deleted variations: ${delVarErr.message}`);
      }
    }

    if (formattedVars.length > 0) {
      const { error: upsertVarErr } = await supabase
        .from('product_variations')
        .upsert(formattedVars, { onConflict: 'id' });

      if (upsertVarErr) {
        throw new Error(`Could not save sizes/colours/stock: ${upsertVarErr.message}`);
      }
    }
  }

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
  const numericPrice = Math.max(0, Number(newPrice));
  if (isNaN(numericPrice)) {
    throw new Error('Please provide a valid numeric price.');
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
    throw new Error(`Database error: ${error.message || 'Could not update price in database'}`);
  }

  const mapped = mapSupabaseProduct(updatedRow);
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
    throw new Error(`Could not update product status: ${error.message}`);
  }

  const mapped = mapSupabaseProduct(data);
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
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch promotions from Supabase, using default fallback:', err);
  }

  return defaultPromo;
};

export const savePromotion = async (promo: any) => {
  const payload = {
    title: promo.title || 'Special Season Offer',
    message: promo.message || '',
    badge_text: promo.badge_text || 'PROMO ALERT',
    subtext: promo.subtext || '',
    link_url: promo.link_url || '/shop',
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

    if (error) throw new Error(error.message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teefahs_promo_updated', { detail: data }));
    }
    return data;
  } else {
    // Check if any promotion row exists to update instead of duplicating rows
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

      if (error) throw new Error(error.message);
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

    if (error) throw new Error(error.message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teefahs_promo_updated', { detail: data }));
    }
    return data;
  }
};

// Soft-Delete / Archive product in Supabase
export const archiveProduct = async (id: string, deletedBy = 'Queen Lateefah'): Promise<Product> => {
  const deletedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update({
      is_published: false,
      is_archived: true,
      deleted_at: deletedAt,
      deleted_by: deletedBy,
      updated_at: deletedAt,
    })
    .eq('id', id)
    .select('*, product_variations(*), product_images(*)')
    .single();

  if (error) {
    throw new Error(`Failed to delete garment in database: ${error.message}`);
  }

  const archivedProduct = mapSupabaseProduct(data);

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
    throw new Error(`Failed to restore garment in database: ${error.message}`);
  }

  const restoredProduct = mapSupabaseProduct(data);

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
    throw new Error(`Could not delete product variations: ${varErr.message}`);
  }

  const { error: imgErr } = await supabase.from('product_images').delete().eq('product_id', id);
  if (imgErr) {
    throw new Error(`Could not delete product images: ${imgErr.message}`);
  }

  const { error: prodErr } = await supabase.from('products').delete().eq('id', id);
  if (prodErr) {
    throw new Error(`Could not permanently delete garment: ${prodErr.message}`);
  }

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
  } catch (e) {
    console.warn('Supabase categories error, using cache:', e);
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
  } catch (e) {
    console.warn('Supabase getAllCategories error, using cache:', e);
    return getLocalStoredCategories();
  }
};

export const saveCategory = async (category: Partial<Category>): Promise<Category> => {
  const cleanName = (category.name || '').trim();
  if (!cleanName) throw new Error('Category name is required.');

  const payload = {
    name: cleanName,
    slug:
      (category.slug || cleanName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || generateValidUuid(),
    description: category.description || '',
    image_url: category.image_url || '',
    display_order: Number(category.display_order) || 1,
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
      throw new Error(`Could not update category: ${error.message}`);
    }
    savedRow = data as Category;
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
      throw new Error(`Could not create category: ${error.message}`);
    }
    savedRow = data as Category;
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
    throw new Error(`Could not delete category: ${error.message}`);
  }
  setLocalStoredCategories(getLocalStoredCategories().filter(c => c.id !== id));
  notifyCatalogueUpdated({ categoryId: id, categoryDeleted: true });
};

// Inventory & Variations API
export const updateVariationStock = async (variationId: string, quantity: number) => {
  const cleanQty = Math.max(0, Math.round(Number(quantity) || 0));

  const { data, error } = await supabase
    .from('product_variations')
    .update({ stock_quantity: cleanQty, updated_at: new Date().toISOString() })
    .eq('id', variationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Could not update stock in database: ${error.message}`);
  }

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
    throw new Error(`Could not save variations: ${error.message}`);
  }
  notifyCatalogueUpdated({ variationsUpdated: true });
};

// Image Upload API — uploads compressed JPEG to Supabase Storage and fails loudly on storage/auth errors
export const uploadProductImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, WebP, HEIC).');
  }

  if (file.size > 30 * 1024 * 1024) {
    throw new Error('Image size must be less than 30MB.');
  }

  const compressedBlob: Blob = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1400;
          const MAX_HEIGHT = 1800;
          let width = img.width;
          let height = img.height;

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
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            'image/jpeg',
            0.85
          );
        } catch {
          resolve(file);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, compressedBlob, {
      contentType: compressedBlob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}. Please ensure you are signed in as admin.`);
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded image.');
  }

  return data.publicUrl;
};
