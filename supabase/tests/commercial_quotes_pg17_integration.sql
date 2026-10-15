-- Disposable PostgreSQL 17 integration test. Never run this fixture on production.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
GRANT USAGE ON SCHEMA public TO authenticated,anon;

CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL, status text NOT NULL);
CREATE TABLE public.lourex_customers (id uuid PRIMARY KEY);
CREATE TABLE public.purchase_requests (
 id uuid PRIMARY KEY,
 request_number text NOT NULL,
 customer_id uuid REFERENCES public.lourex_customers(id)
);
CREATE TABLE public.purchase_request_items (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES public.purchase_requests(id),
 line_number integer NOT NULL, product_name text NOT NULL, quantity integer NOT NULL,
 unit text NOT NULL DEFAULT '', specifications text NOT NULL DEFAULT '',
 moq_snapshot text NOT NULL DEFAULT '', packaging_snapshot text NOT NULL DEFAULT '',
 origin_snapshot text NOT NULL DEFAULT ''
);

-- Local role helper mirrors production's caller-scoped, active staff lookup.
CREATE FUNCTION public.is_lourex_role(who uuid, allowed text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT who IS NOT NULL AND who=(SELECT auth.uid())
 AND EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id=who AND p.role=ANY(allowed) AND p.status='active')
$$;
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO authenticated;

INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
INSERT INTO public.profiles VALUES
 ('00000000-0000-4000-8000-000000000001','owner','active'),
 ('00000000-0000-4000-8000-000000000002','customer','active'),
 ('00000000-0000-4000-8000-000000000003','operations_employee','active');
INSERT INTO public.lourex_customers VALUES ('00000000-0000-4000-8000-000000000010');
INSERT INTO public.purchase_requests VALUES
 ('00000000-0000-4000-8000-000000000100','RFQ-2026-ABC','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000101','REQ-2026-DEF','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000102','RFQ-2026-EMPTY','00000000-0000-4000-8000-000000000010');
INSERT INTO public.purchase_request_items
(id,request_id,line_number,product_name,quantity,unit,specifications,moq_snapshot,packaging_snapshot,origin_snapshot)
VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000100',1,'Sunflower Oil',100,'cartons','1L bottles','100 cartons','24 x 1L','Turkey'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000100',2,'Custom biscuits',50,'boxes','Private label','','','');

\ir ../migrations/20261015113000_commercial_quote_drafts.sql

DO $check$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_quote_drafts'::regclass)
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_quote_items'::regclass)
 THEN RAISE EXCEPTION 'Quote RLS not enabled'; END IF;
 IF has_function_privilege('anon','public.create_commercial_quote_draft(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous actors may create commercial quote drafts';
 END IF;
 IF NOT has_function_privilege('authenticated','public.create_commercial_quote_draft(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Authenticated staff missing quote RPC grant';
 END IF;
 IF has_table_privilege('authenticated','public.commercial_quote_drafts','INSERT')
 OR has_table_privilege('authenticated','public.commercial_quote_drafts','UPDATE')
 OR has_table_privilege('authenticated','public.commercial_quote_items','INSERT')
 OR has_table_privilege('authenticated','public.commercial_quote_items','UPDATE')
 THEN RAISE EXCEPTION 'Direct quote mutation must be denied'; END IF;
END $check$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

DO $check$
DECLARE first_id uuid; repeated_id uuid; number text;
BEGIN
 SELECT quote_id,quote_number INTO first_id,number
 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
 IF first_id IS NULL OR number NOT LIKE 'LQ-%' THEN
   RAISE EXCEPTION 'Quote receipt not saved';
 END IF;
 IF (SELECT count(*) FROM public.commercial_quote_items WHERE quote_id=first_id)<>2 THEN
   RAISE EXCEPTION 'Incomplete quote snapshot';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.commercial_quote_items
  WHERE quote_id=first_id AND line_number=1 AND product_name='Sunflower Oil'
  AND quantity=100 AND unit='cartons' AND specifications='1L bottles'
  AND moq_snapshot='100 cartons' AND origin_snapshot='Turkey'
  AND unit_price IS NULL
 ) THEN RAISE EXCEPTION 'First quote line snapshots/pricing incorrect'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.commercial_quote_items
  WHERE quote_id=first_id AND line_number=2 AND product_name='Custom biscuits'
    AND quantity=50 AND specifications='Private label' AND unit_price IS NULL
 ) THEN RAISE EXCEPTION 'Second quote line snapshots/pricing incorrect'; END IF;
 SELECT quote_id INTO repeated_id
 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
 IF repeated_id IS DISTINCT FROM first_id OR
   (SELECT count(*) FROM public.commercial_quote_drafts)<>1 OR
   (SELECT count(*) FROM public.commercial_quote_items)<>2
 THEN RAISE EXCEPTION 'Retry created duplicate quote/lines'; END IF;

 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000101');
  RAISE EXCEPTION 'LEGACY REQUEST ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='LEGACY REQUEST ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000102');
  RAISE EXCEPTION 'EMPTY SMART RFQ ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='EMPTY SMART RFQ ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000999');
  RAISE EXCEPTION 'MISSING REQUEST ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='MISSING REQUEST ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
END $check$;

-- Customer with known RFQ UUID cannot enumerate or create quote drafts.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $check$
BEGIN
 IF EXISTS (SELECT 1 FROM public.commercial_quote_drafts)
    OR EXISTS (SELECT 1 FROM public.commercial_quote_items) THEN
   RAISE EXCEPTION 'Quote draft contents leaked to a customer';
 END IF;
 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
  RAISE EXCEPTION 'CUSTOMER CREATED INTERNAL QUOTE';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='CUSTOMER CREATED INTERNAL QUOTE' OR SQLSTATE<>'42501' THEN RAISE; END IF;
 END;
END $check$;

-- An active staff member can read but not directly modify quote snapshots.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.commercial_quote_drafts)<>1
 OR (SELECT count(*) FROM public.commercial_quote_items)<>2 THEN
   RAISE EXCEPTION 'Active operations staff cannot review draft';
 END IF;
END $check$;
RESET ROLE;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.commercial_quote_drafts)<>1
 OR (SELECT count(*) FROM public.commercial_quote_items)<>2 THEN
   RAISE EXCEPTION 'Rejected operations left partial quote records';
 END IF;
END $check$;
ROLLBACK;
