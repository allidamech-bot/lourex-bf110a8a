-- LOUREX Smart RFQ: one canonical purchase request, multiple immutable item snapshots.
-- Intentionally NOT a new orders system and NOT a public price list.
CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  line_number integer NOT NULL CHECK (line_number BETWEEN 1 AND 20),
  catalog_product_id uuid REFERENCES public.product_catalog_products(id) ON DELETE SET NULL,
  product_name text NOT NULL CHECK (length(btrim(product_name)) BETWEEN 1 AND 240),
  product_slug text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100000000),
  unit text NOT NULL DEFAULT '',
  specifications text NOT NULL DEFAULT '',
  moq_snapshot text NOT NULL DEFAULT '',
  packaging_snapshot text NOT NULL DEFAULT '',
  origin_snapshot text NOT NULL DEFAULT '',
  image_url_snapshot text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, line_number)
);
-- Idempotency protects customers against duplicate commercial requests after network retries.
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS smart_rfq_submission_id uuid;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS smart_rfq_payload_fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_requests_smart_rfq_submission_uidx
ON public.purchase_requests(smart_rfq_submission_id) WHERE smart_rfq_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchase_request_items_request_idx ON public.purchase_request_items(request_id);
CREATE INDEX IF NOT EXISTS purchase_request_items_catalog_idx ON public.purchase_request_items(catalog_product_id);
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.purchase_request_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.purchase_request_items TO authenticated;
CREATE POLICY "Smart RFQ items only through authorized parent"
ON public.purchase_request_items FOR SELECT TO authenticated
USING (
  public.customer_can_access_purchase_request(request_id)
  OR public.is_lourex_role((SELECT auth.uid()), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_request(request_id)
);

-- Make the entire request and its line items atomic: no orphaned requests and
-- no customer-controlled metadata, price, status, customer_id, or item snapshots.
CREATE OR REPLACE FUNCTION public.submit_smart_rfq(
  p_items jsonb,
  p_destination text,
  p_shipping_method text DEFAULT '',
  p_delivery_notes text DEFAULT '',
  p_delivery_address text DEFAULT '',
  p_client_submission_id uuid DEFAULT NULL
) RETURNS TABLE(request_id uuid, request_number text, tracking_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $rfq$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_profile record;
  v_customer_id uuid;
  v_customer record;
  v_existing record;
  v_payload_fingerprint text;
  v_items_count integer;
  v_item jsonb;
  v_catalog record;
  v_catalog_id uuid;
  v_name text;
  v_unit text;
  v_specs text;
  v_quantity integer;
  v_moq_number text;
  v_moq_remainder text;
  v_total bigint := 0;
  v_pos integer := 0;
  v_names text[] := ARRAY[]::text[];
  v_lines text[] := ARRAY[]::text[];
  v_request_id uuid := gen_random_uuid();
  v_request_number text := 'RFQ-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  v_tracking_code text := 'TRX-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  v_destination text := left(btrim(coalesce(p_destination,'')),240);
BEGIN
  IF v_user IS NULL OR (SELECT auth.role()) <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501';
  END IF;
  SELECT full_name, email, phone, country, city, role, status
    INTO v_profile FROM public.profiles WHERE id=v_user;
  IF NOT FOUND OR v_profile.role <> 'customer' OR v_profile.status <> 'active' THEN
    RAISE EXCEPTION 'An active customer profile is required' USING ERRCODE='42501';
  END IF;
  IF nullif(btrim(coalesce(v_profile.full_name,'')), '') IS NULL
      OR length(regexp_replace(coalesce(v_profile.phone,''), '[^0-9]', '', 'g')) < 7
      OR nullif(btrim(coalesce(v_profile.country,'')), '') IS NULL
      OR nullif(btrim(coalesce(v_profile.email,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Complete your customer contact details before submitting';
  END IF;
  IF v_destination = '' OR length(btrim(coalesce(p_destination,''))) > 240 THEN
    RAISE EXCEPTION 'A valid delivery destination is required';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Items must be an array';
  END IF;
  v_items_count := jsonb_array_length(p_items);
  IF v_items_count < 1 OR v_items_count > 20 THEN
    RAISE EXCEPTION 'Smart RFQ must contain between 1 and 20 products';
  END IF;
  IF length(coalesce(p_shipping_method,'')) > 100
      OR length(coalesce(p_delivery_notes,'')) > 3000
      OR length(coalesce(p_delivery_address,'')) > 500 THEN
    RAISE EXCEPTION 'Request notes exceed allowed length';
  END IF;
  -- Fingerprint the submitted commercial terms. Network replays of the same
  -- basket return the original receipt; changed terms must never silently
  -- receive a confirmation for different, previously submitted products.
  v_payload_fingerprint := md5(jsonb_build_object(
    'items', p_items,
    'destination', btrim(p_destination),
    'shipping_method', btrim(coalesce(p_shipping_method,'')),
    'delivery_notes', btrim(coalesce(p_delivery_notes,'')),
    'delivery_address', btrim(coalesce(p_delivery_address,''))
  )::text);

  -- A stable, unguessable client UUID makes network retries idempotent.
  IF p_client_submission_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_client_submission_id::text,0));
    SELECT pr.id,pr.request_number,pr.tracking_code,pr.smart_rfq_payload_fingerprint,c.auth_user_id
      INTO v_existing
      FROM public.purchase_requests pr
      LEFT JOIN public.lourex_customers c ON c.id=pr.customer_id
      WHERE pr.smart_rfq_submission_id=p_client_submission_id;
    IF FOUND THEN
      IF v_existing.auth_user_id IS DISTINCT FROM v_user THEN
        RAISE EXCEPTION 'Submission receipt is not owned by this account' USING ERRCODE='42501';
      END IF;
      IF v_existing.smart_rfq_payload_fingerprint IS DISTINCT FROM v_payload_fingerprint THEN
        RAISE EXCEPTION 'RFQ_SUBMISSION_CHANGED: previous request data differs from current basket' USING ERRCODE='22023';
      END IF;
      RETURN QUERY SELECT v_existing.id,v_existing.request_number,v_existing.tracking_code;
      RETURN;
    END IF;
  END IF;

  -- A validated catalog name always comes from the active published row.
  -- Reject duplicates to prevent accidental inflated commercial quantities.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS e(value)
    WHERE jsonb_typeof(e.value) <> 'object'
       OR (e.value ? 'catalog_product_id' AND nullif(e.value->>'catalog_product_id','') IS NOT NULL
           AND (e.value->>'catalog_product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  ) THEN
    RAISE EXCEPTION 'Invalid product entry';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT e.value->>'catalog_product_id' AS product_id, count(*) AS n
      FROM jsonb_array_elements(p_items) AS e(value)
      WHERE nullif(e.value->>'catalog_product_id','') IS NOT NULL
      GROUP BY e.value->>'catalog_product_id'
    ) dup WHERE dup.n > 1
  ) THEN
    RAISE EXCEPTION 'A catalog product may be included once per request';
  END IF;

  -- Verify ALL lines before committing any row (the function is transactional).
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_pos := v_pos + 1;
    IF coalesce(v_item->>'quantity','') !~ '^[0-9]{1,9}$' THEN
      RAISE EXCEPTION 'Invalid quantity at line %',v_pos;
    END IF;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 OR v_quantity > 100000000 THEN
      RAISE EXCEPTION 'Quantity out of range at line %',v_pos;
    END IF;
    v_total := v_total + v_quantity;
    IF v_total > 1000000000 THEN
      RAISE EXCEPTION 'Total request quantity exceeds the maximum';
    END IF;
    IF length(coalesce(v_item->>'specifications','')) > 2000
      OR length(coalesce(v_item->>'unit','')) > 80 THEN
      RAISE EXCEPTION 'Item details exceed maximum length';
    END IF;
    v_catalog_id := nullif(v_item->>'catalog_product_id','')::uuid;
    IF v_catalog_id IS NOT NULL THEN
      SELECT id,name_ar,name_en,slug,unit,moq,packaging,origin_country,image_url
      INTO v_catalog
      FROM public.product_catalog_products
      WHERE id=v_catalog_id AND status='active';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Catalog product is no longer available at line %',v_pos;
      END IF;
      v_name := left(coalesce(nullif(v_catalog.name_en,''),v_catalog.name_ar),240);
      v_unit := v_catalog.unit;
      -- Enforce only unambiguous numeric MOQ expressed in the catalog unit.
      -- Mixed units, pallets/containers, and negotiated MOQ text remain advisory.
      v_moq_number := substring(replace(btrim(v_catalog.moq),',','') from '^[0-9]{1,9}');
      IF v_moq_number IS NOT NULL THEN
        v_moq_remainder := lower(btrim(substr(replace(btrim(v_catalog.moq),',',''),length(v_moq_number)+1)));
        IF (v_moq_remainder='' OR v_moq_remainder=lower(btrim(v_unit)))
           AND v_quantity < v_moq_number::integer THEN
          RAISE EXCEPTION 'Quantity is below the published minimum at line %',v_pos;
        END IF;
      END IF;
    ELSE
      v_name := btrim(coalesce(v_item->>'product_name',''));
      v_unit := btrim(coalesce(v_item->>'unit',''));
      IF length(v_name) < 2 OR length(v_name) > 240 THEN
        RAISE EXCEPTION 'A valid name is required for a custom product at line %',v_pos;
      END IF;
    END IF;
    v_specs := btrim(coalesce(v_item->>'specifications',''));
    v_names := array_append(v_names,v_name);
    v_lines := array_append(v_lines,
      v_pos::text || '. ' || v_name || ' | ' || v_quantity::text ||
      CASE WHEN v_unit<>'' THEN ' ' || v_unit ELSE '' END ||
      CASE WHEN v_specs<>'' THEN ' | ' || v_specs ELSE '' END);
  END LOOP;
  SELECT customer_id INTO v_customer_id FROM public.upsert_current_customer_record(
    v_profile.full_name, v_profile.email, v_profile.phone, v_profile.country, coalesce(v_profile.city,'')
  );
  IF v_customer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.lourex_customers
    WHERE id=v_customer_id AND auth_user_id=v_user
  ) THEN
    RAISE EXCEPTION 'Unable to resolve the authenticated customer';
  END IF;

  -- Use the server-owned customer record, not mutable profile email fields.
  SELECT c.full_name,c.phone,c.email,c.country,c.city INTO v_customer
  FROM public.lourex_customers c WHERE c.id=v_customer_id AND c.auth_user_id=v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer ownership verification failed';
  END IF;

  INSERT INTO public.purchase_requests (
    id,request_number,customer_id,status,full_name,phone,email,country,city,
    product_name,product_description,quantity,technical_specs,destination,
    preferred_shipping_method,delivery_notes,delivery_address,image_urls,
    tracking_code,is_full_sourcing,smart_rfq_submission_id,smart_rfq_payload_fingerprint
  ) VALUES (
    v_request_id,v_request_number,v_customer_id,'intake_submitted',
    v_customer.full_name,v_customer.phone,v_customer.email,v_customer.country,coalesce(v_customer.city,''),
    CASE WHEN v_items_count=1 THEN v_names[1] ELSE 'Multi-product RFQ (' || v_items_count::text || ' items)' END,
    left(array_to_string(v_lines,E'\n'),8000),
    v_total::integer,left(array_to_string(v_lines,E'\n'),8000),v_destination,
    btrim(coalesce(p_shipping_method,'')),btrim(coalesce(p_delivery_notes,'')),
    btrim(coalesce(p_delivery_address,'')),ARRAY[]::text[],
    v_tracking_code,true,p_client_submission_id,v_payload_fingerprint
  );
  v_pos := 0;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_pos := v_pos + 1;
    v_catalog_id := nullif(v_item->>'catalog_product_id','')::uuid;
    IF v_catalog_id IS NOT NULL THEN
      SELECT id,name_ar,name_en,slug,unit,moq,packaging,origin_country,image_url
      INTO v_catalog FROM public.product_catalog_products
      WHERE id=v_catalog_id AND status='active';
    END IF;
    INSERT INTO public.purchase_request_items (
      request_id,line_number,catalog_product_id,product_name,product_slug,
      quantity,unit,specifications,moq_snapshot,packaging_snapshot,origin_snapshot,image_url_snapshot
    ) VALUES (
      v_request_id,v_pos,v_catalog_id,v_names[v_pos],
      CASE WHEN v_catalog_id IS NULL THEN '' ELSE v_catalog.slug END,
      (v_item->>'quantity')::integer,
      CASE WHEN v_catalog_id IS NULL THEN btrim(coalesce(v_item->>'unit','')) ELSE v_catalog.unit END,
      btrim(coalesce(v_item->>'specifications','')),
      CASE WHEN v_catalog_id IS NULL THEN '' ELSE v_catalog.moq END,
      CASE WHEN v_catalog_id IS NULL THEN '' ELSE v_catalog.packaging END,
      CASE WHEN v_catalog_id IS NULL THEN '' ELSE v_catalog.origin_country END,
      CASE WHEN v_catalog_id IS NULL THEN '' ELSE v_catalog.image_url END
    );
  END LOOP;
  RETURN QUERY SELECT v_request_id,v_request_number,v_tracking_code;
END;
$rfq$;
REVOKE ALL ON FUNCTION public.submit_smart_rfq(jsonb,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_smart_rfq(jsonb,text,text,text,text,uuid) TO authenticated;
