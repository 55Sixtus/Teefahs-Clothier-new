-- ==============================================================================
-- TEEFAHS CLOTHIER — COMFORT FIT JERSEY CAP (₦1,500) DATABASE INSERT & SYNC
-- Project: mxovvqjyfgyrzjauzodh
-- ==============================================================================

BEGIN;

-- 1. Ensure Caps Category Exists
INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
VALUES (
  'Caps',
  'caps',
  'Ergonomic tie-back under-caps and volumizing cotton caps.',
  '/assets/aistudio/WhatsApp_Image_2026-11-06_at_10.12.17_PM_f2218f6e.jpeg',
  7,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  is_active = true;

-- 2. Insert or Update Comfort Fit Jersey Cap with confirmed price ₦1,500
INSERT INTO products (
  name,
  slug,
  short_description,
  description,
  category_id,
  main_image_url,
  base_price,
  currency,
  is_published,
  is_featured,
  is_new_arrival
)
VALUES (
  'Comfort Fit Jersey Cap',
  'jersey-cap',
  'Ergonomic non-slip stretch jersey cap crafted for all-day comfort and hair security.',
  'Breathable, non-slip cotton-jersey cap tailored for effortless all-day wear without pressure or tension. Features an ergonomic cut to keep hair neatly secured beneath any hijab or veil.',
  (SELECT id FROM categories WHERE slug = 'caps' LIMIT 1),
  '/assets/aistudio/WhatsApp_Image_2026-11-06_at_10.12.17_PM_f2218f6e.jpeg',
  1500,
  'NGN',
  true,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  base_price = 1500,
  main_image_url = EXCLUDED.main_image_url,
  category_id = EXCLUDED.category_id,
  is_published = true;

-- 3. Insert Variations
INSERT INTO product_variations (product_id, size, colour, stock_quantity, is_active)
VALUES
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), 'Standard Fit', 'Teal Blue', 30, true),
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), 'Standard Fit', 'Jet Black', 30, true),
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), 'Standard Fit', 'Nude Biscotti', 30, true)
ON CONFLICT DO NOTHING;

-- 4. Insert Gallery Images
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
VALUES
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), '/assets/aistudio/WhatsApp_Image_2026-11-06_at_10.12.17_PM_f2218f6e.jpeg', 'Blue jersey cap - Main Cover View', 0),
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), 'https://i.ibb.co/s9GMr74w/Whats-App-Image-2026-11-06-at-10-11-47-PM.jpg', 'Jersey cap - Additional Angle', 1),
  ((SELECT id FROM products WHERE slug = 'jersey-cap' LIMIT 1), 'https://i.ibb.co/7NBG3fs0/Whats-App-Image-2026-11-06-at-10-12-17-PM.jpg', 'Jersey cap - Color Selection', 2)
ON CONFLICT DO NOTHING;

COMMIT;

-- 5. Verification Query (Returns the confirmed row with ₦1,500)
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  c.name AS category_name, 
  p.base_price, 
  p.currency, 
  p.is_published 
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.slug = 'jersey-cap';
