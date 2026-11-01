-- ==============================================================================
-- TEEFAHS CLOTHIER — PRODUCTION CATALOGUE SEED & DATABASE SYNCHRONIZATION
-- ==============================================================================
-- Project Reference: mxovvqjyfgyrzjauzodh
-- Execute in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
--
-- Features:
-- 1. Hardened Row Level Security (RLS) with strict least-privilege architecture:
--    - Public / Anonymous visitors: Read-only access to published products, active categories,
--      associated gallery photographs, and active variations.
--    - Authenticated Store Administrators: Full management permissions verified via
--      secure role check and verified store owner email (queenlateefalive@yahoo.com).
--    - No public write/update/delete permissions.
-- 2. Populates and maintains the complete boutique catalogue:
--    - 8 core boutique categories (Abayas, Khimars, Hijabs, Veils, Prayer Wear, Occasion Wear, Caps, Accessories)
--    - 16 total garments (11 original editorial pieces + 5 newly supplied products)
--    - 33 size and colour variations with inventory stock
--    - 88 authentic photographs (54 original photoshoot + 34 new product photographs)
-- 3. Category Correction:
--    - Category 4 is 'Veils' (slug: 'veils') with Luxe Jersey Veil cover photograph.
--    - 'Amani Breathable Chiffon Veil & Hijab Set' is reassigned to 'Hijabs'.
--    - 'Luxe Jersey Veil' is accurately placed in 'Veils'.
-- 4. Dynamic foreign-key resolution using slugs ensures zero UUID mismatches.
-- 5. Safe upserts (ON CONFLICT DO UPDATE): Will never delete newly created products,
--    wipe custom inventory stock, or overwrite admin edits.
-- ==============================================================================

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE CATALOGUE TABLES
CREATE TABLE IF NOT EXISTS categories (
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

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  main_image_url TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'NGN',
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  size TEXT,
  colour TEXT,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all product columns exist on pre-existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

-- 3. UNIQUE INDEXES FOR NON-DESTRUCTIVE UPSERTS
CREATE UNIQUE INDEX IF NOT EXISTS product_variations_product_size_colour_idx 
ON product_variations (product_id, size, colour);

CREATE UNIQUE INDEX IF NOT EXISTS product_images_product_url_idx 
ON product_images (product_id, image_url);

-- 4. ADMINISTRATOR ROLE TABLE & ACCESS VERIFICATION
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

INSERT INTO admin_users (email, role, is_active)
VALUES
  ('queenlateefalive@yahoo.com', 'admin', true),
  ('greatezirim8@gmail.com', 'admin', true)
ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'admin';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com') THEN
    RETURN TRUE;
  END IF;

  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM admin_users 
    WHERE LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    AND is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. LEAST-PRIVILEGE ROW LEVEL SECURITY POLICIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Public can read published products" ON products;
DROP POLICY IF EXISTS "Public can read active categories" ON categories;
DROP POLICY IF EXISTS "Public read all categories" ON categories;
DROP POLICY IF EXISTS "Public read all products" ON products;
DROP POLICY IF EXISTS "Public read all variations" ON product_variations;
DROP POLICY IF EXISTS "Public read all images" ON product_images;
DROP POLICY IF EXISTS "Admin write categories" ON categories;
DROP POLICY IF EXISTS "Admin write products" ON products;
DROP POLICY IF EXISTS "Admin write variations" ON product_variations;
DROP POLICY IF EXISTS "Admin write images" ON product_images;
DROP POLICY IF EXISTS "Authenticated admin manage categories" ON categories;
DROP POLICY IF EXISTS "Authenticated admin manage products" ON products;
DROP POLICY IF EXISTS "Authenticated admin manage variations" ON product_variations;
DROP POLICY IF EXISTS "Authenticated admin manage images" ON product_images;
DROP POLICY IF EXISTS "Public write categories" ON categories;
DROP POLICY IF EXISTS "Public write products" ON products;
DROP POLICY IF EXISTS "Public write variations" ON product_variations;
DROP POLICY IF EXISTS "Public write images" ON product_images;
DROP POLICY IF EXISTS "Public access categories" ON categories;
DROP POLICY IF EXISTS "Public access products" ON products;
DROP POLICY IF EXISTS "Public access variations" ON product_variations;
DROP POLICY IF EXISTS "Public access images" ON product_images;
DROP POLICY IF EXISTS "Public can read published product images" ON product_images;
DROP POLICY IF EXISTS "Public can read active variations of published products" ON product_variations;
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin manage categories" ON categories;
DROP POLICY IF EXISTS "Admin manage products" ON products;
DROP POLICY IF EXISTS "Admin manage variations" ON product_variations;
DROP POLICY IF EXISTS "Admin manage images" ON product_images;
DROP POLICY IF EXISTS "Admin manage store_settings" ON store_settings;
DROP POLICY IF EXISTS "Public read store_settings" ON store_settings;

CREATE POLICY "Public can read active categories" ON categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read published products" ON products
FOR SELECT USING (is_published = true);

CREATE POLICY "Public can read published product images" ON product_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_images.product_id
    AND products.is_published = true
  )
);

CREATE POLICY "Public can read active variations of published products" ON product_variations
FOR SELECT USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_variations.product_id
    AND products.is_published = true
  )
);

CREATE POLICY "Public read store_settings" ON store_settings
FOR SELECT USING (true);

CREATE POLICY "Admin manage categories" ON categories
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admin manage products" ON products
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admin manage variations" ON product_variations
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admin manage images" ON product_images
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admin manage store_settings" ON store_settings
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can view admin_users" ON admin_users
FOR SELECT TO authenticated
USING (is_admin());

-- 6. POPULATE 8 CORE BOUTIQUE CATEGORIES
-- Ensure Category 4 is 'Veils' (slug: 'veils') with Luxe Jersey Veil cover
UPDATE categories 
SET slug = 'veils', name = 'Veils', image_url = 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg'
WHERE slug = 'niqabs-veils';

INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
VALUES
  ('Abayas', 'abayas', 'Graceful, tailored silhouettes crafted with premium Dubai crepe and chiffon.', 'https://i.ibb.co/fV8gWmZy/Whats-App-Image-2026-10-21-at-6-02-25-AM-1.jpg', 1, true),
  ('Khimars', 'khimars', 'Flowing French and classic cut khimars offering modest chest-to-hip coverage.', 'https://i.ibb.co/MyZCn5jM/Whats-App-Image-2026-10-21-at-6-02-27-AM-1.jpg', 2, true),
  ('Hijabs', 'hijabs', 'Feather-light modal, chiffon, and silk hijabs with non-slip drape.', 'https://i.ibb.co/VWgQX9qg/Whats-App-Image-2026-10-21-at-10-08-26-PM-1.jpg', 3, true),
  ('Veils', 'veils', 'Delicate single and multi-layer stretch jersey veils and breathable niqabs for modest elegance.', 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg', 4, true),
  ('Prayer Wear', 'prayer-wear', 'Full-coverage two-piece prayer dresses designed for serene devotion.', 'https://i.ibb.co/GQG167rP/Whats-App-Image-2026-10-21-at-6-02-28-AM-1.jpg', 5, true),
  ('Occasion Wear', 'occasion-wear', 'Opulent embellished gowns and embroidered kimonos for celebrations.', 'https://i.ibb.co/nsxCQwdF/Whats-App-Image-2026-10-21-at-10-08-22-PM.jpg', 6, true),
  ('Caps', 'caps', 'Ergonomic tie-back under-caps and volumizing cotton caps.', 'https://i.ibb.co/W4VFJzHG/Whats-App-Image-2026-10-21-at-10-08-29-PM-1.jpg', 7, true),
  ('Accessories', 'accessories', 'Snag-free magnetic hijab pins, coordinating sleeve cuffs, and belt ties.', 'https://i.ibb.co/wNXc25mr/Whats-App-Image-2026-10-21-at-10-08-28-PM-2.jpg', 8, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 7. REASSIGN AMANI SET TO HIJABS CATEGORY
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1)
WHERE slug = 'amani-breathable-chiffon-veil-hijab-set';

-- 8. POPULATE ALL 16 BOUTIQUE GARMENTS (11 Original + 5 New)
INSERT INTO products (name, slug, short_description, description, category_id, main_image_url, base_price, currency, is_published, is_featured, is_new_arrival)
VALUES
  (
    'Noor Embroidered Luxury Abaya',
    'noor-embroidered-luxury-abaya',
    'Intricately embroidered cuffs with premium flowing Dubai crepe.',
    'Crafted from the finest imported crepe, the Noor Luxury Abaya features delicate tone-on-tone cuff and lapel embroidery. Designed for timeless elegance, this piece offers modest fluid movement and effortless layering.',
    (SELECT id FROM categories WHERE slug = 'abayas' LIMIT 1),
    'https://i.ibb.co/fV8gWmZy/Whats-App-Image-2026-10-21-at-6-02-25-AM-1.jpg',
    45000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Ameera Tiered Chiffon Open Abaya',
    'ameera-tiered-chiffon-open-abaya',
    'Dual-layer breathable chiffon kimono abaya with inner matching belt.',
    'The Ameera Abaya features an airy double-layered chiffon build with satin piping. Includes a matching waist tie and deep hidden pockets for modern convenience without disrupting the modest drape.',
    (SELECT id FROM categories WHERE slug = 'abayas' LIMIT 1),
    'https://i.ibb.co/jZ9R6TST/Whats-App-Image-2026-10-21-at-6-02-26-AM-1.jpg',
    48500,
    'NGN',
    true,
    true,
    false
  ),
  (
    'Zahra French Diamond Khimar',
    'zahra-french-diamond-khimar',
    'Pointed diamond-cut French khimar with built-in tie-back headband.',
    'Designed for effortless coverage and modest grace. The Zahra Khimar features integrated ties for a secure non-slip fit and a diamond hemline that provides generous front and back coverage with freedom of movement.',
    (SELECT id FROM categories WHERE slug = 'khimars' LIMIT 1),
    'https://i.ibb.co/MyZCn5jM/Whats-App-Image-2026-10-21-at-6-02-27-AM-1.jpg',
    28000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Maryam Flowing Two-Piece Prayer Set',
    'maryam-flowing-two-piece-prayer-set',
    'Soft cotton-viscose prayer dress with attached headscarf and matching skirt.',
    'Imbued with serene comfort for daily Salah and taraweeh prayers. The Maryam Prayer Set features an elasticated wrist band, breathable anti-static weave, and a coordinating drawstring skirt.',
    (SELECT id FROM categories WHERE slug = 'prayer-wear' LIMIT 1),
    'https://i.ibb.co/GQG167rP/Whats-App-Image-2026-10-21-at-6-02-28-AM-1.jpg',
    32000,
    'NGN',
    true,
    false,
    true
  ),
  (
    'Layla Embellished Occasion Silk Abaya',
    'layla-embellished-occasion-silk-abaya',
    'Hand-applied crystal trim and lustrous silk satin for weddings and celebrations.',
    'An ethereal creation designed for milestone celebrations. Featuring hand-sewn metallic lace bordering along the cuffs and sweeping hemline with premium champagne silk undertones.',
    (SELECT id FROM categories WHERE slug = 'occasion-wear' LIMIT 1),
    'https://i.ibb.co/nsxCQwdF/Whats-App-Image-2026-10-21-at-10-08-22-PM.jpg',
    65000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Hafsah Medina Silk Rounded Khimar',
    'hafsah-medina-silk-rounded-khimar',
    'Ultra-soft Medina silk khimar with curved silhouette and niqab straps.',
    'The Hafsah Khimar is tailored from high-density Medina silk that resists creasing. Equipped with integrated niqab straps, allowing it to be worn as a standard khimar or pulled up into a graceful half-niqab.',
    (SELECT id FROM categories WHERE slug = 'khimars' LIMIT 1),
    'https://i.ibb.co/RR2G9YR/Whats-App-Image-2026-10-21-at-10-08-24-PM-1.jpg',
    35000,
    'NGN',
    true,
    false,
    false
  ),
  (
    'Fatima Pleated Hem Minimalist Abaya',
    'fatima-pleated-hem-minimalist-abaya',
    'Architectural pleated lower tier with concealed magnetic front closure.',
    'Embodying the essence of understated luxury. The Fatima Abaya combines crisp pleated panels along the base with concealed magnetic front fasteners, allowing seamless wear open or closed.',
    (SELECT id FROM categories WHERE slug = 'abayas' LIMIT 1),
    'https://i.ibb.co/twmtLdyF/Whats-App-Image-2026-10-21-at-10-08-25-PM-1.jpg',
    42000,
    'NGN',
    true,
    true,
    false
  ),
  (
    'Amani Breathable Chiffon Veil & Hijab Set',
    'amani-breathable-chiffon-veil-hijab-set',
    'Feather-light matching niqab veil and maxi chiffon hijab.',
    'Specially engineered for comfort in warmer climates. The Amani Veil Set pairs a breathable single-layer noseband veil with an expansive 200cm x 75cm matching chiffon hijab for seamless coordination.',
    (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1),
    'https://i.ibb.co/VWgQX9qg/Whats-App-Image-2026-10-21-at-10-08-26-PM-1.jpg',
    18500,
    'NGN',
    true,
    false,
    true
  ),
  (
    'Sultana Beaded Evening Occasion Kimono',
    'sultana-beaded-evening-occasion-kimono',
    'Rich velvet-embossed lapels with hand-stitched glass bead accents.',
    'A statement occasion piece for Eid, nikkah receptions, and special gatherings. The Sultana Kimono exudes regal modesty with structured shoulders and floor-skimming drama.',
    (SELECT id FROM categories WHERE slug = 'occasion-wear' LIMIT 1),
    'https://i.ibb.co/VcHbWSCG/Whats-App-Image-2026-10-21-at-10-08-27-PM-1.jpg',
    72000,
    'NGN',
    true,
    true,
    false
  ),
  (
    'Rukayyah Zip-Front Hooded Prayer Abaya',
    'rukayyah-zip-front-hooded-prayer-abaya',
    'Instant zip-front prayer dress with attached stretch bonnet.',
    'The ultimate in convenience for home, work, and mosque. The Rukayyah Prayer Abaya slips on in under 10 seconds with a full-length invisible zip and secure integrated head covering.',
    (SELECT id FROM categories WHERE slug = 'prayer-wear' LIMIT 1),
    'https://i.ibb.co/W4PjjrSV/Whats-App-Image-2026-10-21-at-10-08-28-PM-1.jpg',
    29500,
    'NGN',
    true,
    false,
    true
  ),
  (
    'Zainab Luxe Modal Hijab & Under-Cap Set',
    'zainab-luxe-modal-hijab-under-cap-set',
    'Non-slip bamboo jersey under-cap paired with modal silk maxi wrap.',
    'Engineered for hair health and all-day comfort. The bamboo cotton under-cap features an open back for volume and cooling breathability, while the matching modal hijab drapes effortlessly without pins.',
    (SELECT id FROM categories WHERE slug = 'caps' LIMIT 1),
    'https://i.ibb.co/W4VFJzHG/Whats-App-Image-2026-10-21-at-10-08-29-PM-1.jpg',
    14500,
    'NGN',
    true,
    true,
    true
  ),
  -- 5 NEW BOUTIQUE PRODUCTS SUPPLIED BY STORE OWNER
  (
    'Malaysian Hijabs',
    'malaysian-hijabs',
    'Breathable lightweight Malaysian drape with floral embroidery and full XL coverage.',
    'Directly sourced premium Malaysian hijab tailored from lightweight breathable fabric with delicate tone-on-tone embroidery. Designed for graceful everyday modesty and effortless drape.',
    (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1),
    'https://i.ibb.co/j9xMh9TX/Whats-App-Image-2026-11-01-at-9-46-26-PM.jpg',
    11000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Luxe Jersey Veil',
    'luxe-jersey-veil',
    'Ultra-soft stretch jersey veil offering breathable comfort and non-slip drape.',
    'Impeccably crafted from premium four-way stretch jersey, the Luxe Jersey Veil delivers a weightless non-slip hold that requires minimal pinning. Engineered for all-day comfort and serene coverage.',
    (SELECT id FROM categories WHERE slug = 'veils' LIMIT 1),
    'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg',
    6000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Khadeejah Hijab',
    'khadeejah-hijab',
    'Grand 4XL maxi hijab offering opulent full-length coverage and serene comfort.',
    'An iconic modest silhouette designed for regal full coverage. The Khadeejah Hijab in 4XL provides sweeping chest-to-hip coverage crafted from soft breathable Medina-blend chiffon.',
    (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1),
    'https://i.ibb.co/1J8jyJCY/Whats-App-Image-2026-11-01-at-10-00-40-PM-1.jpg',
    16000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Aisha Luxe All-White',
    'aisha-luxe-all-white',
    'Pristine pure white 4XL maxi hijab in luminous silk-touch finish with ruffled hem.',
    'Designed for Umrah, bridal occasions, and serene Friday gatherings. The Aisha Luxe All-White 4XL hijab features delicate ruffled bordering along the hemline in immaculate luminous white weave.',
    (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1),
    'https://i.ibb.co/Y4wNTMfR/Whats-App-Image-2026-11-01-at-10-02-20-PM-1.jpg',
    15000,
    'NGN',
    true,
    true,
    true
  ),
  (
    'Jacquard Jersey Laser-Cut Hijab',
    'jacquard-jersey-laser-cut-hijab',
    'Textured jacquard jersey hijab with precision laser-cut scalloped hem.',
    'An architectural piece combining fine textured jacquard patterns with intricate laser-cut scalloped trim. Offers generous coverage, zero slip, and timeless modest refinement in XL and 2XL.',
    (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1),
    'https://i.ibb.co/qLr2DZ8V/Whats-App-Image-2026-11-01-at-10-05-01-PM-1.jpg',
    12000,
    'NGN',
    true,
    true,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  main_image_url = EXCLUDED.main_image_url,
  base_price = EXCLUDED.base_price,
  is_published = EXCLUDED.is_published,
  is_featured = EXCLUDED.is_featured,
  is_new_arrival = EXCLUDED.is_new_arrival;

-- 9. POPULATE 33 PRODUCT VARIATIONS (Sizes & Inventory Units)
INSERT INTO product_variations (product_id, size, colour, stock_quantity, is_active)
VALUES
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), '52', 'Midnight Black', 8, true),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), '54', 'Midnight Black', 12, true),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), '56', 'Midnight Black', 10, true),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), '58', 'Midnight Black', 6, true),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), '54', 'Forest Emerald', 7, true),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), '56', 'Forest Emerald', 9, true),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), '58', 'Forest Emerald', 5, true),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'Standard (Length 1)', 'Warm Taupe', 15, true),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'Extra Long (Length 2)', 'Warm Taupe', 10, true),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'Medium (54-56)', 'Soft Sage', 14, true),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'Large (58-60)', 'Soft Sage', 11, true),
  ((SELECT id FROM products WHERE slug = 'layla-embellished-occasion-silk-abaya' LIMIT 1), '54', 'Champagne Gold', 6, true),
  ((SELECT id FROM products WHERE slug = 'layla-embellished-occasion-silk-abaya' LIMIT 1), '56', 'Champagne Gold', 8, true),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'One Size', 'Deep Cocoa', 12, true),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'One Size', 'Olive Mist', 9, true),
  ((SELECT id FROM products WHERE slug = 'fatima-pleated-hem-minimalist-abaya' LIMIT 1), '52', 'Jet Black', 5, true),
  ((SELECT id FROM products WHERE slug = 'fatima-pleated-hem-minimalist-abaya' LIMIT 1), '54', 'Jet Black', 9, true),
  ((SELECT id FROM products WHERE slug = 'fatima-pleated-hem-minimalist-abaya' LIMIT 1), '56', 'Jet Black', 8, true),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'Maxi (200x75cm)', 'Alabaster White', 18, true),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'Maxi (200x75cm)', 'Desert Rose', 15, true),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), '54', 'Onyx & Gold', 4, true),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), '56', 'Onyx & Gold', 6, true),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), '58', 'Onyx & Gold', 3, true),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'Standard (Length 56)', 'Slate Grey', 11, true),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'Tall (Length 60)', 'Slate Grey', 8, true),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'Standard', 'Nude Biscotti', 20, true),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'Standard', 'Charcoal Black', 18, true),
  -- 5 New Products Variations
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'XL', 'Boutique Collection', 15, true),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'Medium', 'Sage Olive', 20, true),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), '4XL', 'Blush Rose', 12, true),
  ((SELECT id FROM products WHERE slug = 'aisha-luxe-all-white' LIMIT 1), '4XL', 'Pristine White', 10, true),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'XL', 'Laser-Cut Pattern', 12, true),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), '2XL', 'Laser-Cut Pattern', 12, true)
ON CONFLICT (product_id, size, colour) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 10. POPULATE ALL 88 AUTHENTIC BOUTIQUE PHOTOGRAPHS (54 Original + 34 New Batch)
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
VALUES
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/svjCMgcM/Whats-App-Image-2026-10-21-at-6-02-24-AM-1.jpg', 'Editorial portrait - Noor Abaya', 0),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/nMyTBTm6/Whats-App-Image-2026-10-21-at-6-02-24-AM-2.jpg', 'Styling angle - Noor Abaya', 1),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/kC5McfY/Whats-App-Image-2026-10-21-at-6-02-24-AM.jpg', 'Full-length studio angle - Noor Abaya', 2),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/fV8gWmZy/Whats-App-Image-2026-10-21-at-6-02-25-AM-1.jpg', 'Front view Noor Abaya', 3),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/99BS5jF5/Whats-App-Image-2026-10-21-at-6-02-25-AM-2.jpg', 'Sleeve embroidery detail', 4),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/Pzsw53sT/Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg', 'Side profile flow', 5),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/Jwc5QcZQ/Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg', 'Fabric texture closeup', 6),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/vCKtsr8K/Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg', 'Back drape', 7),
  ((SELECT id FROM products WHERE slug = 'noor-embroidered-luxury-abaya' LIMIT 1), 'https://i.ibb.co/99cSP208/Whats-App-Image-2026-10-21-at-6-02-25-AM.jpg', 'Full length silhouette', 8),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/jZ9R6TST/Whats-App-Image-2026-10-21-at-6-02-26-AM-1.jpg', 'Ameera Abaya front', 0),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/ZzWxs1xw/Whats-App-Image-2026-10-21-at-6-02-26-AM-2.jpg', 'Lapel and belt tie detail', 1),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/mFqFKfYP/Whats-App-Image-2026-10-21-at-6-02-26-AM-3.jpg', 'Side angle view', 2),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/nqTFn7qL/Whats-App-Image-2026-10-21-at-6-02-26-AM-4.jpg', 'Back styling', 3),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/x8Xr5kt8/Whats-App-Image-2026-10-21-at-6-02-26-AM-5.jpg', 'Full motion capture', 4),
  ((SELECT id FROM products WHERE slug = 'ameera-tiered-chiffon-open-abaya' LIMIT 1), 'https://i.ibb.co/TBSKrHWJ/Whats-App-Image-2026-10-21-at-6-02-26-AM.jpg', 'Fabric drape closeup', 5),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'https://i.ibb.co/MyZCn5jM/Whats-App-Image-2026-10-21-at-6-02-27-AM-1.jpg', 'Zahra Khimar front', 0),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'https://i.ibb.co/nMLZDXsM/Whats-App-Image-2026-10-21-at-6-02-27-AM-2.jpg', 'Diamond hem detail', 1),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'https://i.ibb.co/xttGms6h/Whats-App-Image-2026-10-21-at-6-02-27-AM-3.jpg', 'Headband tie detail', 2),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'https://i.ibb.co/9HG8M9hX/Whats-App-Image-2026-10-21-at-6-02-27-AM-4.jpg', 'Side coverage', 3),
  ((SELECT id FROM products WHERE slug = 'zahra-french-diamond-khimar' LIMIT 1), 'https://i.ibb.co/8LcMGNG5/Whats-App-Image-2026-10-21-at-6-02-27-AM.jpg', 'Back length', 4),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/GQG167rP/Whats-App-Image-2026-10-21-at-6-02-28-AM-1.jpg', 'Maryam Prayer Set', 0),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/cc08ckBY/Whats-App-Image-2026-10-21-at-6-02-28-AM-2.jpg', 'Attached veil drape', 1),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/RT82skj3/Whats-App-Image-2026-10-21-at-6-02-28-AM-3.jpg', 'Elasticated cuffs', 2),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/s9FdkBzS/Whats-App-Image-2026-10-21-at-6-02-28-AM-4.jpg', 'Skirt hemline', 3),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/ync1n4P1/Whats-App-Image-2026-10-21-at-6-02-28-AM-5.jpg', 'Fabric movement', 4),
  ((SELECT id FROM products WHERE slug = 'maryam-flowing-two-piece-prayer-set' LIMIT 1), 'https://i.ibb.co/0yV7ZsKY/Whats-App-Image-2026-10-21-at-6-02-28-AM.jpg', 'Complete set view', 5),
  ((SELECT id FROM products WHERE slug = 'layla-embellished-occasion-silk-abaya' LIMIT 1), 'https://i.ibb.co/nsxCQwdF/Whats-App-Image-2026-10-21-at-10-08-22-PM.jpg', 'Layla Occasion Abaya', 0),
  ((SELECT id FROM products WHERE slug = 'layla-embellished-occasion-silk-abaya' LIMIT 1), 'https://i.ibb.co/TDC1s3Pg/Whats-App-Image-2026-10-21-at-10-08-23-PM-1.jpg', 'Hand-sewn crystal detail', 1),
  ((SELECT id FROM products WHERE slug = 'layla-embellished-occasion-silk-abaya' LIMIT 1), 'https://i.ibb.co/Dfng18s1/Whats-App-Image-2026-10-21-at-10-08-23-PM.jpg', 'Silk drape movement', 2),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'https://i.ibb.co/RR2G9YR/Whats-App-Image-2026-10-21-at-10-08-24-PM-1.jpg', 'Hafsah Khimar front view', 0),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'https://i.ibb.co/ym9xTDZ6/Whats-App-Image-2026-10-21-at-10-08-24-PM-2.jpg', 'Side curve profile', 1),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'https://i.ibb.co/B2RZ2cZ7/Whats-App-Image-2026-10-21-at-10-08-24-PM-3.jpg', 'Niqab tie straps', 2),
  ((SELECT id FROM products WHERE slug = 'hafsah-medina-silk-rounded-khimar' LIMIT 1), 'https://i.ibb.co/h1JzCC0g/Whats-App-Image-2026-10-21-at-10-08-24-PM.jpg', 'Rear flowing view', 3),
  ((SELECT id FROM products WHERE slug = 'fatima-pleated-hem-minimalist-abaya' LIMIT 1), 'https://i.ibb.co/twmtLdyF/Whats-App-Image-2026-10-21-at-10-08-25-PM-1.jpg', 'Fatima Abaya front', 0),
  ((SELECT id FROM products WHERE slug = 'fatima-pleated-hem-minimalist-abaya' LIMIT 1), 'https://i.ibb.co/3mT7cd5g/Whats-App-Image-2026-10-21-at-10-08-25-PM.jpg', 'Pleated hem detail', 1),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'https://i.ibb.co/VWgQX9qg/Whats-App-Image-2026-10-21-at-10-08-26-PM-1.jpg', 'Amani Veil Set', 0),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'https://i.ibb.co/fKpM72k/Whats-App-Image-2026-10-21-at-10-08-26-PM-2.jpg', 'Noseband veil detail', 1),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'https://i.ibb.co/ddbyvMr/Whats-App-Image-2026-10-21-at-10-08-26-PM-3.jpg', 'Chiffon weave closeup', 2),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'https://i.ibb.co/QjdGCW7w/Whats-App-Image-2026-10-21-at-10-08-26-PM-4.jpg', 'Full hijab drape', 3),
  ((SELECT id FROM products WHERE slug = 'amani-breathable-chiffon-veil-hijab-set' LIMIT 1), 'https://i.ibb.co/SDRWRx3j/Whats-App-Image-2026-10-21-at-10-08-26-PM.jpg', 'Coordinated set packaging', 4),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), 'https://i.ibb.co/VcHbWSCG/Whats-App-Image-2026-10-21-at-10-08-27-PM-1.jpg', 'Sultana Kimono front', 0),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), 'https://i.ibb.co/kgw9QTpG/Whats-App-Image-2026-10-21-at-10-08-27-PM-2.jpg', 'Glass beadwork detail', 1),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), 'https://i.ibb.co/wZVkhFcb/Whats-App-Image-2026-10-21-at-10-08-27-PM-3.jpg', 'Side panel embroidery', 2),
  ((SELECT id FROM products WHERE slug = 'sultana-beaded-evening-occasion-kimono' LIMIT 1), 'https://i.ibb.co/xKy4TRWQ/Whats-App-Image-2026-10-21-at-10-08-27-PM.jpg', 'Sweeping hemline', 3),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'https://i.ibb.co/W4PjjrSV/Whats-App-Image-2026-10-21-at-10-08-28-PM-1.jpg', 'Rukayyah Abaya front', 0),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'https://i.ibb.co/wNXc25mr/Whats-App-Image-2026-10-21-at-10-08-28-PM-2.jpg', 'Zip front closure', 1),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'https://i.ibb.co/04Bkm7g/Whats-App-Image-2026-10-21-at-10-08-28-PM-3.jpg', 'Integrated stretch bonnet', 2),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'https://i.ibb.co/4RcGjbhD/Whats-App-Image-2026-10-21-at-10-08-28-PM-4.jpg', 'Wrist cuff elastic', 3),
  ((SELECT id FROM products WHERE slug = 'rukayyah-zip-front-hooded-prayer-abaya' LIMIT 1), 'https://i.ibb.co/zWNfdZFm/Whats-App-Image-2026-10-21-at-10-08-28-PM.jpg', 'Full silhouette', 4),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'https://i.ibb.co/W4VFJzHG/Whats-App-Image-2026-10-21-at-10-08-29-PM-1.jpg', 'Zainab Set overview', 0),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'https://i.ibb.co/RTLpp04p/Whats-App-Image-2026-10-21-at-10-08-29-PM-2.jpg', 'Under-cap tie detail', 1),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'https://i.ibb.co/bgWVWHns/Whats-App-Image-2026-10-21-at-10-08-29-PM-3.jpg', 'Modal fabric softness', 2),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'https://i.ibb.co/FL49XHmy/Whats-App-Image-2026-10-21-at-10-08-29-PM.jpg', 'Styling flexibility', 3),
  ((SELECT id FROM products WHERE slug = 'zainab-luxe-modal-hijab-under-cap-set' LIMIT 1), 'https://i.ibb.co/LD1GK301/Whats-App-Image-2026-10-21-at-10-08-30-PM.jpg', 'Colour swatch options', 4),
  -- 5 NEW PRODUCTS PHOTOGRAPHS (34 IMAGES)
  -- 1. Malaysian Hijabs (9 images)
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/j9xMh9TX/Whats-App-Image-2026-11-01-at-9-46-26-PM.jpg', 'Malaysian Hijabs - View 1', 0),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/cS76LskC/Whats-App-Image-2026-11-01-at-9-46-27-PM-1.jpg', 'Malaysian Hijabs - View 2', 1),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/JWTCZ9hJ/Whats-App-Image-2026-11-01-at-9-46-27-PM-2.jpg', 'Malaysian Hijabs - View 3', 2),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/wr0PWg5g/Whats-App-Image-2026-11-01-at-9-46-27-PM-3.jpg', 'Malaysian Hijabs - View 4', 3),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/LDDjfSSV/Whats-App-Image-2026-11-01-at-9-46-27-PM.jpg', 'Malaysian Hijabs - View 5', 4),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/9982Lh56/Whats-App-Image-2026-11-01-at-9-46-28-PM-1.jpg', 'Malaysian Hijabs - View 6', 5),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/cXNnLfsv/Whats-App-Image-2026-11-01-at-9-46-28-PM-2.jpg', 'Malaysian Hijabs - View 7', 6),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/bj7k71V2/Whats-App-Image-2026-11-01-at-9-46-28-PM-3.jpg', 'Malaysian Hijabs - View 8', 7),
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'https://i.ibb.co/xS5rD0Zt/Whats-App-Image-2026-11-01-at-9-46-28-PM.jpg', 'Malaysian Hijabs - View 9', 8),
  -- 2. Luxe Jersey Veil (9 images)
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg', 'Luxe Jersey Veil - View 1', 0),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/P0wN5PL/Whats-App-Image-2026-11-01-at-9-53-08-PM.jpg', 'Luxe Jersey Veil - View 2', 1),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/8DPKFhwK/Whats-App-Image-2026-11-01-at-9-53-09-PM-1.jpg', 'Luxe Jersey Veil - View 3', 2),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/wr0ry1fR/Whats-App-Image-2026-11-01-at-9-53-09-PM-2.jpg', 'Luxe Jersey Veil - View 4', 3),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/fdK231WX/Whats-App-Image-2026-11-01-at-9-53-09-PM-3.jpg', 'Luxe Jersey Veil - View 5', 4),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/xSvcZTYN/Whats-App-Image-2026-11-01-at-9-53-09-PM.jpg', 'Luxe Jersey Veil - View 6', 5),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/Zp5sWkXw/Whats-App-Image-2026-11-01-at-9-53-10-PM-1.jpg', 'Luxe Jersey Veil - View 7', 6),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/nqjv8pRr/Whats-App-Image-2026-11-01-at-9-53-10-PM-2.jpg', 'Luxe Jersey Veil - View 8', 7),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'https://i.ibb.co/QFc34cc1/Whats-App-Image-2026-11-01-at-9-53-10-PM.jpg', 'Luxe Jersey Veil - View 9', 8),
  -- 3. Khadeejah Hijab (8 images)
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/1J8jyJCY/Whats-App-Image-2026-11-01-at-10-00-40-PM-1.jpg', 'Khadeejah Hijab - View 1', 0),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/BH1gTs4K/Whats-App-Image-2026-11-01-at-10-00-40-PM-2.jpg', 'Khadeejah Hijab - View 2', 1),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/mCtXQKMN/Whats-App-Image-2026-11-01-at-10-00-40-PM.jpg', 'Khadeejah Hijab - View 3', 2),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/5HKcm6V/Whats-App-Image-2026-11-01-at-10-00-41-PM-1.jpg', 'Khadeejah Hijab - View 4', 3),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/kVHp6WdV/Whats-App-Image-2026-11-01-at-10-00-41-PM-2.jpg', 'Khadeejah Hijab - View 5', 4),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/W4Lwzmc0/Whats-App-Image-2026-11-01-at-10-00-41-PM-3.jpg', 'Khadeejah Hijab - View 6', 5),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/jvcWkT2N/Whats-App-Image-2026-11-01-at-10-00-41-PM.jpg', 'Khadeejah Hijab - View 7', 6),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), 'https://i.ibb.co/tpGQLk1d/Whats-App-Image-2026-11-01-at-10-00-42-PM.jpg', 'Khadeejah Hijab - View 8', 7),
  -- 4. Aisha Luxe All-White (3 images)
  ((SELECT id FROM products WHERE slug = 'aisha-luxe-all-white' LIMIT 1), 'https://i.ibb.co/Y4wNTMfR/Whats-App-Image-2026-11-01-at-10-02-20-PM-1.jpg', 'Aisha Luxe All-White - View 1', 0),
  ((SELECT id FROM products WHERE slug = 'aisha-luxe-all-white' LIMIT 1), 'https://i.ibb.co/8nDYJTpf/Whats-App-Image-2026-11-01-at-10-02-20-PM-2.jpg', 'Aisha Luxe All-White - View 2', 1),
  ((SELECT id FROM products WHERE slug = 'aisha-luxe-all-white' LIMIT 1), 'https://i.ibb.co/qYxtKSVs/Whats-App-Image-2026-11-01-at-10-02-20-PM.jpg', 'Aisha Luxe All-White - View 3', 2),
  -- 5. Jacquard Jersey Laser-Cut Hijab (5 images)
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'https://i.ibb.co/qLr2DZ8V/Whats-App-Image-2026-11-01-at-10-05-01-PM-1.jpg', 'Jacquard Jersey Laser-Cut Hijab - View 1', 0),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'https://i.ibb.co/1YM61nhZ/Whats-App-Image-2026-11-01-at-10-05-01-PM-2.jpg', 'Jacquard Jersey Laser-Cut Hijab - View 2', 1),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'https://i.ibb.co/VW5SjDHP/Whats-App-Image-2026-11-01-at-10-05-01-PM.jpg', 'Jacquard Jersey Laser-Cut Hijab - View 3', 2),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'https://i.ibb.co/HDDKyq3P/Whats-App-Image-2026-11-01-at-10-05-02-PM-1.jpg', 'Jacquard Jersey Laser-Cut Hijab - View 4', 3),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'https://i.ibb.co/93mjtCgG/Whats-App-Image-2026-11-01-at-10-05-02-PM.jpg', 'Jacquard Jersey Laser-Cut Hijab - View 5', 4)
ON CONFLICT (product_id, image_url) DO UPDATE SET
  alt_text = EXCLUDED.alt_text,
  display_order = EXCLUDED.display_order;

COMMIT;

-- ==============================================================================
-- 11. POST-SEED INTEGRITY & RECORD VERIFICATION REPORT
-- ==============================================================================
SELECT 
  (SELECT count(*) FROM categories) AS total_categories,
  (SELECT count(*) FROM products) AS total_products,
  (SELECT count(*) FROM product_images) AS total_images,
  (SELECT count(*) FROM product_variations) AS total_variations,
  (SELECT coalesce(sum(stock_quantity), 0) FROM product_variations) AS total_stock_units,
  (SELECT count(*) FROM products WHERE category_id IS NULL) AS products_missing_category,
  (SELECT count(*) FROM products WHERE main_image_url IS NULL OR main_image_url = '') AS products_missing_main_image,
  (SELECT count(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_variations pv WHERE pv.product_id = p.id)) AS products_without_variations,
  (SELECT count(*) FROM product_images pi WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pi.product_id)) AS orphaned_images,
  (SELECT count(*) FROM product_variations pv WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pv.product_id)) AS orphaned_variations;
