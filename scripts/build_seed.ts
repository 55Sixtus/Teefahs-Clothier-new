import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../src/data/initialCatalogue';
import * as fs from 'fs';
import * as path from 'path';

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

let sql = `-- ==============================================================================
-- TEEFAHS CLOTHIER — SECURE ROW LEVEL SECURITY & PRODUCTION CATALOGUE SEED
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
--
-- Features:
-- 1. Hardened Row Level Security (RLS) with strict least-privilege policies:
--    - Public / Anonymous visitors: READ-ONLY access to published products, active categories,
--      associated gallery photographs, and active variations.
--    - Authenticated Store Administrators: Full management permissions verified via
--      secure role check and verified store owner email (queenlateefalive@yahoo.com).
--    - No public write/update/delete permissions whatsoever.
-- 2. Safely populates the official boutique catalogue:
--    - 8 boutique categories
--    - 11 distinct modest garments
--    - 27 size and colour variations
--    - 54 original photoshoot photographs
--    - 267 total verified stock inventory units
-- 3. Employs dynamic foreign-key resolution (using slugs) to prevent hardcoded UUID mismatches.
-- 4. Uses unique constraints and non-destructive upserts (no DELETE statements).
--    Subsequent executions will NEVER delete newly added products or wipe modified stock!
-- 5. Wrapped in a transaction with an automated post-seed verification diagnostic.
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

-- Seed verified store owner and administrative accounts
INSERT INTO admin_users (email, role, is_active)
VALUES
  ('queenlateefalive@yahoo.com', 'admin', true),
  ('greatezirim8@gmail.com', 'admin', true)
ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'admin';

-- Secure admin verification function (SECURITY DEFINER allows reading admin_users table)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Check verified store owner & admin emails in JWT
  IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Check JWT app_metadata role
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- 3. Check admin_users table
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

-- 5. LEAST-PRIVILEGE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Drop all legacy and permissive policies
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

-- PUBLIC READ-ONLY POLICIES (No write/update/delete permissions for unauthenticated visitors)
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

-- AUTHENTICATED ADMINISTRATOR POLICIES (Strictly protected by is_admin())
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
INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
VALUES\n`;

const catInserts = INITIAL_CATEGORIES.map(c => {
  return `  ('${escapeSql(c.name)}', '${escapeSql(c.slug)}', '${escapeSql(c.description || '')}', '${escapeSql(c.image_url || '')}', ${c.display_order}, true)`;
}).join(',\n');

sql += catInserts;
sql += `\nON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 7. POPULATE 11 OFFICIAL PHOTOSHOOT GARMENTS (Dynamic category foreign keys)
INSERT INTO products (name, slug, short_description, description, category_id, main_image_url, base_price, currency, is_published, is_featured, is_new_arrival)
VALUES\n`;

const catSlugMap: Record<string, string> = {
  'c0000000-0000-0000-0000-000000000001': 'abayas',
  'c0000000-0000-0000-0000-000000000002': 'khimars',
  'c0000000-0000-0000-0000-000000000003': 'hijabs',
  'c0000000-0000-0000-0000-000000000004': 'veils',
  'c0000000-0000-0000-0000-000000000005': 'prayer-wear',
  'c0000000-0000-0000-0000-000000000006': 'occasion-wear',
  'c0000000-0000-0000-0000-000000000007': 'caps',
  'c0000000-0000-0000-0000-000000000008': 'accessories',
};

const prodInserts = INITIAL_PRODUCTS.map(p => {
  const catSlug = catSlugMap[p.category_id || ''] || 'abayas';
  return `  (
    '${escapeSql(p.name)}',
    '${escapeSql(p.slug)}',
    '${escapeSql(p.short_description || '')}',
    '${escapeSql(p.description || '')}',
    (SELECT id FROM categories WHERE slug = '${catSlug}' LIMIT 1),
    '${escapeSql(p.main_image_url || '')}',
    ${p.base_price || 0},
    'NGN',
    ${p.is_published ? 'true' : 'false'},
    ${p.is_featured ? 'true' : 'false'},
    ${p.is_new_arrival ? 'true' : 'false'}
  )`;
}).join(',\n');

sql += prodInserts;
sql += `\nON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  main_image_url = EXCLUDED.main_image_url,
  base_price = EXCLUDED.base_price,
  is_published = EXCLUDED.is_published,
  is_featured = EXCLUDED.is_featured,
  is_new_arrival = EXCLUDED.is_new_arrival;

-- 8. POPULATE 27 PRODUCT VARIATIONS (Sizes, Colours, 267 Stock Units)
-- Safe upsert: preserves existing stock modifications made by the business owner
INSERT INTO product_variations (product_id, size, colour, stock_quantity, is_active)
VALUES\n`;

const varInserts: string[] = [];
INITIAL_PRODUCTS.forEach(p => {
  (p.variations || []).forEach(v => {
    varInserts.push(`  ((SELECT id FROM products WHERE slug = '${escapeSql(p.slug)}' LIMIT 1), '${escapeSql(v.size || '')}', '${escapeSql(v.colour || '')}', ${v.stock_quantity || 0}, ${v.is_active ? 'true' : 'false'})`);
  });
});

sql += varInserts.join(',\n');
sql += `\nON CONFLICT (product_id, size, colour) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 9. POPULATE 54 ORIGINAL PHOTOSHOOT GALLERY PHOTOGRAPHS
-- Safe upsert: avoids duplicate photographs and preserves newly added gallery images
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
VALUES\n`;

const imgInserts: string[] = [];
INITIAL_PRODUCTS.forEach(p => {
  (p.images || []).forEach((img, idx) => {
    imgInserts.push(`  ((SELECT id FROM products WHERE slug = '${escapeSql(p.slug)}' LIMIT 1), '${escapeSql(img.image_url)}', '${escapeSql(img.alt_text || p.name)}', ${idx})`);
  });
});

sql += imgInserts.join(',\n');
sql += `\nON CONFLICT (product_id, image_url) DO UPDATE SET
  alt_text = EXCLUDED.alt_text,
  display_order = EXCLUDED.display_order;

COMMIT;

-- ==============================================================================
-- 10. POST-SEED INTEGRITY & RECORD VERIFICATION REPORT
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
`;

fs.writeFileSync(path.resolve(process.cwd(), 'database/seed.sql'), sql);

const tsContent = `// Complete, verified, least-privilege SQL schema and production data seed script for Supabase
// Run this directly in Supabase SQL Editor: https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql

export const SUPABASE_SEED_SQL = ${JSON.stringify(sql)};\n`;

fs.writeFileSync(path.resolve(process.cwd(), 'src/data/supabaseSeedSql.ts'), tsContent);
console.log('Successfully generated database/seed.sql and src/data/supabaseSeedSql.ts!');
