-- ============================================================================
-- TEEFAHS CLOTHIER — COMPREHENSIVE DATABASE SECURITY HARDENING MIGRATION
-- Target Project: mxovvqjyfgyrzjauzodh
-- Idempotent & Safe for Live Production Database
-- Execute in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
-- ============================================================================

BEGIN;

-- 1. ENSURE SOFT-DELETE / ARCHIVE COLUMNS EXIST ON PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

UPDATE public.products
SET is_archived = false
WHERE is_archived IS NULL;

-- 2. VERIFIED ADMINISTRATOR REGISTRY (public.admin_users)
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

-- 3. APPEND-ONLY ADMIN AUDIT LOG TABLE (public.admin_audit_logs)
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

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON public.admin_audit_logs (created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. HARDENED SERVER-SIDE public.is_admin() FUNCTION
--    - Strictly requires authenticated role + non-null auth.uid()
--    - Verifies email_confirmed_at IS NOT NULL and account is not banned in auth.users
--    - Checks ONLY server-controlled app_metadata.role = 'admin' OR active admin_users row
--    - NEVER trusts client-writable user_metadata
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

-- Note: anon MUST retain EXECUTE on public.is_admin() because public SELECT RLS
-- expressions include `OR public.is_admin()`; the function immediately returns FALSE for anon.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 5. DYNAMICALLY DROP ALL EXISTING POLICIES ON CORE TABLES & STORAGE
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

-- 6. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. PUBLIC READ-ONLY SELECT POLICIES (NO PUBLIC WRITE ACCESS, NO DRAFTS/ARCHIVES)
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

-- 8. STRICT ADMIN-ONLY POLICIES FOR PROTECTED TABLES & WRITES
CREATE POLICY "Admin read store settings" ON public.store_settings
  FOR SELECT TO authenticated
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

-- Append-only audit logs: admins can read and insert; nobody can update or delete via API
CREATE POLICY "Admin read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

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

-- 9. STORAGE BUCKET & OBJECT HARDENING ('product-images')
--    Note: Public image CDN URLs (/storage/v1/object/public/product-images/...)
--    continue working via the bucket's public=true flag while anonymous directory
--    enumeration (/storage/v1/object/list/product-images) is blocked.
UPDATE storage.buckets
SET
  file_size_limit = 31457280,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
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

-- 10. NON-NEGATIVE PRICE & STOCK INTEGRITY CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_base_price_non_negative'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_base_price_non_negative
      CHECK (base_price IS NULL OR base_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_sale_price_non_negative'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_sale_price_non_negative
      CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variations_stock_non_negative'
      AND conrelid = 'public.product_variations'::regclass
  ) THEN
    ALTER TABLE public.product_variations
      ADD CONSTRAINT product_variations_stock_non_negative
      CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- 11. ENSURE SUPABASE REALTIME PUBLICATION REMAINS ACTIVE
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

COMMIT;
