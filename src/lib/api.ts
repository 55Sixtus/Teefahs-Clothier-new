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

// Products API
export const getPublishedProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)')
      .eq('is_published', true);

    if (!error && data && data.length > 0) {
      // Map variations and images into standard model
      const mapped = data.map((p: any) => ({
        ...p,
        variations: p.product_variations || [],
        images: p.product_images || [],
      }));
      setLocalStoredProducts(mapped);
      return mapped as Product[];
    }
  } catch (e) {
    console.warn('Supabase query error, using catalogue cache:', e);
  }

  // Fallback to active catalogued products
  const cached = getLocalStoredProducts();
  return cached.filter(p => p.is_published);
};

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*), product_images(*)');

    if (!error && data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        ...p,
        variations: p.product_variations || [],
        images: p.product_images || [],
      }));
      setLocalStoredProducts(mapped);
      return mapped as Product[];
    }
  } catch (e) {
    console.warn('Supabase getAllProducts query error, using catalogue cache:', e);
  }

  return getLocalStoredProducts();
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

  if (product.id) {
    // Update existing
    savedProduct = {
      ...current.find(p => p.id === product.id)!,
      ...product,
    } as Product;
    const updated = current.map(p => p.id === product.id ? savedProduct : p);
    setLocalStoredProducts(updated);

    // Try Supabase sync
    try {
      const dbPayload = {
        name: product.name,
        slug: product.slug || product.name?.toLowerCase().replace(/ /g, '-'),
        short_description: product.short_description,
        description: product.description,
        category_id: product.category_id,
        main_image_url: product.main_image_url,
        base_price: product.base_price,
        sale_price: product.sale_price,
        currency: product.currency || 'NGN',
        is_published: product.is_published ?? true,
        is_featured: product.is_featured ?? false,
        is_new_arrival: product.is_new_arrival ?? false,
      };
      await supabase.from('products').update(dbPayload).eq('id', product.id);
    } catch (e) {
      console.warn('Could not sync update to Supabase:', e);
    }
  } else {
    // Insert new
    const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : '00000000-0000-4000-8000-' + Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
    savedProduct = {
      ...product,
      id: newId,
      slug: product.slug || (product.name ? product.name.toLowerCase().replace(/ /g, '-') : newId),
      currency: product.currency || 'NGN',
      is_published: product.is_published ?? false,
      is_featured: product.is_featured ?? false,
      is_new_arrival: product.is_new_arrival ?? false,
      variations: product.variations || [],
      images: product.images || [],
    } as Product;
    setLocalStoredProducts([savedProduct, ...current]);

    // Try Supabase sync
    try {
      const dbPayload = {
        name: savedProduct.name,
        slug: savedProduct.slug,
        short_description: savedProduct.short_description,
        description: savedProduct.description,
        category_id: savedProduct.category_id,
        main_image_url: savedProduct.main_image_url,
        base_price: savedProduct.base_price,
        sale_price: savedProduct.sale_price,
        currency: savedProduct.currency,
        is_published: savedProduct.is_published,
        is_featured: savedProduct.is_featured,
        is_new_arrival: savedProduct.is_new_arrival,
      };
      await supabase.from('products').insert(dbPayload);
    } catch (e) {
      console.warn('Could not sync insert to Supabase:', e);
    }
  }

  return savedProduct;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const current = getLocalStoredProducts();
  setLocalStoredProducts(current.filter(p => p.id !== id));

  try {
    await supabase.from('products').delete().eq('id', id);
  } catch (e) {
    console.warn('Could not sync delete to Supabase:', e);
  }
};

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
