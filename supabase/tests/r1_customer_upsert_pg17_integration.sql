-- Disposable PG17 integration, no production data or external tokens.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  email_confirmed_at timestamptz
);

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.lourex_customers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  auth_user_id uuid,
  full_name text,
  email text UNIQUE,
  phone text,
  country text,
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.lourex_customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.lourex_customers TO authenticated;
CREATE POLICY customers_self_read ON public.lourex_customers
  FOR SELECT TO authenticated USING (auth_user_id=auth.uid());

INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
('00000000-0000-0000-0000-000000000001','alice@example.test',now()),
('00000000-0000-0000-0000-000000000002','bob@example.test',now()),
('00000000-0000-0000-0000-000000000003','legacy@example.test',now()),
('00000000-0000-0000-0000-000000000004','unverified@example.test',null),
('00000000-0000-0000-0000-000000000005','fresh@example.test',null);

INSERT INTO public.lourex_customers(id,auth_user_id,full_name,email) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Alice','alice@example.test'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Bob','bob@example.test'),
('10000000-0000-0000-0000-000000000003',null,'Legacy','legacy@example.test'),
('10000000-0000-0000-0000-000000000004',null,'Unverified Legacy','unverified@example.test');

\ir ../migrations/20261013160500_r1_customer_upsert_verified_identity.sql

DO $test_grants$
BEGIN
  IF pg_catalog.has_function_privilege(
    'anon','public.upsert_current_customer_record(text,text,text,text,text)','EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anonymous callers still have upsert EXECUTE';
  END IF;
  IF NOT pg_catalog.has_function_privilege(
    'authenticated','public.upsert_current_customer_record(text,text,text,text,text)','EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated callers lost upsert EXECUTE';
  END IF;
END
$test_grants$;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);

DO $alice$
DECLARE
  v_id uuid;
BEGIN
  SELECT customer_id INTO v_id FROM public.upsert_current_customer_record(
    'Alice Updated','bob@example.test','0123','Turkey','Istanbul'
  );
  IF v_id IS DISTINCT FROM '10000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'Alice attempted to claim Bob record';
  END IF;
END;
$alice$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $bob$
DECLARE
  v_id uuid;
BEGIN
  SELECT customer_id INTO v_id FROM public.upsert_current_customer_record(
    'Bob Updated','alice@example.test','0456','KSA','Riyadh'
  );
  IF v_id IS DISTINCT FROM '10000000-0000-0000-0000-000000000002'::uuid THEN
    RAISE EXCEPTION 'Bob attempted to claim Alice record';
  END IF;
END;
$bob$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $verified_legacy$
DECLARE
  v_id uuid;
BEGIN
  SELECT customer_id INTO v_id FROM public.upsert_current_customer_record(
    'Legacy Claimed','bob@example.test','0999','Turkey','Izmir'
  );
  IF v_id IS DISTINCT FROM '10000000-0000-0000-0000-000000000003'::uuid THEN
    RAISE EXCEPTION 'Verified user could not claim their unlinked legacy record';
  END IF;
END;
$verified_legacy$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
DO $unverified_legacy$
DECLARE
  v_rejected boolean := false;
BEGIN
  BEGIN
    PERFORM customer_id FROM public.upsert_current_customer_record(
      'Unverified','bob@example.test','1234','Turkey','Ankara'
    );
  EXCEPTION WHEN unique_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'Unverified account claimed an unlinked legacy row';
  END IF;
END;
$unverified_legacy$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
DO $fresh_user$
DECLARE
  v_id uuid;
BEGIN
  SELECT customer_id INTO v_id FROM public.upsert_current_customer_record(
    'Fresh','bob@example.test','777','Turkey','Istanbul'
  );
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Fresh account registration could not create a customer';
  END IF;
END;
$fresh_user$;

RESET ROLE;
DO $final_assert$
BEGIN
  IF (SELECT full_name FROM public.lourex_customers WHERE
        id='10000000-0000-0000-0000-000000000001') <> 'Alice Updated' THEN
    RAISE EXCEPTION 'Alice profile not updated through verified identity';
  END IF;
  IF (SELECT full_name FROM public.lourex_customers WHERE
        id='10000000-0000-0000-0000-000000000002') <> 'Bob Updated' THEN
    RAISE EXCEPTION 'Bob profile changed incorrectly';
  END IF;
  IF (SELECT auth_user_id FROM public.lourex_customers WHERE
        id='10000000-0000-0000-0000-000000000003')
     IS DISTINCT FROM '00000000-0000-0000-0000-000000000003'::uuid THEN
    RAISE EXCEPTION 'Legacy ownership claim did not persist';
  END IF;
  IF (SELECT auth_user_id FROM public.lourex_customers WHERE
        id='10000000-0000-0000-0000-000000000004') IS NOT NULL THEN
    RAISE EXCEPTION 'Unverified legacy ownership was claimed';
  END IF;
  IF (SELECT count(*) FROM public.lourex_customers) <> 5 THEN
    RAISE EXCEPTION 'Customer count incorrect after isolated RPC tests';
  END IF;
END
$final_assert$;

ROLLBACK;
