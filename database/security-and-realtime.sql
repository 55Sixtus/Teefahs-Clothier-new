-- ====================================================================
-- TEEFAHS CLOTHIER — PRODUCTION SECURITY & REALTIME MIGRATION
-- Project: mxovvqjyfgyrzjauzodh
-- ====================================================================

-- STEP 1: DROP PERMISSIVE WILDCARD POLICIES DYNAMICALLY
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'categories', 'product_images', 'product_variations', 'promotions', 'store_settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- STEP 2: ENSURE SOFT-DELETE COLUMNS EXIST ON PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

-- STEP 3: ENSURE is_admin() FUNCTION EXISTS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated' AND (
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 4: ENSURE PROMOTIONS TABLE EXISTS
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

-- STEP 5: ENABLE RLS ON ALL COMMERCE TABLES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- STEP 6: STRICT PUBLIC READ (SELECT) POLICIES
CREATE POLICY "Public read published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    (is_published = true AND COALESCE(is_archived, false) = false AND deleted_at IS NULL)
    OR public.is_admin()
  );

CREATE POLICY "Public read active categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

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

CREATE POLICY "Admin read store settings" ON public.store_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Public read active promotions" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

-- STEP 7: STRICT ADMIN WRITE (INSERT, UPDATE, DELETE) POLICIES
CREATE POLICY "Admin write products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin write categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin write product images" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin write product variations" ON public.product_variations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin write store settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin write promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STEP 8: ENABLE SUPABASE REALTIME REPLICATION
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['products', 'categories', 'product_images', 'product_variations', 'promotions']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;
