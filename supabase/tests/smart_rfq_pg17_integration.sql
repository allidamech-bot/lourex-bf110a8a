-- Disposable PostgreSQL 17 integration suite. ROLLBACK protects all fixtures.
-- Never run against production. Tests atomicity, canonical snapshots and RLS.
\set ON_ERROR_STOP on
BEGIN;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$f$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT nullif(current_setting('request.jwt.claim.role',true),'')
$f$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY, full_name text, email text, phone text, country text, city text,
 role text NOT NULL, status text NOT NULL
);
CREATE TABLE public.lourex_customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_user_id uuid, full_name text, email text, phone text, country text, city text
);
CREATE TABLE public.product_catalog_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text NOT NULL,
 name_ar text NOT NULL, name_en text NOT NULL, slug text NOT NULL,
 unit text NOT NULL, moq text NOT NULL, packaging text NOT NULL,
 origin_country text NOT NULL, image_url text NOT NULL
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  type text NOT NULL, title text NOT NULL, message text NOT NULL,
  link text NOT NULL
);
CREATE TABLE public.purchase_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_number text UNIQUE NOT NULL,
 customer_id uuid, status text NOT NULL DEFAULT 'intake_submitted',
 full_name text NOT NULL, phone text, email text NOT NULL, country text, city text,
 product_name text NOT NULL, product_description text NOT NULL DEFAULT '',
 quantity integer NOT NULL, technical_specs text, destination text,
 preferred_shipping_method text, delivery_notes text, delivery_address text,
 image_urls text[] NOT NULL DEFAULT '{}'::text[], tracking_code text,
 is_full_sourcing boolean NOT NULL DEFAULT true
);

CREATE FUNCTION public.is_lourex_role(p_user_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT p_user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND role=ANY(p_roles) AND status='active')
$f$;
CREATE FUNCTION public.lourex_r1_is_assigned_request(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT false $f$;
CREATE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.purchase_requests pr
 JOIN public.lourex_customers c ON c.id=pr.customer_id
 WHERE pr.id=p_request_id AND c.auth_user_id=auth.uid())
$f$;
CREATE FUNCTION public.upsert_current_customer_record(
 p_full_name text,p_email text,p_phone text,p_country text,p_city text
) RETURNS TABLE(customer_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $f$
 SELECT c.id FROM public.lourex_customers c WHERE c.auth_user_id=auth.uid() LIMIT 1
$f$;

INSERT INTO public.profiles VALUES
 ('00000000-0000-4000-8000-000000000001','Test Customer','fake@example.test','+905551234567','Turkey','Istanbul','customer','active'),
 ('00000000-0000-4000-8000-000000000002','Other Customer','other@example.test','+905551234568','Syria','Homs','customer','active'),
 ('00000000-0000-4000-8000-000000000003','Owner','owner@example.test','+905551234569','Turkey','Istanbul','owner','active');
INSERT INTO public.lourex_customers (id,auth_user_id,full_name,email,phone,country,city) VALUES
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','Canonical Customer','verified@example.test','+905551234567','Turkey','Istanbul'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','Other Customer','other@example.test','+905551234568','Syria','Homs');
INSERT INTO public.product_catalog_products VALUES
 ('00000000-0000-4000-8000-000000000021','active','زيت دوار الشمس','Sunflower oil','sunflower-oil','cartons','100 cartons','24 x 1L','Turkey','https://example.test/oil.png'),
 ('00000000-0000-4000-8000-000000000022','draft','غير منشور','Not published','draft-item','cartons','10','12 x 1L','Turkey','');

\ir ../migrations/20261015060000_smart_rfq_atomic_multi_item.sql

GRANT SELECT ON public.purchase_requests TO authenticated;
GRANT SELECT ON public.lourex_customers TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon','public.submit_smart_rfq(jsonb,text,text,text,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role has access to RFQ creation';
  END IF;
  IF has_table_privilege('authenticated','public.purchase_request_items','INSERT') THEN
    RAISE EXCEPTION 'Customers can bypass the atomic RPC and forge snapshots';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.purchase_request_items'::regclass) THEN
    RAISE EXCEPTION 'RLS was not enabled for line items';
  END IF;
END
$check$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $check$
DECLARE v_id uuid;
  v_retry_id uuid;
  v_num text;
  v_track text;
BEGIN
  SELECT request_id,request_number,tracking_code INTO v_id,v_num,v_track
  FROM public.submit_smart_rfq(
    '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","product_name":"SPOOFED NAME","quantity":100,"unit":"forged","specifications":"Arabic label"},{"catalog_product_id":null,"product_name":"Custom biscuits","quantity":250,"unit":"cartons","specifications":"Private-label box"}]'::jsonb,
    'Jeddah','sea','CIF destination', 'Saudi Arabia',
    '00000000-0000-4000-8000-000000000055'::uuid
  );
  IF v_id IS NULL OR v_num NOT LIKE 'RFQ-%' OR v_track NOT LIKE 'TRX-%' THEN
    RAISE EXCEPTION 'Atomic RFQ receipt is missing';
  END IF;
  PERFORM set_config('qa.smart_rfq_request_id',v_id::text,true);
  IF (SELECT count(*) FROM public.purchase_request_items WHERE request_id=v_id)<>2 THEN
    RAISE EXCEPTION 'Two item snapshots were not saved';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.purchase_request_items
    WHERE request_id=v_id AND line_number=1
      AND product_name='Sunflower oil' AND unit='cartons'
      AND moq_snapshot='100 cartons' AND packaging_snapshot='24 x 1L'
      AND quantity=100
  ) THEN
    RAISE EXCEPTION 'Published canonical catalog data was not used';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.purchase_request_items
    WHERE request_id=v_id AND line_number=2
      AND product_name='Custom biscuits' AND quantity=250
      AND specifications='Private-label box'
  ) THEN
    RAISE EXCEPTION 'Custom product details were lost';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.purchase_requests
    WHERE id=v_id AND customer_id='00000000-0000-4000-8000-000000000011'
      AND email='verified@example.test' AND quantity=350 AND status='intake_submitted'
  ) THEN
    RAISE EXCEPTION 'Existing request workflow/canonical email was not preserved';
  END IF;

  -- Owner-only notification count is validated after RESET ROLE below.

  -- Retrying the same signed customer receipt must not create a second RFQ.
  SELECT request_id INTO v_retry_id FROM public.submit_smart_rfq(
    '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","product_name":"SPOOFED NAME","quantity":100,"unit":"forged","specifications":"Arabic label"},{"catalog_product_id":null,"product_name":"Custom biscuits","quantity":250,"unit":"cartons","specifications":"Private-label box"}]'::jsonb,
    'Jeddah','sea','CIF destination','Saudi Arabia',
    '00000000-0000-4000-8000-000000000055'::uuid
  );
  IF v_retry_id IS DISTINCT FROM v_id OR (SELECT count(*) FROM public.purchase_requests) <> 1 THEN
    RAISE EXCEPTION 'Idempotent network retry created a second request';
  END IF;

  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","quantity":101}]'::jsonb,
      'Jeddah','sea','CIF destination','Saudi Arabia',
      '00000000-0000-4000-8000-000000000055'::uuid
    );
    RAISE EXCEPTION 'CHANGED BASKET REPLAY ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'CHANGED BASKET REPLAY ACCEPTED' THEN RAISE; END IF;
    IF position('RFQ_SUBMISSION_CHANGED' in SQLERRM) <> 1 THEN RAISE; END IF;
  END;

  -- All-or-nothing when a draft product, duplicate, or bad quantity is supplied.
  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","quantity":100},{"catalog_product_id":"00000000-0000-4000-8000-000000000022","quantity":10}]'::jsonb,
      'Jeddah');
    RAISE EXCEPTION 'DRAFT PRODUCT ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='DRAFT PRODUCT ACCEPTED' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","quantity":100},{"catalog_product_id":"00000000-0000-4000-8000-000000000021","quantity":100}]'::jsonb,
      'Jeddah');
    RAISE EXCEPTION 'DUPLICATE CATALOG ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='DUPLICATE CATALOG ACCEPTED' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":null,"product_name":"Custom item","quantity":0}]'::jsonb,
      'Jeddah');
    RAISE EXCEPTION 'ZERO QUANTITY ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='ZERO QUANTITY ACCEPTED' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":"00000000-0000-4000-8000-000000000021","quantity":50}]'::jsonb,
      'Jeddah');
    RAISE EXCEPTION 'BELOW MOQ ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='BELOW MOQ ACCEPTED' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.purchase_requests)<>1 THEN
    RAISE EXCEPTION 'Rejected request left an orphan parent';
  END IF;
END $check$;

-- Another authenticated customer cannot inspect line items from the first.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $check$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.purchase_request_items
    WHERE request_id=current_setting('qa.smart_rfq_request_id')::uuid
  ) THEN
    RAISE EXCEPTION 'Cross-customer RFQ line item data leak';
  END IF;
END $check$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
DO $check$
BEGIN
  BEGIN
    PERFORM 1 FROM public.submit_smart_rfq(
      '[{"catalog_product_id":null,"product_name":"Unauthorized product","quantity":5}]'::jsonb,
      'Turkey');
    RAISE EXCEPTION 'NON-CUSTOMER ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='NON-CUSTOMER ALLOWED' THEN RAISE; END IF;
  END;
END $check$;
RESET ROLE;

DO $check$
BEGIN
 IF (SELECT count(*) FROM public.purchase_requests)<>1 OR
    (SELECT count(*) FROM public.purchase_request_items)<>2 OR
    (SELECT count(*) FROM public.notifications WHERE type='purchase_request_created')<>1 THEN
   RAISE EXCEPTION 'Negative cases modified committed request records';
 END IF;
END $check$;
ROLLBACK;
