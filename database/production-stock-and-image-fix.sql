-- ============================================================================
-- TEEFAHS CLOTHIER — PRODUCTION STOCK, IMAGE & PRICE PERSISTENCE SQL SCRIPT
-- Target Supabase Project: mxovvqjyfgyrzjauzodh
-- INSTRUCTIONS FOR STORE OWNER:
-- 1. Log in to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Open your Teefahs Clothier project (mxovvqjyfgyrzjauzodh)
-- 3. Click on "SQL Editor" in the left navigation sidebar.
-- 4. Click "New Query", paste this entire script, and click "Run".
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. STOCK ADJUSTMENTS (+10 for sold out, +5 for low stock < 5)
--    Note: stock_quantity is stored on public.product_variations.
-- ----------------------------------------------------------------------------

UPDATE public.product_variations
SET
  stock_quantity = CASE
    WHEN COALESCE(stock_quantity, 0) <= 0 THEN COALESCE(stock_quantity, 0) + 10
    WHEN stock_quantity < 5 THEN stock_quantity + 5
    ELSE stock_quantity
  END,
  is_active = true
WHERE COALESCE(stock_quantity, 0) < 5;


-- ----------------------------------------------------------------------------
-- 2. FIX BROKEN KHIMAR IMAGES (Replace dead/404 image URLs with verified direct images)
-- ----------------------------------------------------------------------------

-- Fix Embroidered Hoodie Khimar (khimar-4)
UPDATE public.products
SET main_image_url = 'https://i.ibb.co/27fbZkL2/Whats-App-Image-2026-11-15-at-6-21-44-AM-3.jpg',
    updated_at = NOW()
WHERE slug = 'khimar-4' OR name ILIKE '%EMBROIDERED HOODIE KHIMAR%';

UPDATE public.product_images
SET image_url = 'https://i.ibb.co/27fbZkL2/Whats-App-Image-2026-11-15-at-6-21-44-AM-3.jpg'
WHERE image_url ILIKE '%nyqcz6x%'
   OR product_id IN (SELECT id FROM public.products WHERE slug = 'khimar-4' OR name ILIKE '%EMBROIDERED HOODIE KHIMAR%');

-- Fix Leemah Khimar
UPDATE public.products
SET main_image_url = 'https://i.ibb.co/ycckxf81/Whats-App-Image-2026-11-15-at-6-21-44-AM-1.jpg',
    updated_at = NOW()
WHERE slug = 'leemah-khimar' OR name ILIKE '%LEEMAH KHIMAR%';

UPDATE public.product_images
SET image_url = 'https://i.ibb.co/ycckxf81/Whats-App-Image-2026-11-15-at-6-21-44-AM-1.jpg'
WHERE image_url ILIKE '%vvdQHMMN%'
   OR product_id IN (SELECT id FROM public.products WHERE slug = 'leemah-khimar' OR name ILIKE '%LEEMAH KHIMAR%');


-- ----------------------------------------------------------------------------
-- 3. ENSURE RLS AND ADMIN POLICIES ALLOW SEAMLESS PRICE EDITS & DELETIONS
-- ----------------------------------------------------------------------------

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products
  FOR SELECT USING (is_archived IS NOT TRUE AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Public read product variations" ON public.product_variations;
CREATE POLICY "Public read product variations" ON public.product_variations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read product images" ON public.product_images;
CREATE POLICY "Public read product images" ON public.product_images
  FOR SELECT USING (true);

-- Admin full access for authorized store owners
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products" ON public.products
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  );

DROP POLICY IF EXISTS "Admin full access product variations" ON public.product_variations;
CREATE POLICY "Admin full access product variations" ON public.product_variations
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  );

DROP POLICY IF EXISTS "Admin full access product images" ON public.product_images;
DROP POLICY IF EXISTS "Product images admin write" ON public.product_images;
CREATE POLICY "Admin full access product images" ON public.product_images
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
  );

COMMIT;
