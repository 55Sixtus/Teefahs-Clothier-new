-- ============================================================================
-- TEEFAHS CLOTHIER — OWNER CATALOGUE RECONCILIATION & DUPLICATE CLEANUP
-- Target Project: mxovvqjyfgyrzjauzodh
-- Idempotent & Non-Destructive: Preserves genuine colourways (e.g. Green &
-- Red Yeesha Floral Khimar), Editorial Photoshoot #31 Abaya, and order history.
-- Recommended Execution Order in Supabase SQL Editor:
--   1. database/security-hardening.sql
--   2. database/ecommerce-transformation-migration.sql
--   3. database/owner-catalogue-reconciliation.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. WORKWEAR CATEGORY CONSOLIDATION (PART 4)
--    Canonical Category Name: Workwear (slug: workwear)
--    Reassign Halima, Leemah, and Safiyah sets safely; remove empty duplicate.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_primary_cat_id UUID;
  v_dup_cat_id UUID;
BEGIN
  -- Prefer the existing category holding Workwear items ('WORK WEAR' / 'work-wear')
  SELECT id INTO v_primary_cat_id
  FROM public.categories
  WHERE slug IN ('workwear', 'work-wear') OR UPPER(BTRIM(name)) = 'WORK WEAR'
  ORDER BY
    CASE WHEN slug = 'workwear' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  -- If an empty duplicate 'Workerwear' exists separately, merge products & drop empty duplicate
  FOR v_dup_cat_id IN
    SELECT id FROM public.categories
    WHERE id <> COALESCE(v_primary_cat_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (LOWER(slug) IN ('workerwear', 'work-wear', 'workout-wear') OR LOWER(BTRIM(name)) IN ('workerwear', 'work wear', 'workout wear'))
  LOOP
    IF v_primary_cat_id IS NULL THEN
      v_primary_cat_id := v_dup_cat_id;
    ELSE
      UPDATE public.products
      SET category_id = v_primary_cat_id, updated_at = NOW()
      WHERE category_id = v_dup_cat_id;

      IF NOT EXISTS (SELECT 1 FROM public.products WHERE category_id = v_dup_cat_id) THEN
        DELETE FROM public.categories WHERE id = v_dup_cat_id;
      END IF;
    END IF;
  END LOOP;

  IF v_primary_cat_id IS NOT NULL THEN
    -- Ensure Halima, Leemah, Safiyah sets are explicitly linked to the canonical Workwear category
    UPDATE public.products
    SET category_id = v_primary_cat_id, updated_at = NOW()
    WHERE id IN (
      'dd69e967-7fec-4aaf-856f-9ff51a1066c8',
      '629fe7ad-67c2-4c60-9010-da304c5a7d2e',
      '13a79f9c-1c7e-4f95-8890-d7f41fccb86b'
    )
    OR slug IN ('workerwear-1', 'workerwear-2', 'workerwear-3');

    UPDATE public.categories
    SET
      name = 'Workwear',
      slug = 'workwear',
      description = COALESCE(NULLIF(BTRIM(description), ''), 'Refined tailored modest workwear sets crafted for polished daily elegance.')
    WHERE id = v_primary_cat_id;
  END IF;
END $$;

-- Cleanly normalize legacy workerwear-1/2/3 slugs when no target collision exists
UPDATE public.products
SET slug = '2-piece-halima-set', updated_at = NOW()
WHERE id = 'dd69e967-7fec-4aaf-856f-9ff51a1066c8'
  AND slug = 'workerwear-1'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE slug = '2-piece-halima-set');

UPDATE public.products
SET slug = 'floral-leemah-set', updated_at = NOW()
WHERE id = '629fe7ad-67c2-4c60-9010-da304c5a7d2e'
  AND slug = 'workerwear-2'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'floral-leemah-set');

UPDATE public.products
SET slug = 'embroidered-safiyah-set', updated_at = NOW()
WHERE id = '13a79f9c-1c7e-4f95-8890-d7f41fccb86b'
  AND slug = 'workerwear-3'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'embroidered-safiyah-set');

-- ----------------------------------------------------------------------------
-- 2. SPLIT MISMATCHED GARMENTS OUT OF NOOR EMBELLISHED LUXURY ABAYA (PART 3A)
--    Screenshot #1:
--      Look 1 (Noor emerald-paneled black abaya): preserve at ₦229,500
--      Look 2 (Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg): ₦185,000
--      Look 3 (Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg): ₦120,000
--      Look 4 (Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg): ₦58,000
-- ----------------------------------------------------------------------------
DELETE FROM public.product_images
WHERE product_id = 'f30471a3-7577-4e4e-b944-1dcfec3ad4b1'
  AND image_url IN (
    'https://i.ibb.co/Pzsw53sT/Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg',
    'https://i.ibb.co/Jwc5QcZQ/Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg',
    'https://i.ibb.co/vCKtsr8K/Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg'
  );

DO $$
DECLARE
  v_abayas_cat_id UUID;
  v_p2_id UUID;
  v_p3_id UUID;
  v_p4_id UUID;
  v_has_review_col BOOLEAN;
BEGIN
  SELECT id INTO v_abayas_cat_id
  FROM public.categories
  WHERE slug = 'abayas' OR LOWER(BTRIM(name)) = 'abayas'
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'needs_owner_review'
  ) INTO v_has_review_col;

  -- Look 2: Olive & gold embroidered kimono-abaya (₦185,000)
  SELECT id INTO v_p2_id FROM public.products
  WHERE main_image_url = 'https://i.ibb.co/Pzsw53sT/Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg'
  LIMIT 1;

  IF v_p2_id IS NULL THEN
    v_p2_id := gen_random_uuid();
    INSERT INTO public.products (
      id, name, slug, short_description, description, category_id,
      main_image_url, base_price, sale_price, currency, is_published, is_featured, is_new_arrival
    ) VALUES (
      v_p2_id,
      'Embellished Olive & Gold Occasion Abaya',
      'embellished-olive-gold-abaya-185k',
      'Owner-verified piece split from Noor gallery at ₦185,000. Size & fabric details await owner update.',
      'Owner-verified garment listing created cleanly from supplied studio photograph. Please update sizes, colour options, and garment description in Admin > All Products.',
      v_abayas_cat_id,
      'https://i.ibb.co/Pzsw53sT/Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg',
      185000,
      NULL,
      'NGN',
      true,
      false,
      false
    );
    INSERT INTO public.product_images (id, product_id, image_url, alt_text, display_order)
    VALUES (gen_random_uuid(), v_p2_id, 'https://i.ibb.co/Pzsw53sT/Whats-App-Image-2026-10-21-at-6-02-25-AM-3.jpg', 'Embellished Olive & Gold Occasion Abaya', 0);
  ELSE
    UPDATE public.products SET base_price = 185000, sale_price = NULL, updated_at = NOW() WHERE id = v_p2_id;
  END IF;

  -- Look 3: Hand-beaded sheer overlay evening caftan (₦120,000)
  SELECT id INTO v_p3_id FROM public.products
  WHERE main_image_url = 'https://i.ibb.co/Jwc5QcZQ/Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg'
  LIMIT 1;

  IF v_p3_id IS NULL THEN
    v_p3_id := gen_random_uuid();
    INSERT INTO public.products (
      id, name, slug, short_description, description, category_id,
      main_image_url, base_price, sale_price, currency, is_published, is_featured, is_new_arrival
    ) VALUES (
      v_p3_id,
      'Hand-Beaded Sheer Overlay Evening Abaya',
      'hand-beaded-sheer-overlay-abaya-120k',
      'Owner-verified piece split from Noor gallery at ₦120,000. Size & fabric details await owner update.',
      'Owner-verified garment listing created cleanly from supplied studio photograph. Please update sizes, colour options, and garment description in Admin > All Products.',
      v_abayas_cat_id,
      'https://i.ibb.co/Jwc5QcZQ/Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg',
      120000,
      NULL,
      'NGN',
      true,
      false,
      false
    );
    INSERT INTO public.product_images (id, product_id, image_url, alt_text, display_order)
    VALUES (gen_random_uuid(), v_p3_id, 'https://i.ibb.co/Jwc5QcZQ/Whats-App-Image-2026-10-21-at-6-02-25-AM-4.jpg', 'Hand-Beaded Sheer Overlay Evening Abaya', 0);
  ELSE
    UPDATE public.products SET base_price = 120000, sale_price = NULL, updated_at = NOW() WHERE id = v_p3_id;
  END IF;

  -- Look 4: Sage marbled belted chiffon dress (₦58,000)
  SELECT id INTO v_p4_id FROM public.products
  WHERE main_image_url = 'https://i.ibb.co/vCKtsr8K/Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg'
  LIMIT 1;

  IF v_p4_id IS NULL THEN
    v_p4_id := gen_random_uuid();
    INSERT INTO public.products (
      id, name, slug, short_description, description, category_id,
      main_image_url, base_price, sale_price, currency, is_published, is_featured, is_new_arrival
    ) VALUES (
      v_p4_id,
      'Sage Marbled Belted Chiffon Dress',
      'sage-marbled-chiffon-dress-58k',
      'Owner-verified piece split from Noor gallery at ₦58,000. Size & fabric details await owner update.',
      'Owner-verified garment listing created cleanly from supplied studio photograph. Please update sizes, colour options, and garment description in Admin > All Products.',
      v_abayas_cat_id,
      'https://i.ibb.co/vCKtsr8K/Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg',
      58000,
      NULL,
      'NGN',
      true,
      false,
      false
    );
    INSERT INTO public.product_images (id, product_id, image_url, alt_text, display_order)
    VALUES (gen_random_uuid(), v_p4_id, 'https://i.ibb.co/vCKtsr8K/Whats-App-Image-2026-10-21-at-6-02-25-AM-5.jpg', 'Sage Marbled Belted Chiffon Dress', 0);
  ELSE
    UPDATE public.products SET base_price = 58000, sale_price = NULL, updated_at = NOW() WHERE id = v_p4_id;
  END IF;

  IF v_has_review_col THEN
    UPDATE public.products
    SET needs_owner_review = true,
        review_notes = 'Split from Noor gallery per owner screenshot (#1). Confirm official title, sizes, and stock.'
    WHERE id IN (v_p2_id, v_p3_id, v_p4_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. SORAYA (₦70,000), SULTANA (₦75,000), & JAWHARA DUPLICATE (PART 3B-D)
--    Conditionally updates Soraya & Sultana prices, resets variation overrides,
--    and safely removes/archives duplicate Jawhara while preserving any order_items.
-- ----------------------------------------------------------------------------
UPDATE public.products
SET base_price = 70000, sale_price = NULL, updated_at = NOW()
WHERE slug ILIKE '%soraya%' OR name ILIKE '%Soraya%';

UPDATE public.product_variations
SET price_adjustment = 0
WHERE product_id IN (SELECT id FROM public.products WHERE slug ILIKE '%soraya%' OR name ILIKE '%Soraya%');

UPDATE public.products
SET base_price = 75000, sale_price = NULL, updated_at = NOW()
WHERE id = 'c5a16ea8-a066-4c2a-b81c-5034e4489ea1'
   OR slug ILIKE '%sultana%'
   OR name ILIKE '%Sultana%';

UPDATE public.product_variations
SET price_adjustment = 0
WHERE product_id IN (
  SELECT id FROM public.products
  WHERE id = 'c5a16ea8-a066-4c2a-b81c-5034e4489ea1' OR slug ILIKE '%sultana%' OR name ILIKE '%Sultana%'
);

DO $$
DECLARE
  v_jaw_id UUID;
  v_has_orders_tbl BOOLEAN;
  v_order_refs INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_items'
  ) INTO v_has_orders_tbl;

  FOR v_jaw_id IN
    SELECT id FROM public.products
    WHERE slug ILIKE '%jawhara%' OR name ILIKE '%Jawhara%'
  LOOP
    v_order_refs := 0;
    IF v_has_orders_tbl THEN
      EXECUTE 'SELECT COUNT(*)::int FROM public.order_items WHERE product_id = $1'
        INTO v_order_refs
        USING v_jaw_id;
    END IF;

    IF v_order_refs > 0 THEN
      UPDATE public.products
      SET
        is_published = false,
        is_archived = true,
        deleted_at = NOW(),
        deleted_by = 'Owner Duplicate Reconciliation'
      WHERE id = v_jaw_id;
    ELSE
      DELETE FROM public.product_images WHERE product_id = v_jaw_id;
      DELETE FROM public.product_variations WHERE product_id = v_jaw_id;
      DELETE FROM public.products WHERE id = v_jaw_id;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. FIX VERIFIED CATEGORY MISMATCHES & FLAG AMBIGUOUS TITLE/SLUG (PART 5)
-- ----------------------------------------------------------------------------
-- Hafsah Medina Silk Rounded Khimar -> Khimars category
UPDATE public.products
SET
  category_id = COALESCE(
    (SELECT id FROM public.categories WHERE slug = 'khimars' OR LOWER(BTRIM(name)) = 'khimars' LIMIT 1),
    category_id
  ),
  updated_at = NOW()
WHERE id = 'df5613ff-085f-411b-9db6-7400a93654f1';

-- Maryam Flowing Two-Piece Prayer Set -> Prayer Wear category
UPDATE public.products
SET
  category_id = COALESCE(
    (SELECT id FROM public.categories WHERE slug = 'prayer-wear' OR LOWER(BTRIM(name)) = 'prayer wear' LIMIT 1),
    category_id
  ),
  updated_at = NOW()
WHERE id = '3b2f0d44-ec05-475d-be51-962a697f277b';

-- Flag Zahra Embellished Dress for owner category/title check if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'needs_owner_review'
  ) THEN
    UPDATE public.products
    SET
      needs_owner_review = true,
      review_notes = COALESCE(review_notes, 'Product is named "Zahra Embellished Dress" while slug/category is Khimars — confirm desired category.')
    WHERE id = '590f3225-394c-4e85-a2c0-a09d51fa2b3a';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. DEDUPLICATE EXACT IDENTICAL (product_id, image_url) ROWS IN product_images
-- ----------------------------------------------------------------------------
DELETE FROM public.product_images a
USING public.product_images b
WHERE a.product_id = b.product_id
  AND a.image_url = b.image_url
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id::text > b.id::text)
  );

COMMIT;
