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

-- 2. VERIFIED ADMINISTRATOR REGISTRY & HARDENED public.is_admin() FUNCTION
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_users (email, role, is_active)
VALUES
  ('queenlateefalive@yahoo.com', 'admin', true),
  ('greatezirim8@gmail.com', 'admin', true)
ON CONFLICT (email) DO UPDATE
SET is_active = true, role = 'admin';

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  caller_uid UUID;
  caller_email TEXT;
  email_confirmed BOOLEAN;
  is_banned BOOLEAN;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RETURN FALSE;
  END IF;

  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT
    u.email,
    (u.email_confirmed_at IS NOT NULL),
    (u.banned_until IS NOT NULL AND u.banned_until > NOW())
  INTO caller_email, email_confirmed, is_banned
  FROM auth.users u
  WHERE u.id = caller_uid;

  IF NOT FOUND OR NOT COALESCE(email_confirmed, FALSE) OR COALESCE(is_banned, FALSE) THEN
    RETURN FALSE;
  END IF;

  IF LOWER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin' THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE LOWER(a.email) = LOWER(COALESCE(caller_email, ''))
      AND a.is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

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
        'store_settings',
        'admin_users',
        'admin_audit_logs'
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
        OR COALESCE(qual, '') ILIKE '%product-images%'
        OR COALESCE(with_check, '') ILIKE '%product-images%'
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

CREATE POLICY "Admin read admin_users" ON public.admin_users
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin write admin_users" ON public.admin_users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 8. STORAGE BUCKET POLICIES ('product-images')
-- Public image CDN URLs work via bucket public=true; directory listing and writes require verified admin.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'product-images';

CREATE POLICY "Admin read product-images bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

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
