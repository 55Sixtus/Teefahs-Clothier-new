-- Canonical Schema Definition for Teefahs Clothier
-- Apply database/security-hardening.sql and database/ecommerce-transformation-migration.sql on live Supabase

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT,
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  main_image_url TEXT,
  base_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'NGN',
  country_of_origin TEXT,
  collection_origin TEXT,
  fabric_type TEXT,
  fabric_texture TEXT,
  fabric_weight TEXT,
  transparency_lining TEXT,
  care_instructions TEXT,
  construction_details JSONB DEFAULT '{}'::jsonb,
  whats_included TEXT,
  sizing_system TEXT DEFAULT 'NG',
  fit_type TEXT DEFAULT 'loose',
  fit_guidance TEXT,
  measurements_unit_note TEXT DEFAULT 'Garment measurements in centimetres (cm)',
  measurements JSONB DEFAULT '{}'::jsonb,
  video_url TEXT,
  video_caption TEXT,
  needs_more_images BOOLEAN DEFAULT false,
  needs_owner_review BOOLEAN DEFAULT false,
  review_notes TEXT,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  is_archived BOOLEAN DEFAULT false,
  deleted_by TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variations (Sizes, Colours, Swatches, Variation Media & Price Override)
CREATE TABLE product_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  size TEXT,
  colour TEXT,
  colour_hex TEXT,
  image_url TEXT,
  measurements JSONB DEFAULT '{}'::jsonb,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  price_override DECIMAL(10, 2),
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Images (Multi-angle & Authenticity Labels)
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  view_type TEXT DEFAULT 'front',
  colour_tag TEXT,
  authenticity_label TEXT DEFAULT 'actual_product',
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Delivery Zones
CREATE TABLE IF NOT EXISTS store_delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  delivery_fee_ngn DECIMAL(10, 2) DEFAULT NULL,
  estimated_timeline TEXT,
  customs_note TEXT,
  policy_note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Orders & Lifecycle History
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT UNIQUE NOT NULL,
  contact_verifier TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  delivery_country TEXT NOT NULL DEFAULT 'NG',
  delivery_address TEXT NOT NULL,
  delivery_city TEXT,
  delivery_notes TEXT,
  display_currency TEXT NOT NULL DEFAULT 'NGN',
  exchange_rate_used NUMERIC(14, 6),
  exchange_rate_timestamp TIMESTAMPTZ,
  subtotal_ngn DECIMAL(12, 2) NOT NULL DEFAULT 0,
  confirmed_delivery_fee_ngn DECIMAL(12, 2),
  status TEXT NOT NULL DEFAULT 'awaiting_confirmation',
  tracking_reference TEXT,
  carrier_name TEXT,
  whatsapp_dispatched_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  product_image_snapshot TEXT,
  sku_snapshot TEXT,
  selected_colour TEXT,
  selected_size TEXT,
  quantity INTEGER NOT NULL,
  unit_price_ngn DECIMAL(12, 2) NOT NULL,
  line_total_ngn DECIMAL(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store Settings
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  badge_text TEXT DEFAULT 'PROMO ALERT',
  subtext TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Audit Logs (Append-only)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
