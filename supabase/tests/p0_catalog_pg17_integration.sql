-- Disposable PostgreSQL 17 integration; nothing is written to production.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES
('00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000003'),
('00000000-0000-0000-0000-000000000004'),
('00000000-0000-0000-0000-000000000005');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL DEFAULT 'active');
INSERT INTO public.profiles(id,role,status) VALUES
('00000000-0000-0000-0000-000000000001','owner','active'),
('00000000-0000-0000-0000-000000000002','operations_employee','active'),
('00000000-0000-0000-0000-000000000003','customer','active'),
('00000000-0000-0000-0000-000000000004','turkish_partner','active'),
('00000000-0000-0000-0000-000000000005','owner','inactive');
CREATE FUNCTION public.is_lourex_role(p_id uuid,p_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles
  WHERE id=p_id AND status='active' AND role=ANY(p_roles)) $$;
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO anon, authenticated;

\ir ../migrations/20261015010000_p0_product_catalog_readiness.sql

INSERT INTO public.product_catalog_products(slug,name_en,status)
VALUES ('published','Published','active'),('internal-draft','Draft','draft');

DO $checks$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_catalog_products'::regclass)
  THEN RAISE EXCEPTION 'Missing RLS'; END IF;
  IF (SELECT column_default FROM information_schema.columns
    WHERE table_name='product_catalog_products' AND column_name='status') NOT LIKE '%draft%'
  THEN RAISE EXCEPTION 'New products should default to draft'; END IF;
END $checks$;

SET LOCAL ROLE anon;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true);
DO $checks$
DECLARE denied boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products) <> 1
    THEN RAISE EXCEPTION 'Anonymous user can see drafts'; END IF;
  BEGIN
    INSERT INTO public.product_catalog_products(slug,name_en) VALUES ('anon-entry','No');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous insert succeeded'; END IF;
END $checks$;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $checks$
DECLARE denied boolean:=false;
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products) <> 1
    THEN RAISE EXCEPTION 'Customer can see drafts'; END IF;
  BEGIN
    INSERT INTO public.product_catalog_products(slug,name_en) VALUES ('customer-entry','No');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Customer insert succeeded'; END IF;
END $checks$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
DO $checks$
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products)<>1
    THEN RAISE EXCEPTION 'Partner can see unpublished drafts'; END IF;
END $checks$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
DO $checks$
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products)<>1
    THEN RAISE EXCEPTION 'Inactive owner can see drafts'; END IF;
END $checks$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $checks$
DECLARE draft_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products)<>2
    THEN RAISE EXCEPTION 'Owner cannot review drafts'; END IF;
  INSERT INTO public.product_catalog_products(slug,name_en)
    VALUES('owner-draft','Owner draft') RETURNING id INTO draft_id;
  IF (SELECT status FROM public.product_catalog_products WHERE id=draft_id)<>'draft'
    THEN RAISE EXCEPTION 'New item should be unpublished'; END IF;
  UPDATE public.product_catalog_products SET status='active' WHERE id=draft_id;
  DELETE FROM public.product_catalog_products WHERE id=draft_id;
END $checks$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $checks$
BEGIN
  IF (SELECT count(*) FROM public.product_catalog_products)<>2
    THEN RAISE EXCEPTION 'Operations employee cannot review drafts'; END IF;
END $checks$;
RESET ROLE;
ROLLBACK;
