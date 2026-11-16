export type ImageViewType =
  | 'front'
  | 'back'
  | 'side'
  | 'closeup'
  | 'fabric'
  | 'detail'
  | 'worn'
  | 'other';

export type ImageAuthenticityLabel =
  | 'actual_product'
  | 'ai_enhanced'
  | 'illustrative_model';

export type SizingSystem = 'NG' | 'UK' | 'US' | 'EU' | 'UAE' | 'EG' | 'FREE_SIZE';

export type FitType = 'loose' | 'regular' | 'fitted' | 'free_size';

export interface ConstructionDetails {
  sleeve_style?: string;
  neckline?: string;
  closure_type?: string;
  hood_or_veil?: string;
  embroidery?: string;
  pockets?: string;
  waist_or_belt?: string;
  hem_finish?: string;
  occasion?: string;
  season?: string;
}

export interface GarmentMeasurementRow {
  size_label: string;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  length_cm?: number | null;
  sleeve_cm?: number | null;
  shoulder_cm?: number | null;
  hijab_length_cm?: number | null;
  hijab_width_cm?: number | null;
  front_length_cm?: number | null;
  back_length_cm?: number | null;
  notes?: string;
}

export interface GarmentMeasurements {
  garment_category?: 'abaya' | 'khimar' | 'hijab' | 'set' | 'cap' | 'general';
  unit?: 'cm';
  model_height_cm?: number | null;
  model_wearing_size?: string;
  rows?: GarmentMeasurementRow[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id?: string;
  image_url: string;
  alt_text?: string;
  view_type?: ImageViewType;
  colour_tag?: string;
  authenticity_label?: ImageAuthenticityLabel;
  caption?: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  sku?: string;
  size?: string;
  colour?: string;
  colour_hex?: string;
  image_url?: string;
  measurements?: Record<string, any>;
  price?: number;
  price_adjustment: number;
  price_override?: number | null;
  stock_quantity: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  short_description?: string;
  description?: string;
  category_id?: string;
  main_image_url?: string;
  additionalImages?: string[];
  base_price?: number;
  sale_price?: number;
  currency: 'NGN' | 'USD';
  country_of_origin?: string;
  collection_origin?: string;
  fabric_type?: string;
  fabric_texture?: string;
  fabric_weight?: string;
  transparency_lining?: string;
  care_instructions?: string;
  construction_details?: ConstructionDetails;
  whats_included?: string;
  sizing_system?: SizingSystem;
  fit_type?: FitType;
  fit_guidance?: string;
  measurements_unit_note?: string;
  measurements?: GarmentMeasurements;
  video_url?: string;
  video_caption?: string;
  needs_more_images?: boolean;
  needs_owner_review?: boolean;
  review_notes?: string;
  is_published: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  variations?: ProductVariation[];
  images?: ProductImage[];
  deleted_at?: string | null;
  is_archived?: boolean;
  deleted_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Promotion {
  id?: string;
  title: string;
  message: string;
  badge_text: string;
  subtext?: string;
  link_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
