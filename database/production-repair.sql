-- ============================================================================
-- TEEFAHS CLOTHIER — PRODUCTION SECURITY, REALTIME & DATA REPAIR MIGRATION
-- Target Project: mxovvqjyfgyrzjauzodh
-- Idempotent & Safe for Live Production Database
-- ============================================================================

-- 1. ENSURE SOFT-DELETE / ARCHIVE COLUMNS EXIST ON PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

UPDATE public.products
SET is_archived = false
WHERE is_archived IS NULL;

-- 2. CREATE / HARDEN public.is_admin() VERIFICATION FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated' AND (
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
        'queenlateefalive@yahoo.com',
        'greatezirim8@gmail.com'
      )
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. DYNAMICALLY DROP ALL EXISTING POLICIES ON CORE COMMERCE TABLES
--    (Removes any manually created permissive FOR ALL TO anon, authenticated USING (true) WITH CHECK (true) policies)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'products',
        'categories',
        'product_images',
        'product_variations',
        'promotions',
        'store_settings'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Also clean up any overly permissive storage.objects policies on the 'product-images' bucket
DO $$
DECLARE
  spol RECORD;
BEGIN
  FOR spol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%product-images%'
        OR policyname ILIKE '%Allow all%'
        OR policyname ILIKE '%Public%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', spol.policyname);
  END LOOP;
END $$;

-- 4. ENSURE PROMOTIONS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  badge_text TEXT DEFAULT 'PROMO ALERT',
  subtext TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 6. PUBLIC READ (SELECT) POLICIES (STRICTLY NON-ARCHIVED / PUBLISHED / ACTIVE)
CREATE POLICY "Public read published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    (is_published = true AND COALESCE(is_archived, false) = false AND deleted_at IS NULL)
    OR public.is_admin()
  );

CREATE POLICY "Public read active categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Public read active product variations" ON public.product_variations
  FOR SELECT TO anon, authenticated
  USING (
    (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variations.product_id
          AND p.is_published = true
          AND COALESCE(p.is_archived, false) = false
          AND p.deleted_at IS NULL
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Public read published product images" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.is_published = true
        AND COALESCE(p.is_archived, false) = false
        AND p.deleted_at IS NULL
    )
    OR public.is_admin()
  );

CREATE POLICY "Public read active promotions" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin read store settings" ON public.store_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 7. ADMIN-ONLY WRITE (INSERT, UPDATE, DELETE) POLICIES
CREATE POLICY "Admin insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert categories" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin update categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete categories" ON public.categories
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert product_images" ON public.product_images
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin update product_images" ON public.product_images
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete product_images" ON public.product_images
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert product_variations" ON public.product_variations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin update product_variations" ON public.product_variations
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete product_variations" ON public.product_variations
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert promotions" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin update promotions" ON public.promotions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete promotions" ON public.promotions
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin write store settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. STORAGE BUCKET POLICIES ('product-images')
-- Public can read product images; only verified admins can upload, overwrite, or delete files.
CREATE POLICY "Public read product-images bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin insert product-images bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin update product-images bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin delete product-images bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- 9. ENABLE SUPABASE REALTIME FOR ALL LIVE CATALOGUE TABLES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products',
    'categories',
    'product_images',
    'product_variations',
    'promotions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;

-- 10. PRICE & DATA RECONCILIATION
-- Standardise genuine Abayas to ₦229,500 authoritative selling price (with optional ₦255,000 original price)
UPDATE public.products
SET
  base_price = 229500,
  sale_price = 255000,
  updated_at = NOW()
WHERE slug IN ('noor-embroidered-luxury-abaya', 'fatima-pleated-hem-minimalist-abaya')
   OR name ILIKE '%Noor Embellished Luxury Abaya%'
   OR name ILIKE '%Fatima Pleated Hem Minimalist Abaya%';

-- Preserve Comfort Fit Jersey Cap at ₦1,500
UPDATE public.products
SET base_price = 1500, updated_at = NOW()
WHERE slug = 'jersey-cap' OR name ILIKE '%Comfort Fit Jersey Cap%';

-- Archive any accidentally seeded unapproved third-party Khimar catalog items
UPDATE public.products
SET
  is_published = false,
  is_archived = true,
  deleted_at = NOW(),
  deleted_by = 'System Cleanup',
  updated_at = NOW()
WHERE slug IN (
  'french-flowing-trio-crepe-khimar-set',
  'diamond-back-drape-french-khimar',
  'medina-layered-niqab-khimar-handsocks-set',
  'signature-french-medina-khimar-palette-collection'
)
OR main_image_url IN (
  '/assets/aistudio/image_f09b866e.png',
  '/assets/aistudio/image_7b2317e4.png',
  '/assets/aistudio/image_7378d334.png',
  '/assets/aistudio/image_93cf9d3d.png'
);
