-- Run only against a disposable PostgreSQL 17 instance.
-- Zero external credentials, zero production data; all changes roll back.
\set ON_ERROR_STOP on

BEGIN;

CREATE SCHEMA auth;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'customer',
  partner_type text,
  status text NOT NULL DEFAULT 'active',
  verification_status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  full_name text NOT NULL DEFAULT '',
  CONSTRAINT profiles_partner_type_check CHECK (partner_type IS NULL OR partner_type IN ('turkey','saudi'))
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'active' AND role = ANY(_roles)
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO authenticated;

INSERT INTO public.profiles(id,role,full_name) VALUES
 ('00000000-0000-0000-0000-000000000001','owner','Owner A'),
 ('00000000-0000-0000-0000-000000000002','owner','Owner B'),
 ('00000000-0000-0000-0000-000000000003','customer','Customer A'),
 ('00000000-0000-0000-0000-000000000004','customer','Customer B');

\ir ../migrations/20261013160000_r1_profile_privilege_guard.sql

DO $assert_catalog$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_trigger
      WHERE tgname='guard_profile_privilege_fields_trigger'
      AND tgrelid='public.profiles'::regclass AND NOT tgisinternal) <> 1 THEN
    RAISE EXCEPTION 'Missing profile privilege trigger';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.guard_profile_privilege_fields()'::regprocedure
      AND (NOT p.prosecdef OR pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'Trigger privilege model is incorrect';
  END IF;
END;
$assert_catalog$;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003', true);

DO $customer_tests$
DECLARE
  denied boolean;
  updated_rows integer;
BEGIN
  UPDATE public.profiles SET full_name='Updated Customer A'
    WHERE id='00000000-0000-0000-0000-000000000003';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 1 THEN RAISE EXCEPTION 'Own nonprivileged profile UPDATE failed'; END IF;

  UPDATE public.profiles SET full_name='Forbidden' WHERE
    id='00000000-0000-0000-0000-000000000004';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 0 THEN RAISE EXCEPTION 'Cross-customer edit succeeded'; END IF;

  denied := false;
  BEGIN
    UPDATE public.profiles SET role='owner'
      WHERE id='00000000-0000-0000-0000-000000000003';
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Self role escalation succeeded'; END IF;

  denied := false;
  BEGIN
    UPDATE public.profiles SET status='active', verification_status='approved'
      WHERE id='00000000-0000-0000-0000-000000000003';
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Self verification escalation succeeded'; END IF;

  denied := false;
  BEGIN
    INSERT INTO public.profiles(id,role)
    VALUES ('00000000-0000-0000-0000-000000000003','owner');
  EXCEPTION WHEN unique_violation THEN
    -- Existing primary key is not an INSERT authorization test.
    denied := false;
  WHEN insufficient_privilege THEN denied := true;
  END;
  -- A separate unused identity tests INSERT below.
END;
$customer_tests$;

SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000005', true);

DO $new_customer_tests$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.profiles(id,role)
    VALUES ('00000000-0000-0000-0000-000000000005','owner');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Self-privileged INSERT succeeded'; END IF;

  INSERT INTO public.profiles(id,role)
  VALUES ('00000000-0000-0000-0000-000000000005','customer');
END;
$new_customer_tests$;

SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001', true);

DO $owner_tests$
DECLARE
  changed integer;
  denied boolean := false;
BEGIN
  UPDATE public.profiles SET role='turkish_partner', partner_type='turkish'
    WHERE id='00000000-0000-0000-0000-000000000004';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Owner could not manage a different user'; END IF;

  UPDATE public.profiles SET role='customer'
    WHERE id='00000000-0000-0000-0000-000000000002';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Owner could not downgrade second owner'; END IF;

  BEGIN
    UPDATE public.profiles SET status='inactive'
      WHERE id='00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN check_violation THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Last owner removal succeeded'; END IF;
END;
$owner_tests$;

RESET ROLE;
-- Exercise service-side deletes (including auth.users cascade semantics).
DO $delete_guard_tests$
DECLARE
  denied boolean := false;
  affected integer;
BEGIN
  INSERT INTO public.profiles(id,role,status)
    VALUES ('00000000-0000-0000-0000-000000000008','owner','active');

  DELETE FROM public.profiles
  WHERE id='00000000-0000-0000-0000-000000000008';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Second owner deletion should remain allowed'; END IF;

  BEGIN
    DELETE FROM public.profiles
    WHERE id='00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN check_violation THEN
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Final active owner DELETE succeeded'; END IF;

  DELETE FROM public.profiles
    WHERE id='00000000-0000-0000-0000-000000000005';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Non-owner account deletion blocked'; END IF;
END;
$delete_guard_tests$;

DO $post_tests$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role='owner' AND status='active') <> 1 THEN
    RAISE EXCEPTION 'Active owner count is incorrect';
  END IF;
  IF (SELECT role FROM public.profiles
      WHERE id='00000000-0000-0000-0000-000000000003') <> 'customer' THEN
    RAISE EXCEPTION 'Customer role changed unexpectedly';
  END IF;
END;
$post_tests$;

ROLLBACK;
