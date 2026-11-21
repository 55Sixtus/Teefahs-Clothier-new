-- ============================================================================
-- TEEFAHS CLOTHIER — DELETE YEESHA DUPLICATE PRODUCT & MERGE IMAGES
-- Target Supabase Project: mxovvqjyfgyrzjauzodh
-- ============================================================================

BEGIN;

-- Move any product_images from duplicate 'yeesha-floral-set' to 'yeesha-floral-khimar'
UPDATE public.product_images
SET product_id = 'c625a368-15b6-4044-b30a-91d1f1cd325b'
WHERE product_id = 'c5bda98c-75ac-48a7-9a50-bafe179b4b32';

-- Move any variations from duplicate 'yeesha-floral-set' to 'yeesha-floral-khimar'
UPDATE public.product_variations
SET product_id = 'c625a368-15b6-4044-b30a-91d1f1cd325b'
WHERE product_id = 'c5bda98c-75ac-48a7-9a50-bafe179b4b32';

-- Delete any order items linked to duplicate product if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    UPDATE public.order_items
    SET product_id = 'c625a368-15b6-4044-b30a-91d1f1cd325b'
    WHERE product_id = 'c5bda98c-75ac-48a7-9a50-bafe179b4b32';
  END IF;
END $$;

-- Delete the duplicate product record cleanly
DELETE FROM public.products
WHERE id = 'c5bda98c-75ac-48a7-9a50-bafe179b4b32';

COMMIT;
