import { supabase } from './supabase';
import { Product, Category, ProductVariation } from '../types/product';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/initialCatalogue';

// Local storage keys for caching and optimistic updates
const LOCAL_PRODUCTS_KEY = 'teefahs_products_v7_clean_uuid';
const LOCAL_CATEGORIES_KEY = 'teefahs_categories_v7_clean_uuid';

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

export const getDatabaseDiagnostics = async (): Promise<DatabaseDiagnostics> => {
  try {
    const [catRes, prodRes, imgRes, varRes] = await Promise.all([
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
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

    // Determine status
    let status: DatabaseDiagnostics['status'];
    const isPopulated = prodCount > 0 && catCount > 0;

    if (prodCount >= 11 && catCount >= 8 && imgCount >= 54 && varCount >= 27) {
      status = 'fully_synchronized';
    } else if (prodCount > 0 || catCount > 0 || imgCount > 0 || varCount > 0) {
      status = 'partially_populated';
    } else {
      status = 'connected_empty';
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

const getLocalStoredProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].main_image_url) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading local products:', e);
  }
  return INITIAL_PRODUCTS;
};

const setLocalStoredProducts = (products: Product[]) => {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving local products:', e);
  }
};

const getLocalStoredCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].image_url) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading local categories:', e);
  }
  return INITIAL_CATEGORIES;
};

const setLocalStoredCategories = (categories: Category[]) => {
  try {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving local categories:', e);
  }
};

// Helper to generate valid RFC 4122 v4 hexadecimal UUIDs
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

const isValidUuid = (id?: string): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Storage key for soft-deleted / archived products
const RECENTLY_DELETED_KEY = 'teefahs_recently_deleted_products_v1';

export const getRecentlyDeletedProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(RECENTLY_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading recently deleted products:', e);
  }
  return [];
};

export const setRecentlyDeletedProducts = (products: Product[]) => {
  try {
    localStorage.setItem(RECENTLY_DELETED_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving recently deleted products:', e);
  }
};

// Products API
export const getPublishedProducts = async (): Promise<Product[]> => {
  const local = getLocalStoredProducts();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq('is_published', true);

    if (!error && data && data.length > 0) {
      const dbIds = new Set(data.map((p: any) => p.id));
      const localOnly = local.filter(p => !dbIds.has(p.id) && p.is_published && !p.is_archived && !p.deleted_at);

      const mapped = data
        .filter((p: any) => !p.is_archived && !p.deleted_at)
        .map((p: any) => {
          const localMatch = local.find(lp => lp.id === p.id);
          return {
            ...p,
            base_price: localMatch?.base_price ?? p.base_price,
            sale_price: localMatch?.sale_price !== undefined ? localMatch.sale_price : p.sale_price,
            name: localMatch?.name ?? p.name,
            description: localMatch?.description ?? p.description,
            short_description: localMatch?.short_description ?? p.short_description,
            main_image_url: localMatch?.main_image_url ?? p.main_image_url,
            is_published: localMatch?.is_published ?? p.is_published,
            is_featured: localMatch?.is_featured ?? p.is_featured,
            is_new_arrival: localMatch?.is_new_arrival ?? p.is_new_arrival,
            variations: localMatch?.variations?.length ? localMatch.variations : (p.product_variations || []),
            images: localMatch?.images?.length ? localMatch.images : (p.product_images || []),
          };
        });

      const combined = [...mapped, ...localOnly];
      return combined as Product[];
    }
  } catch (e) {
    console.warn('Supabase query error, using catalogue cache:', e);
  }

  // Fallback to active catalogued products excluding archived
  return local.filter(p => p.is_published && !p.is_archived && !p.deleted_at);
};

export const getAllProducts = async (): Promise<Product[]> => {
  const local = getLocalStoredProducts();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)');

    if (!error && data && data.length > 0) {
      const dbIds = new Set(data.map((p: any) => p.id));
      const localOnly = local.filter(p => !dbIds.has(p.id) && !p.is_archived && !p.deleted_at);

      const mapped = data
        .filter((p: any) => !p.is_archived && !p.deleted_at)
        .map((p: any) => {
          const localMatch = local.find(lp => lp.id === p.id);
          return {
            ...p,
            base_price: localMatch?.base_price ?? p.base_price,
            sale_price: localMatch?.sale_price !== undefined ? localMatch.sale_price : p.sale_price,
            name: localMatch?.name ?? p.name,
            description: localMatch?.description ?? p.description,
            short_description: localMatch?.short_description ?? p.short_description,
            main_image_url: localMatch?.main_image_url ?? p.main_image_url,
            is_published: localMatch?.is_published ?? p.is_published,
            is_featured: localMatch?.is_featured ?? p.is_featured,
            is_new_arrival: localMatch?.is_new_arrival ?? p.is_new_arrival,
            variations: localMatch?.variations?.length ? localMatch.variations : (p.product_variations || []),
            images: localMatch?.images?.length ? localMatch.images : (p.product_images || []),
          };
        });

      const combined = [...mapped, ...localOnly];
      return combined as Product[];
    }
  } catch (e) {
    console.warn('Supabase getAllProducts query error, using catalogue cache:', e);
  }

  return local.filter(p => !p.is_archived && !p.deleted_at);
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq('id', id)
      .single();

    if (!error && data) {
      return {
        ...data,
        variations: data.product_variations || [],
        images: data.product_images || [],
      } as Product;
    }
  } catch (e) {
    console.warn('Supabase getProductById error, checking cache:', e);
  }

  const cached = getLocalStoredProducts();
  return cached.find(p => p.id === id) || null;
};

export const saveProduct = async (product: Partial<Product>): Promise<Product> => {
  const current = getLocalStoredProducts();
  let savedProduct: Product;
  const isEditing = !!product.id && current.some(p => p.id === product.id);

  if (isEditing && product.id) {
    // 1. Update existing product in state
    const existing = current.find(p => p.id === product.id)!;
    savedProduct = {
      ...existing,
      ...product,
      variations: product.variations ?? existing.variations ?? [],
      images: product.images ?? existing.images ?? [],
    } as Product;

    const updated = current.map(p => p.id === product.id ? savedProduct : p);
    setLocalStoredProducts(updated);

    // 2. Sync to Supabase
    try {
      const dbPayload = {
        name: savedProduct.name,
        slug: savedProduct.slug || savedProduct.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        short_description: savedProduct.short_description || savedProduct.description?.slice(0, 160) || '',
        description: savedProduct.description || '',
        category_id: savedProduct.category_id,
        main_image_url: savedProduct.main_image_url,
        base_price: savedProduct.base_price,
        sale_price: savedProduct.sale_price !== undefined ? savedProduct.sale_price : null,
        currency: savedProduct.currency || 'NGN',
        is_published: savedProduct.is_published ?? true,
        is_featured: savedProduct.is_featured ?? false,
        is_new_arrival: savedProduct.is_new_arrival ?? false,
        updated_at: new Date().toISOString(),
      };

      const { error: prodErr } = await supabase.from('products').update(dbPayload).eq('id', product.id);
      if (prodErr) {
        console.warn('Supabase product update error:', prodErr.message);
      }

      // Sync product images to Supabase if provided
      if (savedProduct.images && Array.isArray(savedProduct.images)) {
        try {
          const formattedImages = savedProduct.images.map((img: any, idx: number) => ({
            id: isValidUuid(img.id) ? img.id : generateValidUuid(),
            product_id: product.id,
            image_url: typeof img === 'string' ? img : img.image_url,
            alt_text: (typeof img === 'object' && img.alt_text) ? img.alt_text : `${savedProduct.name} photograph ${idx + 1}`,
            display_order: idx,
          }));

          // Re-sync images for this product
          await supabase.from('product_images').delete().eq('product_id', product.id);
          await supabase.from('product_images').insert(formattedImages);
        } catch (imgErr) {
          console.warn('Could not sync product images to Supabase:', imgErr);
        }
      }

      // Sync variations to Supabase if provided
      if (savedProduct.variations && Array.isArray(savedProduct.variations)) {
        try {
          const formattedVars = savedProduct.variations.map((v: any, idx: number) => ({
            id: isValidUuid(v.id) ? v.id : generateValidUuid(),
            product_id: product.id,
            sku: v.sku || `TC-${(savedProduct.slug || 'ITEM').toUpperCase().slice(0, 6)}-${idx + 1}`,
            size: v.size || 'One Size',
            colour: v.colour || 'Standard',
            stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
            price_adjustment: Number(v.price_adjustment) || 0,
            is_active: v.is_active ?? true,
          }));

          await supabase.from('product_variations').upsert(formattedVars);
        } catch (varErr) {
          console.warn('Could not sync product variations to Supabase:', varErr);
        }
      }
    } catch (e) {
      console.warn('Could not sync update to Supabase:', e);
    }
  } else {
    // 3. Insert new product
    const newId = (product.id && isValidUuid(product.id)) ? product.id : generateValidUuid();
    savedProduct = {
      ...product,
      id: newId,
      slug: product.slug || (product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : newId),
      currency: product.currency || 'NGN',
      is_published: product.is_published ?? true,
      is_featured: product.is_featured ?? false,
      is_new_arrival: product.is_new_arrival ?? false,
      variations: product.variations || [],
      images: product.images || [],
    } as Product;

    setLocalStoredProducts([savedProduct, ...current]);

    // Try Supabase sync
    try {
      const dbPayload = {
        id: savedProduct.id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        short_description: savedProduct.short_description || savedProduct.description?.slice(0, 160) || '',
        description: savedProduct.description || '',
        category_id: savedProduct.category_id,
        main_image_url: savedProduct.main_image_url,
        base_price: savedProduct.base_price,
        sale_price: savedProduct.sale_price !== undefined ? savedProduct.sale_price : null,
        currency: savedProduct.currency,
        is_published: savedProduct.is_published,
        is_featured: savedProduct.is_featured,
        is_new_arrival: savedProduct.is_new_arrival,
      };

      const { error: insErr } = await supabase.from('products').insert(dbPayload);
      if (insErr) {
        console.warn('Supabase insert error:', insErr.message);
      }

      // Insert images
      if (savedProduct.images && savedProduct.images.length > 0) {
        const formattedImages = savedProduct.images.map((img: any, idx: number) => ({
          id: isValidUuid(img.id) ? img.id : generateValidUuid(),
          product_id: savedProduct.id,
          image_url: typeof img === 'string' ? img : img.image_url,
          alt_text: (typeof img === 'object' && img.alt_text) ? img.alt_text : `${savedProduct.name} photograph ${idx + 1}`,
          display_order: idx,
        }));
        await supabase.from('product_images').insert(formattedImages);
      }

      // Insert variations
      if (savedProduct.variations && savedProduct.variations.length > 0) {
        const formattedVars = savedProduct.variations.map((v: any, idx: number) => ({
          id: isValidUuid(v.id) ? v.id : generateValidUuid(),
          product_id: savedProduct.id,
          sku: v.sku || `TC-${(savedProduct.slug || 'ITEM').toUpperCase().slice(0, 6)}-${idx + 1}`,
          size: v.size || 'One Size',
          colour: v.colour || 'Standard',
          stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
          price_adjustment: Number(v.price_adjustment) || 0,
          is_active: v.is_active ?? true,
        }));
        await supabase.from('product_variations').insert(formattedVars);
      }
    } catch (e) {
      console.warn('Could not sync insert to Supabase:', e);
    }
  }

  return savedProduct;
};

// Soft-Delete / Archive product with undo support
export const archiveProduct = async (id: string, deletedBy = 'Queen Lateefah'): Promise<Product | null> => {
  const current = getLocalStoredProducts();
  const target = current.find(p => p.id === id);
  if (!target) return null;

  const deletedAt = new Date().toISOString();
  const archivedProduct: Product = {
    ...target,
    is_archived: true,
    is_published: false,
    deleted_at: deletedAt,
    deleted_by: deletedBy,
  };

  // Remove from active catalogue
  const remaining = current.filter(p => p.id !== id);
  setLocalStoredProducts(remaining);

  // Add to Recently Deleted registry
  const recentlyDeleted = getRecentlyDeletedProducts().filter(p => p.id !== id);
  setRecentlyDeletedProducts([archivedProduct, ...recentlyDeleted]);

  // Sync to Supabase: unpublish immediately so storefront hides it
  try {
    await supabase.from('products').update({
      is_published: false,
      updated_at: deletedAt,
    }).eq('id', id);
  } catch (e) {
    console.warn('Could not sync archive state to Supabase:', e);
  }

  return archivedProduct;
};

// Restore product from Recently Deleted
export const restoreProduct = async (id: string): Promise<Product | null> => {
  const recentlyDeleted = getRecentlyDeletedProducts();
  const target = recentlyDeleted.find(p => p.id === id);
  if (!target) return null;

  const restoredProduct: Product = {
    ...target,
    is_archived: false,
    deleted_at: null,
    is_published: true, // Re-publish upon restore
    updated_at: new Date().toISOString(),
  };

  // Remove from recently deleted
  setRecentlyDeletedProducts(recentlyDeleted.filter(p => p.id !== id));

  // Add back to active catalogue
  const current = getLocalStoredProducts().filter(p => p.id !== id);
  setLocalStoredProducts([restoredProduct, ...current]);

  // Sync back to Supabase: set is_published to true
  try {
    await supabase.from('products').update({
      is_published: true,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
  } catch (e) {
    console.warn('Could not sync restore state to Supabase:', e);
  }

  return restoredProduct;
};

// Permanent Hard Deletion (requires explicit confirmation)
export const permanentlyDeleteProduct = async (id: string): Promise<void> => {
  // Remove from recently deleted
  const recentlyDeleted = getRecentlyDeletedProducts();
  setRecentlyDeletedProducts(recentlyDeleted.filter(p => p.id !== id));

  // Remove from active catalogue if still present
  const current = getLocalStoredProducts();
  setLocalStoredProducts(current.filter(p => p.id !== id));

  // Remove from Supabase
  try {
    await supabase.from('product_variations').delete().eq('product_id', id);
    await supabase.from('product_images').delete().eq('product_id', id);
    await supabase.from('products').delete().eq('id', id);
  } catch (e) {
    console.warn('Could not permanently delete from Supabase:', e);
  }
};

// Safe default: deleteProduct performs soft-deletion
export const deleteProduct = archiveProduct;

// Categories API
export const getActiveCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (!error && data && data.length > 0) {
      setLocalStoredCategories(data as Category[]);
      return data as Category[];
    }
  } catch (e) {
    console.warn('Supabase categories error, using catalogue cache:', e);
  }

  const cached = getLocalStoredCategories();
  return cached.filter(c => c.is_active);
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order');

    if (!error && data && data.length > 0) {
      setLocalStoredCategories(data as Category[]);
      return data as Category[];
    }
  } catch (e) {
    console.warn('Supabase getAllCategories error, using cache:', e);
  }

  return getLocalStoredCategories();
};

export const saveCategory = async (category: Partial<Category>): Promise<Category> => {
  const current = getLocalStoredCategories();
  let savedCategory: Category;

  if (category.id) {
    savedCategory = {
      ...current.find(c => c.id === category.id)!,
      ...category,
    } as Category;
    setLocalStoredCategories(current.map(c => c.id === category.id ? savedCategory : c));

    try {
      await supabase.from('categories').update(category).eq('id', category.id);
    } catch (e) {
      console.warn('Supabase category update error:', e);
    }
  } else {
    const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : '00000000-0000-4000-8000-' + Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
    savedCategory = {
      ...category,
      id: newId,
      slug: category.slug || (category.name ? category.name.toLowerCase().replace(/ /g, '-') : newId),
      display_order: category.display_order ?? current.length + 1,
      is_active: category.is_active ?? true,
    } as Category;
    setLocalStoredCategories([...current, savedCategory]);

    try {
      await supabase.from('categories').insert({
        name: savedCategory.name,
        slug: savedCategory.slug,
        description: savedCategory.description,
        image_url: savedCategory.image_url,
        display_order: savedCategory.display_order,
        is_active: savedCategory.is_active,
      });
    } catch (e) {
      console.warn('Supabase category insert error:', e);
    }
  }

  return savedCategory;
};

// Inventory & Variations API
export const updateVariationStock = async (variationId: string, quantity: number) => {
  // Update in local cache
  const products = getLocalStoredProducts();
  let updatedVar: any = null;
  const updatedProds = products.map(p => {
    if (p.variations) {
      const match = p.variations.find(v => v.id === variationId);
      if (match) {
        match.stock_quantity = quantity;
        updatedVar = match;
      }
    }
    return p;
  });
  setLocalStoredProducts(updatedProds);

  try {
    const { data } = await supabase
      .from('product_variations')
      .update({ stock_quantity: quantity })
      .eq('id', variationId)
      .select();
    if (data && data[0]) return data[0];
  } catch (e) {
    console.warn('Supabase variation update error:', e);
  }

  return updatedVar || { id: variationId, stock_quantity: quantity };
};

export const upsertProductVariations = async (variations: ProductVariation[]) => {
  try {
    await supabase.from('product_variations').upsert(variations);
  } catch (e) {
    console.warn('Supabase variations upsert error:', e);
  }
};

// Image Upload API (Supports Supabase Storage with local base64 fallback)
export const uploadProductImage = async (file: File): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, WebP).');
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload failed, using local data URL fallback:', err);
  }

  // Local fallback: optimize and resize image using Canvas to avoid huge base64 payloads
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to efficient 82% quality WebP or JPEG
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
};
