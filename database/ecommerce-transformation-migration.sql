-- ============================================================================
-- TEEFAHS CLOTHIER — INTERNATIONAL E-COMMERCE TRANSFORMATION MIGRATION
-- Target Project: mxovvqjyfgyrzjauzodh
-- Idempotent & Non-Destructive: Preserves all existing products, categories,
-- prices, images, and variations.
-- Execute in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/mxovvqjyfgyrzjauzodh/sql
-- ============================================================================

BEGIN;

-- 1. EXTEND PRODUCTS WITH INTERNATIONAL SPECS, MEASUREMENTS, VIDEO & AUDIT FLAGS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS collection_origin TEXT,
  ADD COLUMN IF NOT EXISTS fabric_type TEXT,
  ADD COLUMN IF NOT EXISTS fabric_texture TEXT,
  ADD COLUMN IF NOT EXISTS fabric_weight TEXT,
  ADD COLUMN IF NOT EXISTS transparency_lining TEXT,
  ADD COLUMN IF NOT EXISTS care_instructions TEXT,
  ADD COLUMN IF NOT EXISTS construction_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS whats_included TEXT,
  ADD COLUMN IF NOT EXISTS sizing_system TEXT DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS fit_type TEXT DEFAULT 'loose',
  ADD COLUMN IF NOT EXISTS fit_guidance TEXT,
  ADD COLUMN IF NOT EXISTS measurements_unit_note TEXT DEFAULT 'Garment measurements in centimetres (cm)',
  ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_caption TEXT,
  ADD COLUMN IF NOT EXISTS needs_more_images BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_owner_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 2. EXTEND PRODUCT IMAGES WITH MULTI-ANGLE VIEW TYPES & AUTHENTICITY METADATA
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS view_type TEXT DEFAULT 'front',
  ADD COLUMN IF NOT EXISTS colour_tag TEXT,
  ADD COLUMN IF NOT EXISTS authenticity_label TEXT DEFAULT 'actual_product',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 3. EXTEND PRODUCT VARIATIONS WITH HEX SWATCHES, PER-VARIATION PHOTOS, MEASUREMENTS & PRICE OVERRIDE
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS colour_hex TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS price_override DECIMAL(10, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variations_price_override_non_negative'
      AND conrelid = 'public.product_variations'::regclass
  ) THEN
    ALTER TABLE public.product_variations
      ADD CONSTRAINT product_variations_price_override_non_negative
      CHECK (price_override IS NULL OR price_override >= 0);
  END IF;
END $$;

-- 4. ADMIN-CONFIGURABLE DELIVERY ZONES (ZERO FABRICATED FEES)
CREATE TABLE IF NOT EXISTS public.store_delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  delivery_fee_ngn DECIMAL(10, 2) DEFAULT NULL,
  estimated_timeline TEXT,
  customs_note TEXT,
  policy_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved delivery zones" ON public.store_delivery_zones;
CREATE POLICY "Public read approved delivery zones" ON public.store_delivery_zones
  FOR SELECT TO anon, authenticated
  USING (is_approved = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage delivery zones" ON public.store_delivery_zones;
CREATE POLICY "Admin manage delivery zones" ON public.store_delivery_zones
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed baseline country structure without inventing unconfirmed shipping fees (delivery_fee_ngn remains NULL unless set by owner)
INSERT INTO public.store_delivery_zones (country_code, country_name, is_approved, delivery_fee_ngn, estimated_timeline, customs_note, policy_note)
VALUES
  ('NG', 'Nigeria', true, NULL, 'Lagos & Nationwide dispatch timeline confirmed via WhatsApp prior to payment', 'No customs duties within Nigeria.', 'Final dispatch fee confirmed directly on WhatsApp by our Lagos boutique desk prior to payment.'),
  ('GB', 'United Kingdom', true, NULL, 'Confirmed on WhatsApp prior to dispatch', 'UK import duties & VAT, if applicable, are the recipient''s responsibility.', 'International courier fee is weighed and confirmed by our dispatch desk before payment.'),
  ('US', 'United States', true, NULL, 'Confirmed on WhatsApp prior to dispatch', 'US customs duties, if applicable, are the recipient''s responsibility.', 'International courier fee is weighed and confirmed by our dispatch desk before payment.'),
  ('CA', 'Canada', true, NULL, 'Confirmed on WhatsApp prior to dispatch', 'Canadian import duties & taxes, if applicable, are the recipient''s responsibility.', 'International courier fee is weighed and confirmed by our dispatch desk before payment.'),
  ('EU', 'European Union', true, NULL, 'Confirmed on WhatsApp prior to dispatch', 'EU VAT/customs clearance charges, if applicable, are payable on delivery.', 'International courier fee is weighed and confirmed by our dispatch desk before payment.'),
  ('AE', 'United Arab Emirates', true, NULL, 'Confirmed on WhatsApp prior to dispatch', 'UAE import clearance, if applicable, is the recipient''s responsibility.', 'International courier fee is weighed and confirmed by our dispatch desk before payment.')
ON CONFLICT (country_code) DO NOTHING;

-- 5. ORDER LIFECYCLE TABLES (orders, order_items, order_status_history)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT UNIQUE NOT NULL,
  contact_verifier TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  delivery_country TEXT NOT NULL DEFAULT 'NG',
  delivery_address TEXT NOT NULL,
  delivery_city TEXT,
  delivery_notes TEXT,
  display_currency TEXT NOT NULL DEFAULT 'NGN',
  exchange_rate_used NUMERIC(14, 6),
  exchange_rate_timestamp TIMESTAMPTZ,
  subtotal_ngn DECIMAL(12, 2) NOT NULL DEFAULT 0,
  confirmed_delivery_fee_ngn DECIMAL(12, 2),
  status TEXT NOT NULL DEFAULT 'awaiting_confirmation' CHECK (
    status IN (
      'order_received',
      'awaiting_confirmation',
      'confirmed',
      'processing',
      'ready_for_dispatch',
      'dispatched',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned'
    )
  ),
  tracking_reference TEXT,
  carrier_name TEXT,
  whatsapp_dispatched_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  product_image_snapshot TEXT,
  sku_snapshot TEXT,
  selected_colour TEXT,
  selected_size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_ngn DECIMAL(12, 2) NOT NULL CHECK (unit_price_ngn >= 0),
  line_total_ngn DECIMAL(12, 2) NOT NULL CHECK (line_total_ngn >= 0)
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_reference_idx ON public.orders (order_reference);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON public.order_status_history (order_id, created_at ASC);

-- 6. STRICT ORDER ROW-LEVEL SECURITY (ZERO ANON PII EXPOSURE)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
CREATE POLICY "Admin full access orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access order_items" ON public.order_items;
CREATE POLICY "Admin full access order_items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access order_status_history" ON public.order_status_history;
CREATE POLICY "Admin full access order_status_history" ON public.order_status_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. SERVER-AUTHORITATIVE ORDER CREATION RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_store_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_delivery_country TEXT;
  v_delivery_address TEXT;
  v_delivery_city TEXT;
  v_delivery_notes TEXT;
  v_display_currency TEXT;
  v_exchange_rate NUMERIC;
  v_exchange_ts TIMESTAMPTZ;
  v_items JSONB;
  v_item JSONB;
  v_product RECORD;
  v_variation RECORD;
  v_has_vars BOOLEAN;
  v_qty INTEGER;
  v_unit_price NUMERIC(12, 2);
  v_line_total NUMERIC(12, 2);
  v_subtotal NUMERIC(12, 2) := 0;
  v_delivery_fee NUMERIC(12, 2);
  v_order_id UUID := gen_random_uuid();
  v_order_ref TEXT;
  v_attempt INTEGER := 0;
  v_verifier TEXT;
  v_sku_snap TEXT;
  v_img_snap TEXT;
BEGIN
  v_customer_name := NULLIF(BTRIM(COALESCE(payload->>'customer_name', '')), '');
  v_customer_email := NULLIF(LOWER(BTRIM(COALESCE(payload->>'customer_email', ''))), '');
  v_customer_phone := NULLIF(BTRIM(COALESCE(payload->>'customer_phone', '')), '');
  v_delivery_country := UPPER(COALESCE(NULLIF(BTRIM(payload->>'delivery_country'), ''), 'NG'));
  v_delivery_address := NULLIF(BTRIM(COALESCE(payload->>'delivery_address', '')), '');
  v_delivery_city := NULLIF(BTRIM(COALESCE(payload->>'delivery_city', '')), '');
  v_delivery_notes := NULLIF(BTRIM(COALESCE(payload->>'delivery_notes', '')), '');
  v_display_currency := UPPER(COALESCE(NULLIF(BTRIM(payload->>'display_currency'), ''), 'NGN'));
  v_items := payload->'items';

  IF v_customer_name IS NULL OR v_customer_phone IS NULL OR v_delivery_address IS NULL THEN
    RAISE EXCEPTION 'Customer name, WhatsApp/phone number, and delivery address are required.';
  END IF;

  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one garment item.';
  END IF;

  IF payload->>'exchange_rate_used' IS NOT NULL AND payload->>'exchange_rate_used' <> '' THEN
    v_exchange_rate := (payload->>'exchange_rate_used')::NUMERIC;
  END IF;

  IF payload->>'exchange_rate_timestamp' IS NOT NULL AND payload->>'exchange_rate_timestamp' <> '' THEN
    v_exchange_ts := (payload->>'exchange_rate_timestamp')::TIMESTAMPTZ;
  END IF;

  v_verifier := COALESCE(
    v_customer_email,
    REGEXP_REPLACE(v_customer_phone, '\D', '', 'g')
  );

  -- Look up optional confirmed zone fee (stays NULL unless explicitly configured by admin)
  SELECT dz.delivery_fee_ngn
  INTO v_delivery_fee
  FROM public.store_delivery_zones dz
  WHERE dz.country_code = v_delivery_country AND dz.is_approved = true
  LIMIT 1;

  -- Generate unique reference TC-YYYYMMDD-XXXX
  LOOP
    v_attempt := v_attempt + 1;
    v_order_ref := 'TC-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' ||
      LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_reference = v_order_ref) OR v_attempt >= 12;
  END LOOP;

  -- Insert order header first (subtotal updated after validating items)
  INSERT INTO public.orders (
    id, order_reference, contact_verifier, customer_name, customer_email, customer_phone,
    delivery_country, delivery_address, delivery_city, delivery_notes,
    display_currency, exchange_rate_used, exchange_rate_timestamp,
    subtotal_ngn, confirmed_delivery_fee_ngn, status, whatsapp_dispatched_at
  ) VALUES (
    v_order_id, v_order_ref, v_verifier, v_customer_name, v_customer_email, v_customer_phone,
    v_delivery_country, v_delivery_address, v_delivery_city, v_delivery_notes,
    v_display_currency, v_exchange_rate, v_exchange_ts,
    0, v_delivery_fee, 'awaiting_confirmation', NOW()
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_qty := GREATEST(1, LEAST(50, COALESCE((v_item->>'quantity')::INTEGER, 1)));

    SELECT p.*
    INTO v_product
    FROM public.products p
    WHERE p.id = (v_item->>'product_id')::UUID
      AND p.is_published = true
      AND COALESCE(p.is_archived, false) = false
      AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One or more selected garments are no longer available.';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variations pv WHERE pv.product_id = v_product.id
    ) INTO v_has_vars;

    v_variation := NULL;
    IF v_has_vars THEN
      SELECT pv.*
      INTO v_variation
      FROM public.product_variations pv
      WHERE pv.product_id = v_product.id
        AND (COALESCE(pv.size, '') = '' OR COALESCE(v_item->>'selected_size', '') = '' OR LOWER(pv.size) = LOWER(v_item->>'selected_size'))
        AND (COALESCE(pv.colour, '') = '' OR COALESCE(v_item->>'selected_colour', '') = '' OR LOWER(pv.colour) = LOWER(v_item->>'selected_colour'))
      ORDER BY pv.stock_quantity DESC
      LIMIT 1;

      IF FOUND AND COALESCE(v_variation.stock_quantity, 0) < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for % (% / %).', v_product.name, COALESCE(v_item->>'selected_colour', 'Standard'), COALESCE(v_item->>'selected_size', 'One Size');
      END IF;
    END IF;

    IF v_variation.id IS NOT NULL AND v_variation.price_override IS NOT NULL THEN
      v_unit_price := GREATEST(0, ROUND(v_variation.price_override));
    ELSE
      v_unit_price := GREATEST(0, ROUND(COALESCE(v_product.base_price, 0) + COALESCE(v_variation.price_adjustment, 0)));
    END IF;

    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_sku_snap := COALESCE(v_variation.sku, v_product.sku, '');
    v_img_snap := COALESCE(NULLIF(v_variation.image_url, ''), v_product.main_image_url, '');

    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot, product_image_snapshot,
      sku_snapshot, selected_colour, selected_size, quantity, unit_price_ngn, line_total_ngn
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_img_snap,
      v_sku_snap, COALESCE(v_item->>'selected_colour', 'Original'), COALESCE(v_item->>'selected_size', 'Standard'),
      v_qty, v_unit_price, v_line_total
    );
  END LOOP;

  UPDATE public.orders
  SET subtotal_ngn = v_subtotal, updated_at = NOW()
  WHERE id = v_order_id;

  INSERT INTO public.order_status_history (order_id, status, note, updated_by)
  VALUES (
    v_order_id,
    'awaiting_confirmation',
    'Order logged via storefront checkout and queued for WhatsApp confirmation.',
    'customer_checkout'
  );

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_reference', v_order_ref,
    'subtotal_ngn', v_subtotal,
    'confirmed_delivery_fee_ngn', v_delivery_fee,
    'status', 'awaiting_confirmation',
    'created_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_store_order(JSONB) TO anon, authenticated;

-- 8. VERIFIED CUSTOMER ORDER TRACKING RPC (SECURITY DEFINER, MINIMIZED DATA RETURN)
CREATE OR REPLACE FUNCTION public.track_customer_order(
  p_order_reference TEXT,
  p_contact_verifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT := UPPER(BTRIM(COALESCE(p_order_reference, '')));
  v_contact_raw TEXT := LOWER(BTRIM(COALESCE(p_contact_verifier, '')));
  v_contact_digits TEXT := REGEXP_REPLACE(COALESCE(p_contact_verifier, ''), '\D', '', 'g');
  v_order RECORD;
  v_items JSONB;
  v_history JSONB;
BEGIN
  IF v_ref = '' OR v_contact_raw = '' THEN
    RETURN NULL;
  END IF;

  SELECT o.*
  INTO v_order
  FROM public.orders o
  WHERE UPPER(o.order_reference) = v_ref
    AND (
      (o.customer_email IS NOT NULL AND LOWER(BTRIM(o.customer_email)) = v_contact_raw)
      OR (
        LENGTH(v_contact_digits) >= 7
        AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\D', '', 'g'), 7) = RIGHT(v_contact_digits, 7)
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'product_name_snapshot', oi.product_name_snapshot,
      'product_image_snapshot', oi.product_image_snapshot,
      'sku_snapshot', oi.sku_snapshot,
      'selected_colour', oi.selected_colour,
      'selected_size', oi.selected_size,
      'quantity', oi.quantity,
      'unit_price_ngn', oi.unit_price_ngn,
      'line_total_ngn', oi.line_total_ngn
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', osh.id,
      'status', osh.status,
      'note', osh.note,
      'created_at', osh.created_at
    ) ORDER BY osh.created_at ASC
  ), '[]'::jsonb)
  INTO v_history
  FROM public.order_status_history osh
  WHERE osh.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_reference', v_order.order_reference,
    'customer_first_name', SPLIT_PART(v_order.customer_name, ' ', 1),
    'delivery_country', v_order.delivery_country,
    'delivery_city', v_order.delivery_city,
    'display_currency', v_order.display_currency,
    'subtotal_ngn', v_order.subtotal_ngn,
    'confirmed_delivery_fee_ngn', v_order.confirmed_delivery_fee_ngn,
    'status', v_order.status,
    'carrier_name', v_order.carrier_name,
    'tracking_reference', v_order.tracking_reference,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'confirmed_at', v_order.confirmed_at,
    'dispatched_at', v_order.dispatched_at,
    'delivered_at', v_order.delivered_at,
    'items', v_items,
    'history', v_history
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_customer_order(TEXT, TEXT) TO anon, authenticated;

-- 9. STORAGE MIME ALLOWANCE FOR OPTIONAL PRODUCT VIDEOS (WHILE KEEPING IMAGE HARDENING)
UPDATE storage.buckets
SET
  file_size_limit = 31457280,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'product-images';

-- 10. REALTIME PUBLICATION FOR ORDERS & DELIVERY ZONES
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['orders', 'order_status_history', 'store_delivery_zones']
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
