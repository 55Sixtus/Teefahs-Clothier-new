-- ====================================================================
-- TEEFAHS CLOTHIER — PRODUCTION SECURITY & REALTIME MIGRATION (CORRECTED)
-- Project: mxovvqjyfgyrzjauzodh
-- Note: Directly matches schema without non-existent 'product_categories' table.
-- ====================================================================

-- STEP 1: DROP PERMISSIVE WILDCARD POLICIES (IF THEY EXIST)
DROP POLICY IF EXISTS "Allow all actions for all users" ON products;
DROP POLICY IF EXISTS "Allow all actions for all users" ON categories;
DROP POLICY IF EXISTS "Allow all actions for all users" ON product_images;
DROP POLICY IF EXISTS "Allow all actions for all users" ON product_variations;
DROP POLICY IF EXISTS "Allow all actions for all users" ON store_settings;
DROP POLICY IF EXISTS "Public access policy" ON products;
DROP POLICY IF EXISTS "Public access policy" ON categories;

-- STEP 2: ENSURE is_admin() FUNCTION EXISTS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated' AND (
      auth.jwt() ->> 'email' IN ('queenlateefalive@yahoo.com', 'greatezirim8@gmail.com')
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: ENABLE RLS ON ALL EXISTING COMMERCE TABLES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- STEP 4: STRICT PUBLIC READ (SELECT) POLICIES
DROP POLICY IF EXISTS "Public read published products" ON products;
CREATE POLICY "Public read published products" ON products
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public read active categories" ON categories;
CREATE POLICY "Public read active categories" ON categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Public read product images" ON product_images;
CREATE POLICY "Public read product images" ON product_images
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read product variations" ON product_variations;
CREATE POLICY "Public read product variations" ON product_variations
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Public read store settings" ON store_settings;
CREATE POLICY "Public read store settings" ON store_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- STEP 5: STRICT ADMIN WRITE (INSERT, UPDATE, DELETE) POLICIES
DROP POLICY IF EXISTS "Admin write products" ON products;
CREATE POLICY "Admin write products" ON products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write categories" ON categories;
CREATE POLICY "Admin write categories" ON categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write product images" ON product_images;
CREATE POLICY "Admin write product images" ON product_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write product variations" ON product_variations;
CREATE POLICY "Admin write product variations" ON product_variations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin write store settings" ON store_settings;
CREATE POLICY "Admin write store settings" ON store_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STEP 6: DYNAMIC PROMOTIONS TABLE FOR REALTIME STOREFRONT ANNOUNCEMENTS
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

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active promotions" ON public.promotions;
CREATE POLICY "Public read active promotions" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write promotions" ON public.promotions;
CREATE POLICY "Admin write promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed the initial active promotional announcement
INSERT INTO public.promotions (title, message, badge_text, subtext, is_active)
VALUES (
  'Storefront Announcement',
  '✨ 10% PROMOTIONAL DISCOUNT ON ALL LUXURY ABAYAS & KHIMARS',
  'PROMO ALERT',
  'Excludes Caps & Accessories • Nationwide Delivery Across Nigeria',
  true
)
ON CONFLICT DO NOTHING;

-- STEP 7: ENABLE SUPABASE REALTIME REPLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'promotions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE promotions;
  END IF;
END $$;

-- STEP 8: ENFORCE OWNER DIRECTIVE (ABAYA & DRESS QUANTITIES = 2)
-- Using direct p.category_id foreign key (no product_categories join table)
UPDATE product_variations
SET stock_quantity = 2
WHERE product_id IN (
  SELECT p.id FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE c.slug IN ('abayas', 'occasion-wear')
     OR p.name ILIKE '%abaya%'
     OR p.name ILIKE '%dress%'
     OR p.name ILIKE '%kaftan%'
);

-- STEP 9: UPDATE CAP PRICING TO OWNER-CONFIRMED VALUE (₦1,500)
UPDATE products
SET base_price = 1500
WHERE slug = 'jersey-cap' 
   OR name ILIKE '%Comfort Fit Jersey Cap%'
   OR (category_id = (SELECT id FROM categories WHERE slug = 'caps') AND base_price = 700);

