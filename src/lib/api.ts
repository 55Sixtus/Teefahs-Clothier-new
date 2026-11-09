import { supabase } from './supabase';
import { Product, Category, ProductVariation } from '../types/product';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/initialCatalogue';

// Local storage keys for caching and optimistic updates
const LOCAL_PRODUCTS_KEY = 'teefahs_products_v12_covers';
const LOCAL_CATEGORIES_KEY = 'teefahs_categories_v12_covers';

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
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_PRODUCTS;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].main_image_url) {
        // Merge in any newly catalogued products (e.g. dedicated Occasion Wear pieces 17-24)
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const existingSlugs = new Set(parsed.map((p: any) => p.slug).filter(Boolean));
        let changed = false;

        const updated = parsed.map((p: any) => {
          // Ensure Layla is 68,000 as specified by the owner
          if (p.id === '00000000-0000-0000-0000-000000000005' || p.slug === 'layla-embellished-occasion-silk-abaya') {
            if (p.base_price === 130000 || p.base_price === 255000) {
              changed = true;
              return { ...p, name: 'Layla Embellished Luxury Occasion Silk Abaya', base_price: 68000 };
            }
          }
          // Ensure Noor Abaya is 255,000 as specified by the owner
          if (p.id === '00000000-0000-0000-0000-000000000001' || p.slug === 'noor-embroidered-luxury-abaya') {
            if (p.base_price === 45000) {
              changed = true;
              return { ...p, base_price: 255000 };
            }
          }
          // Ensure Caps product has confirmed owner supplied images and exact 700 price (blue cap as cover)
          if (p.id === '00000000-0000-0000-0000-000000000048' || p.slug === 'jersey-cap' || p.slug === 'zainab-luxe-modal-hijab-under-cap') {
            changed = true;
            return {
              ...p,
              name: 'Comfort Fit Jersey Cap',
              slug: 'jersey-cap',
              base_price: 700,
              main_image_url: 'https://i.ibb.co/jvqcjngf/Whats-App-Image-2026-11-06-at-10-33-35-PM.jpg',
              additionalImages: [
                'https://i.ibb.co/s9GMr74w/Whats-App-Image-2026-11-06-at-10-11-47-PM.jpg',
                'https://i.ibb.co/7NBG3fs0/Whats-App-Image-2026-11-06-at-10-12-17-PM.jpg',
              ],
              images: [
                { id: 'img-48-1', image_url: 'https://i.ibb.co/jvqcjngf/Whats-App-Image-2026-11-06-at-10-33-35-PM.jpg', alt_text: 'Blue jersey cap - Main Cover View' },
                { id: 'img-48-2', image_url: 'https://i.ibb.co/s9GMr74w/Whats-App-Image-2026-11-06-at-10-11-47-PM.jpg', alt_text: 'Jersey cap - Additional Angle' },
                { id: 'img-48-3', image_url: 'https://i.ibb.co/7NBG3fs0/Whats-App-Image-2026-11-06-at-10-12-17-PM.jpg', alt_text: 'Jersey cap - Color Selection' },
              ],
            };
          }
          // Ensure Laced Chiffon Veil has confirmed owner supplied images and price 5500
          if (p.id === '00000000-0000-0000-0000-000000000047' || p.slug === 'laced-chiffon-veil' || p.slug === 'luxe-lace-border-chiffon-veil') {
            changed = true;
            return {
              ...p,
              name: 'Laced Chiffon Veil',
              slug: 'laced-chiffon-veil',
              base_price: 5500,
              main_image_url: 'https://i.ibb.co/qYSMqbNw/Whats-App-Image-2026-11-06-at-10-35-10-PM-1.jpg',
              additionalImages: [
                'https://i.ibb.co/848yGYpb/Whats-App-Image-2026-11-06-at-10-35-10-PM.jpg',
                'https://i.ibb.co/nVMmHNK/Whats-App-Image-2026-11-06-at-10-35-11-PM.jpg',
              ],
              images: [
                { id: 'img-47-1', image_url: 'https://i.ibb.co/qYSMqbNw/Whats-App-Image-2026-11-06-at-10-35-10-PM-1.jpg', alt_text: 'Laced Chiffon Veil - Main View' },
                { id: 'img-47-2', image_url: 'https://i.ibb.co/848yGYpb/Whats-App-Image-2026-11-06-at-10-35-10-PM.jpg', alt_text: 'Laced Chiffon Veil - Detail View' },
                { id: 'img-47-3', image_url: 'https://i.ibb.co/nVMmHNK/Whats-App-Image-2026-11-06-at-10-35-11-PM.jpg', alt_text: 'Laced Chiffon Veil - Border View' },
              ],
            };
          }
          // Remove photos 0-2 from Noor Abaya if still present
          if (p.id === '00000000-0000-0000-0000-000000000001' && p.images && p.images.length > 6) {
            changed = true;
            return {
              ...p,
              images: p.images.filter((img: any) => {
                const url = typeof img === 'string' ? img : img.image_url;
                return !url?.includes('6-02-24-AM');
              }),
            };
          }
          // Update Photoshoot items to distinct names, verified prices and single-photo galleries
          const photoshootFixes: Record<string, { name: string; slug: string; price: number }> = {
            '00000000-0000-0000-0000-000000000025': { name: 'Zahra Embroidered Neckline Crepe Abaya', slug: 'zahra-embroidered-neckline-crepe-abaya', price: 68000 },
            '00000000-0000-0000-0000-000000000026': { name: 'Amina Sage Minimalist Pleated Abaya', slug: 'amina-sage-minimalist-pleated-abaya', price: 75000 },
            '00000000-0000-0000-0000-000000000027': { name: 'Safiyyah Festive White & Red Embroidered Abaya', slug: 'safiyyah-festive-white-red-embroidered-abaya', price: 105000 },
            '00000000-0000-0000-0000-000000000034': { name: 'Hajar Classic Tailored Taupe Abaya', slug: 'hajar-classic-tailored-taupe-abaya', price: 85000 },
            '00000000-0000-0000-0000-000000000028': { name: 'Maryam Plum Utility Modest Coord Set', slug: 'maryam-plum-utility-modest-coord-set', price: 70000 },
            '00000000-0000-0000-0000-000000000035': { name: 'Sultana Golden Brocade Celebration Gown', slug: 'sultana-golden-brocade-celebration-gown', price: 150000 },
            '00000000-0000-0000-0000-000000000029': { name: 'Nawal Minimalist Taupe Button Abaya', slug: 'nawal-minimalist-taupe-button-abaya', price: 85000 },
            '00000000-0000-0000-0000-000000000036': { name: 'Aisha Royal Purple Elegant Coord Set', slug: 'aisha-royal-purple-elegant-coord-set', price: 70000 },
            '00000000-0000-0000-0000-000000000030': { name: 'Farah Slate Blue Floral Embroidered Abaya', slug: 'farah-slate-blue-floral-embroidered-abaya', price: 68000 },
            '00000000-0000-0000-0000-000000000031': { name: 'Zeenat Mint Green Hand-Embellished Occasion Gown', slug: 'zeenat-mint-green-hand-embellished-occasion-gown', price: 130000 },
            '00000000-0000-0000-0000-000000000037': { name: 'Yasmin Midnight Blue Floral Kaftan', slug: 'yasmin-midnight-blue-floral-kaftan', price: 68000 },
            '00000000-0000-0000-0000-000000000038': { name: 'Malika Jet Black Beaded Signature Abaya', slug: 'malika-jet-black-beaded-signature-abaya', price: 68000 },
            '00000000-0000-0000-0000-000000000032': { name: 'Rukayyah Blush Ruffled Layered Abaya', slug: 'rukayyah-blush-ruffled-layered-abaya', price: 70000 },
            '00000000-0000-0000-0000-000000000033': { name: 'Jamilah Seafoam Beaded Occasion Robe', slug: 'jamilah-seafoam-beaded-occasion-robe', price: 90000 },
            '00000000-0000-0000-0000-000000000039': { name: 'Khadija Artisanal Embroidered Denim Dress', slug: 'khadija-artisanal-embroidered-denim-dress', price: 58000 },
            '00000000-0000-0000-0000-000000000040': { name: 'Aaliyah Dusty Mauve Ruffled Batwing Abaya', slug: 'aaliyah-dusty-mauve-ruffled-batwing-abaya', price: 70000 },
          };
          if (photoshootFixes[p.id]) {
            const fix = photoshootFixes[p.id];
            if (p.name.includes('Editorial Photoshoot') || p.base_price !== fix.price) {
              changed = true;
              p.name = fix.name;
              p.slug = fix.slug;
              p.base_price = fix.price;
              p.additionalImages = [];
            }
          }

          if (p.additionalImages === undefined) {
            changed = true;
            p.additionalImages = (p.images && p.images.length > 1)
              ? p.images.slice(1).map((img: any) => typeof img === 'string' ? img : img.image_url).filter(Boolean)
              : [];
          }
          return p;
        });

        // Add any missing catalogued products from INITIAL_PRODUCTS
        const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id) && !existingSlugs.has(p.slug));
        if (missing.length > 0) {
          updated.push(...missing);
          changed = true;
        }

        if (changed) {
          setLocalStoredProducts(updated);
        }
        return updated;
      }
    }
  } catch (e) {
    console.error('Error reading local products:', e);
  }
  setLocalStoredProducts(INITIAL_PRODUCTS);
  return INITIAL_PRODUCTS;
};

const setLocalStoredProducts = (products: Product[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving local products:', e);
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
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].image_url) {
        return parsed.map((c: Category) => {
          if (c.slug === 'hijabs') {
            return { ...c, image_url: '/assets/aistudio/image_60c3b658.png' };
          }
          if (c.slug === 'khimars') {
            return { ...c, image_url: '/assets/aistudio/image_f09b866e.png' };
          }
          if (c.slug === 'veils' || c.slug === 'niqabs-veils') {
            return { ...c, image_url: 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg' };
          }
          return c;
        });
      }
    }
  } catch (e) {
    console.error('Error reading local categories:', e);
  }
  return INITIAL_CATEGORIES;
};

const setLocalStoredCategories = (categories: Category[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
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
    const [{ data, error }, { data: catData }] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_variations(*), product_images(*)')
        .eq('is_published', true),
      supabase.from('categories').select('id, slug, name'),
    ]);

    if (!error && data && data.length > 0) {
      const dbIds = new Set(data.map((p: any) => p.id));
      const dbSlugs = new Set(data.map((p: any) => p.slug).filter(Boolean));
      const liveCats = (catData && catData.length > 0) ? catData : INITIAL_CATEGORIES;
      const hijabsCat = liveCats.find(c => c.slug === 'hijabs');
      const veilsCat = liveCats.find(c => c.slug === 'veils');

      const mapped = data
        .filter((p: any) => !p.is_archived && !p.deleted_at && p.slug !== 'veil')
        .map((p: any) => {
          const localMatch = local.find(lp => lp.id === p.id || (lp.slug && lp.slug === p.slug));

          // Normalization: Amani Chiffon Veil & Hijab Set belongs in Hijabs
          let categoryId = p.category_id || localMatch?.category_id;
          if (p.slug === 'amani-breathable-chiffon-veil-hijab-set' && hijabsCat) {
            categoryId = hijabsCat.id;
          }

          let basePrice = p.base_price !== null && p.base_price !== undefined ? Number(p.base_price) : (localMatch?.base_price ?? 0);
          if ((p.id === '00000000-0000-0000-0000-000000000001' || p.slug === 'noor-embroidered-luxury-abaya') && basePrice === 45000) {
            basePrice = 255000;
          }
          if ((p.id === '00000000-0000-0000-0000-000000000005' || p.slug === 'layla-embellished-occasion-silk-abaya') && (basePrice === 130000 || basePrice === 255000)) {
            basePrice = 68000;
          }

          return {
            ...p,
            category_id: categoryId,
            base_price: basePrice,
            sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : localMatch?.sale_price,
            name: p.name || localMatch?.name || '',
            description: p.description || localMatch?.description || '',
            short_description: p.short_description || localMatch?.short_description || '',
            main_image_url: p.main_image_url || localMatch?.main_image_url || '',
            is_published: p.is_published !== undefined ? p.is_published : (localMatch?.is_published ?? true),
            is_featured: p.is_featured !== undefined ? p.is_featured : (localMatch?.is_featured ?? false),
            is_new_arrival: p.is_new_arrival !== undefined ? p.is_new_arrival : (localMatch?.is_new_arrival ?? false),
            variations: (p.product_variations && p.product_variations.length > 0) ? p.product_variations : (localMatch?.variations || []),
            images: (p.product_images && p.product_images.length > 0) ? p.product_images : (localMatch?.images || []),
            additionalImages: p.additionalImages || localMatch?.additionalImages || (
              p.product_images && p.product_images.length > 0
                ? p.product_images.map((img: any) => typeof img === 'string' ? img : img.image_url).filter(Boolean)
                : (localMatch?.images && localMatch.images.length > 1
                  ? localMatch.images.slice(1).map(i => i.image_url)
                  : [])
            ),
          };
        });

      // Include catalogue products not yet seeded into Supabase
      const localOnly = local
        .filter(p => !dbIds.has(p.id) && !dbSlugs.has(p.slug) && p.is_published && !p.is_archived && !p.deleted_at)
        .map(p => {
          if (p.slug === 'luxe-jersey-veil' && veilsCat) {
            return { ...p, category_id: veilsCat.id };
          }
          if ((p.slug.includes('hijab') || p.slug.includes('white')) && hijabsCat) {
            return { ...p, category_id: hijabsCat.id };
          }
          return p;
        });

      const combined = [...mapped, ...localOnly];
      setLocalStoredProducts(combined);
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
    const [{ data, error }, { data: catData }] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_variations(*), product_images(*)'),
      supabase.from('categories').select('id, slug, name'),
    ]);

    if (!error && data && data.length > 0) {
      const dbIds = new Set(data.map((p: any) => p.id));
      const dbSlugs = new Set(data.map((p: any) => p.slug).filter(Boolean));
      const liveCats = (catData && catData.length > 0) ? catData : INITIAL_CATEGORIES;
      const hijabsCat = liveCats.find(c => c.slug === 'hijabs');
      const veilsCat = liveCats.find(c => c.slug === 'veils');

      const mapped = data
        .filter((p: any) => !p.is_archived && !p.deleted_at && p.slug !== 'veil')
        .map((p: any) => {
          const localMatch = local.find(lp => lp.id === p.id || (lp.slug && lp.slug === p.slug));

          let categoryId = p.category_id || localMatch?.category_id;
          if (p.slug === 'amani-breathable-chiffon-veil-hijab-set' && hijabsCat) {
            categoryId = hijabsCat.id;
          }

          let basePrice = p.base_price !== null && p.base_price !== undefined ? Number(p.base_price) : (localMatch?.base_price ?? 0);
          if ((p.id === '00000000-0000-0000-0000-000000000001' || p.slug === 'noor-embroidered-luxury-abaya') && basePrice === 45000) {
            basePrice = 255000;
          }
          if ((p.id === '00000000-0000-0000-0000-000000000005' || p.slug === 'layla-embellished-occasion-silk-abaya') && (basePrice === 130000 || basePrice === 255000)) {
            basePrice = 68000;
          }

          return {
            ...p,
            category_id: categoryId,
            base_price: basePrice,
            sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : localMatch?.sale_price,
            name: p.name || localMatch?.name || '',
            description: p.description || localMatch?.description || '',
            short_description: p.short_description || localMatch?.short_description || '',
            main_image_url: p.main_image_url || localMatch?.main_image_url || '',
            is_published: p.is_published !== undefined ? p.is_published : (localMatch?.is_published ?? true),
            is_featured: p.is_featured !== undefined ? p.is_featured : (localMatch?.is_featured ?? false),
            is_new_arrival: p.is_new_arrival !== undefined ? p.is_new_arrival : (localMatch?.is_new_arrival ?? false),
            variations: (p.product_variations && p.product_variations.length > 0) ? p.product_variations : (localMatch?.variations || []),
            images: (p.product_images && p.product_images.length > 0) ? p.product_images : (localMatch?.images || []),
            additionalImages: p.additionalImages || localMatch?.additionalImages || (
              p.product_images && p.product_images.length > 0
                ? p.product_images.map((img: any) => typeof img === 'string' ? img : img.image_url).filter(Boolean)
                : (localMatch?.images && localMatch.images.length > 1
                  ? localMatch.images.slice(1).map(i => i.image_url)
                  : [])
            ),
          };
        });

      const localOnly = local
        .filter(p => !dbIds.has(p.id) && !dbSlugs.has(p.slug) && !p.is_archived && !p.deleted_at)
        .map(p => {
          if (p.slug === 'luxe-jersey-veil' && veilsCat) {
            return { ...p, category_id: veilsCat.id };
          }
          if ((p.slug.includes('hijab') || p.slug.includes('white')) && hijabsCat) {
            return { ...p, category_id: hijabsCat.id };
          }
          return p;
        });

      const combined = [...mapped, ...localOnly];
      setLocalStoredProducts(combined);
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
      additionalImages: product.additionalImages ?? existing.additionalImages ?? [],
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
      additionalImages: product.additionalImages || [],
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

  // Instant notification for storefront and admin synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: savedProduct.id } }));
  }

  return savedProduct;
};

// Fast Price Updater that syncs across Supabase and local cache with automatic change events
export const updateProductPrice = async (productId: string, newPrice: number): Promise<Product> => {
  const current = getLocalStoredProducts();
  const prod = current.find(p => p.id === productId || (p.slug && p.slug === productId));
  if (!prod) {
    throw new Error('Product not found');
  }

  const numericPrice = Math.max(0, Number(newPrice) || 0);
  const updatedProduct: Product = {
    ...prod,
    base_price: numericPrice,
    updated_at: new Date().toISOString(),
  };

  const updatedList = current.map(p => (p.id === prod.id || p.slug === prod.slug) ? updatedProduct : p);
  setLocalStoredProducts(updatedList);

  // Sync to Supabase if valid UUID
  if (isValidUuid(prod.id)) {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          base_price: numericPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prod.id);

      if (error) {
        console.warn('Supabase product price update note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase price update error:', err);
    }
  }

  // Dispatch window event so any listening admin pages refresh instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: prod.id, price: numericPrice } }));
  }

  return updatedProduct;
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

  // Instant notification for storefront and admin synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: id, archived: true } }));
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

  // Instant notification for storefront and admin synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: id, restored: true } }));
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

  // Instant notification for storefront and admin synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('teefahs_catalogue_updated', { detail: { productId: id, deleted: true } }));
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
      const normalized = (data as Category[]).map(c => {
        if (c.slug === 'hijabs') {
          return {
            ...c,
            name: 'Hijabs',
            slug: 'hijabs',
            image_url: '/assets/aistudio/image_60c3b658.png',
          };
        }
        if (c.slug === 'khimars') {
          return {
            ...c,
            name: 'Khimars',
            slug: 'khimars',
            image_url: '/assets/aistudio/image_f09b866e.png',
          };
        }
        if (c.slug === 'veils' || c.slug === 'niqabs-veils') {
          return {
            ...c,
            name: 'Veils',
            slug: 'veils',
            image_url: 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg',
          };
        }
        return c;
      });
      setLocalStoredCategories(normalized);
      return normalized;
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
      const normalized = (data as Category[]).map(c => {
        if (c.slug === 'hijabs') {
          return {
            ...c,
            name: 'Hijabs',
            slug: 'hijabs',
            image_url: '/assets/aistudio/image_60c3b658.png',
          };
        }
        if (c.slug === 'khimars') {
          return {
            ...c,
            name: 'Khimars',
            slug: 'khimars',
            image_url: '/assets/aistudio/image_f09b866e.png',
          };
        }
        if (c.slug === 'veils' || c.slug === 'niqabs-veils') {
          return {
            ...c,
            name: 'Veils',
            slug: 'veils',
            image_url: 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg',
          };
        }
        return c;
      });
      setLocalStoredCategories(normalized);
      return normalized;
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
