\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TYPE public.app_role AS ENUM ('admin','customer','seller');
CREATE TABLE public.user_roles(user_id uuid NOT NULL,role public.app_role NOT NULL);
INSERT INTO public.user_roles VALUES
('00000000-0000-0000-0000-000000000001','admin'),
('00000000-0000-0000-0000-000000000002','customer');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$fn$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.role',true),'')
$fn$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon,authenticated,service_role;

CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$fn$;
CREATE FUNCTION public.can_read_lourex_profile(uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $fn$ SELECT false $fn$;

\ir ../migrations/20261015035000_p1_role_lookup_self_scope.sql

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','anon',true);
DO $qa$
BEGIN
 IF public.has_role('00000000-0000-0000-0000-000000000001'::uuid,'admin') THEN
  RAISE EXCEPTION 'Anonymous visitor can enumerate role';
 END IF;
 IF has_function_privilege('anon','public.can_read_lourex_profile(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Unused anonymous profile helper still public';
 END IF;
END $qa$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $qa$
BEGIN
 IF NOT public.has_role(auth.uid(),'customer') THEN
  RAISE EXCEPTION 'Customer self role lookup broken';
 END IF;
 IF public.has_role('00000000-0000-0000-0000-000000000001'::uuid,'admin') THEN
  RAISE EXCEPTION 'Customer can enumerate another user role';
 END IF;
END $qa$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $qa$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN
  RAISE EXCEPTION 'Admin self role policy broken';
 END IF;
END $qa$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $qa$
BEGIN
 IF NOT public.has_role('00000000-0000-0000-0000-000000000001'::uuid,'admin') THEN
  RAISE EXCEPTION 'Trusted service role lookup broken';
 END IF;
END $qa$;
RESET ROLE;
ROLLBACK;
