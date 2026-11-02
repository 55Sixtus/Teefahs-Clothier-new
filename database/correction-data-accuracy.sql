-- ==============================================================================
-- TEEFAHS CLOTHIER — PRODUCTION DATA ACCURACY & DEDUPLICATION MIGRATION
-- Project: mxovvqjyfgyrzjauzodh (Teefahs Clothier)
-- Date: November 2026
-- Instructions: Run this script in the Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- 1. AUDIT & RESOLVE DUPLICATE 'veil' PRODUCT
-- Delete variations and images belonging to obsolete duplicate placeholder 'veil'
-- (Keeping the owner-confirmed 'luxe-jersey-veil' intact in the Veils category)
DELETE FROM product_variations
WHERE product_id IN (SELECT id FROM products WHERE slug = 'veil');

DELETE FROM product_images
WHERE product_id IN (SELECT id FROM products WHERE slug = 'veil');

DELETE FROM products
WHERE slug = 'veil';

-- 2. PURGE UNCONFIRMED CLAIMS & RESTORE FACTUAL PRODUCT DESCRIPTIONS
UPDATE products
SET 
  description = 'Malaysian hijab in size XL.',
  short_description = 'Malaysian hijab in size XL.'
WHERE slug = 'malaysian-hijabs';

UPDATE products
SET 
  description = 'Luxe jersey veil in size Medium.',
  short_description = 'Luxe jersey veil in size Medium.'
WHERE slug = 'luxe-jersey-veil';

UPDATE products
SET 
  description = 'Khadeejah hijab in size 4XL.',
  short_description = 'Khadeejah hijab in size 4XL.'
WHERE slug = 'khadeejah-hijab';

UPDATE products
SET 
  description = 'Aisha luxe all-white hijab in size 4XL.',
  short_description = 'Aisha luxe all-white hijab in size 4XL.'
WHERE slug = 'aisha-luxe-all-white';

UPDATE products
SET 
  description = 'Jacquard jersey laser-cut hijab available in sizes XL and 2XL.',
  short_description = 'Jacquard jersey laser-cut hijab available in sizes XL and 2XL.'
WHERE slug = 'jacquard-jersey-laser-cut-hijab';

-- 3. REMOVE UNCONFIRMED INVENTORY & FABRICATED COLOURS FOR THE 5 NEW PRODUCTS
-- Reset stock_quantity to 0 (unconfirmed stock state) and colour to 'Standard'
UPDATE product_variations
SET 
  stock_quantity = 0,
  colour = 'Standard'
WHERE product_id = (SELECT id FROM products WHERE slug = 'malaysian-hijabs');

UPDATE product_variations
SET 
  stock_quantity = 0,
  colour = 'Standard'
WHERE product_id = (SELECT id FROM products WHERE slug = 'luxe-jersey-veil');

UPDATE product_variations
SET 
  stock_quantity = 0,
  colour = 'Standard'
WHERE product_id = (SELECT id FROM products WHERE slug = 'khadeejah-hijab');

UPDATE product_variations
SET 
  stock_quantity = 0,
  colour = 'Standard'
WHERE product_id = (SELECT id FROM products WHERE slug = 'aisha-luxe-all-white');

UPDATE product_variations
SET 
  stock_quantity = 0,
  colour = 'Standard'
WHERE product_id = (SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab');

-- 4. CONFIRM THAT JACQUARD HAS BOTH XL AND 2XL VARIATIONS AT 0 STOCK
INSERT INTO product_variations (id, product_id, size, colour, stock_quantity, is_active)
SELECT 
  gen_random_uuid(),
  p.id,
  '2XL',
  'Standard',
  0,
  true
FROM products p
WHERE p.slug = 'jacquard-jersey-laser-cut-hijab'
  AND NOT EXISTS (
    SELECT 1 FROM product_variations pv 
    WHERE pv.product_id = p.id AND pv.size = '2XL'
  );

COMMIT;

-- ==============================================================================
-- POST-MIGRATION VERIFICATION AUDIT QUERIES
-- ==============================================================================

-- Verification 1: Verify total count of active products (Expected: exactly 16)
SELECT 
  COUNT(*) AS total_products,
  COUNT(CASE WHEN is_published = true THEN 1 END) AS published_products
FROM products
WHERE is_archived = false OR is_archived IS NULL;

-- Verification 2: Verify the 5 new products' exact configuration
SELECT 
  p.name,
  p.slug,
  c.name AS category_name,
  p.base_price,
  p.description,
  pv.size,
  pv.colour,
  pv.stock_quantity AS unconfirmed_stock_state,
  (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS photo_count
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN product_variations pv ON pv.product_id = p.id
WHERE p.slug IN (
  'malaysian-hijabs',
  'luxe-jersey-veil',
  'khadeejah-hijab',
  'aisha-luxe-all-white',
  'jacquard-jersey-laser-cut-hijab'
)
ORDER BY p.name, pv.size;

-- Verification 3: Verify intact inventory of the original 11 products (Expected: 267 units)
SELECT 
  SUM(pv.stock_quantity) AS original_11_products_stock
FROM product_variations pv
JOIN products p ON p.id = pv.product_id
WHERE p.slug NOT IN (
  'malaysian-hijabs',
  'luxe-jersey-veil',
  'khadeejah-hijab',
  'aisha-luxe-all-white',
  'jacquard-jersey-laser-cut-hijab'
);
