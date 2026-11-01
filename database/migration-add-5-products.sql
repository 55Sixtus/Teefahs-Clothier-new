-- ==============================================================================
-- TEEFAHS CLOTHIER — 5 NEW PRODUCTS, PHOTOGRAPHS & CATEGORY NORMALIZATION
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
--
-- What this does:
-- 1. Corrects Category 4 name to 'Veils' (slug: 'veils') with Luxe Jersey Veil cover.
-- 2. Moves 'Amani Breathable Chiffon Veil & Hijab Set' to 'Hijabs' category.
-- 3. Adds 5 New Official Products:
--    - Malaysian Hijabs (Hijabs, XL, ₦11,000, 9 photos)
--    - Luxe Jersey Veil (Veils, Medium, ₦6,000, 9 photos)
--    - Khadeejah Hijab (Hijabs, 4XL, ₦16,000, 8 photos)
--    - Aisha Luxe All-White (Hijabs, 4XL, ₦15,000, 3 photos)
--    - Jacquard Jersey Laser-Cut Hijab (Hijabs, XL & 2XL, ₦12,000, 5 photos)
-- 4. Inserts all 34 product gallery photographs.
-- 5. Safe & Idempotent: Can be run multiple times without duplicating rows.
-- ==============================================================================

BEGIN;

-- 1. CATEGORY NORMALIZATION
UPDATE categories 
SET 
  name = 'Veils', 
  slug = 'veils',
  description = 'Delicate single and multi-layer stretch jersey veils and breathable niqabs for modest elegance.',
  image_url = 'https://i.ibb.co/q2Lr31M/Whats-App-Image-2026-11-01-at-9-53-08-PM-1.jpg'
WHERE slug = 'veils' OR slug = 'niqabs-veils';

-- Ensure Amani Set is assigned to Hijabs
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'hijabs' LIMIT 1)
WHERE slug = 'amani-breathable-chiffon-veil-hijab-set';

-- 2. INSERT 5 NEW PRODUCTS
INSERT INTO products (name, slug, short_description, description, category_id, main_image_url, base_price, currency, is_published, is_featured, is_new_arrival)
VALUES
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

-- 3. INSERT VARIATIONS (SIZES & STOCK)
INSERT INTO product_variations (product_id, size, colour, stock_quantity, is_active)
VALUES
  ((SELECT id FROM products WHERE slug = 'malaysian-hijabs' LIMIT 1), 'XL', 'Boutique Collection', 15, true),
  ((SELECT id FROM products WHERE slug = 'luxe-jersey-veil' LIMIT 1), 'Medium', 'Sage Olive', 20, true),
  ((SELECT id FROM products WHERE slug = 'khadeejah-hijab' LIMIT 1), '4XL', 'Blush Rose', 12, true),
  ((SELECT id FROM products WHERE slug = 'aisha-luxe-all-white' LIMIT 1), '4XL', 'Pristine White', 10, true),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), 'XL', 'Laser-Cut Pattern', 12, true),
  ((SELECT id FROM products WHERE slug = 'jacquard-jersey-laser-cut-hijab' LIMIT 1), '2XL', 'Laser-Cut Pattern', 12, true)
ON CONFLICT (product_id, size, colour) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 4. INSERT 34 PHOTOGRAPHS INTO PRODUCT_IMAGES
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
VALUES
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

-- VERIFICATION REPORT
SELECT 
  p.name,
  p.slug,
  c.name AS category,
  p.base_price,
  count(pi.id) AS image_count,
  count(distinct pv.id) AS variation_count
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN product_images pi ON pi.product_id = p.id
LEFT JOIN product_variations pv ON pv.product_id = p.id
WHERE p.slug IN (
  'malaysian-hijabs',
  'luxe-jersey-veil',
  'khadeejah-hijab',
  'aisha-luxe-all-white',
  'jacquard-jersey-laser-cut-hijab',
  'amani-breathable-chiffon-veil-hijab-set'
)
GROUP BY p.id, p.name, p.slug, c.name, p.base_price
ORDER BY c.name, p.name;
