export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  sku?: string;
  size?: string;
  colour?: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category_id?: string;
  main_image_url?: string;
  base_price?: number;
  sale_price?: number;
  currency: 'NGN' | 'USD';
  is_published: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  variations?: ProductVariation[];
  images?: { id: string; image_url: string; alt_text?: string }[];
}
