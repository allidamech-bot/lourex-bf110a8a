-- Disposable PostgreSQL 17 permission regression; never run against production.
\set ON_ERROR_STOP on
BEGIN;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
CREATE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
$fn$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  status text NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY only_self_profile ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'customer', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'operations_employee', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'owner', 'inactive');

\ir ../migrations/20261015043000_p1_role_helper_self_scope.sql

GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_lourex_internal(uuid) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
DO $qa$
BEGIN
  IF public.is_lourex_role('00000000-0000-0000-0000-000000000001',
      ARRAY['owner']) THEN
    RAISE EXCEPTION 'Anonymous role enumeration through is_lourex_role';
  END IF;
  IF public.is_lourex_internal('00000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'Anonymous internal-role enumeration';
  END IF;
  IF has_function_privilege('anon', 'public.get_profile_role(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous raw profile role helper unexpectedly exposed';
  END IF;
END $qa$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
DO $qa$
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['customer']) THEN
    RAISE EXCEPTION 'Customer self-role policy lookup broken';
  END IF;
  IF public.is_lourex_role('00000000-0000-0000-0000-000000000001',
      ARRAY['owner']) THEN
    RAISE EXCEPTION 'Customer can enumerate owner role';
  END IF;
  IF public.is_lourex_internal('00000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'Customer can probe internal employee';
  END IF;
  IF public.get_profile_role(auth.uid()) IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Own profile role lookup is broken';
  END IF;
  IF public.get_profile_role('00000000-0000-0000-0000-000000000001')
      IS NOT NULL THEN
    RAISE EXCEPTION 'Customer can read someone else''s raw role';
  END IF;
END $qa$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
DO $qa$
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['owner']) THEN
    RAISE EXCEPTION 'Owner self-role policy lookup broken';
  END IF;
  IF NOT public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Owner self internal-role check broken';
  END IF;
  IF public.get_profile_role(auth.uid()) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Owner self profile helper broken';
  END IF;
  IF public.is_lourex_role('00000000-0000-0000-0000-000000000003',
      ARRAY['operations_employee']) THEN
    RAISE EXCEPTION 'Owner RPC can enumerate another account';
  END IF;
END $qa$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
DO $qa$
BEGIN
  IF public.is_lourex_role(auth.uid(), ARRAY['owner']) THEN
    RAISE EXCEPTION 'Inactive account passed active role policy';
  END IF;
  IF public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Inactive account passed internal role policy';
  END IF;
  IF public.get_profile_role(auth.uid()) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Own inactive-role inspection behaviour changed';
  END IF;
END $qa$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
DO $qa$
BEGIN
  IF NOT public.is_lourex_role('00000000-0000-0000-0000-000000000001',
      ARRAY['owner']) THEN
    RAISE EXCEPTION 'Trusted service role verification broken';
  END IF;
  IF NOT public.is_lourex_internal('00000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'Trusted service internal-role lookup broken';
  END IF;
  IF public.get_profile_role('00000000-0000-0000-0000-000000000003')
      IS DISTINCT FROM 'operations_employee' THEN
    RAISE EXCEPTION 'Trusted service role inspection broken';
  END IF;
END $qa$;
RESET ROLE;
ROLLBACK;
