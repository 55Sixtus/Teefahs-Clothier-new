-- ==============================================================================
-- REMOVE EMBROIDERED HOODIE KHIMAR COMPLETELY FROM SUPABASE
-- ==============================================================================
-- Project Reference: mxovvqjyfgyrzjauzodh
-- Execute in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
-- ==============================================================================

BEGIN;

-- 1. Delete variations associated with Embroidered Hoodie Khimar
DELETE FROM product_variations
WHERE product_id IN (
  SELECT id FROM products 
  WHERE name ILIKE '%EMBROIDERED HOODIE KHIMAR%' 
     OR slug ILIKE '%khimar-4%'
     OR slug ILIKE '%embroidered-hoodie-khimar%'
);

-- 2. Delete product images associated with Embroidered Hoodie Khimar
DELETE FROM product_images
WHERE product_id IN (
  SELECT id FROM products 
  WHERE name ILIKE '%EMBROIDERED HOODIE KHIMAR%' 
     OR slug ILIKE '%khimar-4%'
     OR slug ILIKE '%embroidered-hoodie-khimar%'
);

-- 3. Delete the product itself
DELETE FROM products
WHERE name ILIKE '%EMBROIDERED HOODIE KHIMAR%' 
   OR slug ILIKE '%khimar-4%'
   OR slug ILIKE '%embroidered-hoodie-khimar%';

COMMIT;
