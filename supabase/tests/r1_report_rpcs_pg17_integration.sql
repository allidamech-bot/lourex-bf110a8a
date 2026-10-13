-- R1 reporting authorization integration: disposable PostgreSQL 17 only.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text,status text);
CREATE FUNCTION public.is_lourex_role(_user_id uuid,_roles text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path=''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles
 WHERE id=_user_id AND role=ANY(_roles) AND status='active') $$;
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO authenticated;

CREATE TABLE public.purchase_requests(id uuid,customer_id uuid,created_at timestamptz);
CREATE TABLE public.deals(id uuid,customer_id uuid,total_value numeric,created_at timestamptz);
CREATE TABLE public.shipments(id uuid,current_stage_code text,updated_at timestamptz);
CREATE TABLE public.lourex_customers(id uuid,full_name text,email text);
CREATE TABLE public.audit_logs(id uuid,created_at timestamptz);
CREATE TABLE public.financial_entries(id uuid,amount numeric,created_at timestamptz,
 relation_type text,type text,category text);
INSERT INTO public.profiles(id,role,status) VALUES
('00000000-0000-0000-0000-000000000001','owner','active'),
('00000000-0000-0000-0000-000000000002','operations_employee','active'),
('00000000-0000-0000-0000-000000000003','turkish_partner','active'),
('00000000-0000-0000-0000-000000000004','saudi_partner','active'),
('00000000-0000-0000-0000-000000000005','customer','active'),
('00000000-0000-0000-0000-000000000006','owner','inactive');
INSERT INTO public.lourex_customers VALUES
('10000000-0000-0000-0000-000000000001','Test Customer','test@example.test');
INSERT INTO public.purchase_requests VALUES
('20000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001','2026-10-12');
INSERT INTO public.deals VALUES
('30000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001',1000,'2026-10-12');
INSERT INTO public.shipments VALUES
('40000000-0000-0000-0000-000000000001','in_transit','2026-10-12');
INSERT INTO public.audit_logs VALUES
('50000000-0000-0000-0000-000000000001','2026-10-12');
INSERT INTO public.financial_entries VALUES
('60000000-0000-0000-0000-000000000001',250,'2026-10-12','deal_linked','income','sales'),
('60000000-0000-0000-0000-000000000002',100,'2026-10-12','deal_linked','expense','freight');

\ir ../migrations/20261013163000_r1_global_reporting_owner_ops_only.sql

DO $catalog$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
   'public.lourex_report_summary(timestamptz,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
   'public.lourex_report_top_customers(timestamptz,timestamptz,integer)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
   'public.lourex_report_top_expense_categories(timestamptz,timestamptz,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous RPC execution remains enabled'; END IF;
END $catalog$;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
 '00000000-0000-0000-0000-000000000001',true);
DO $owner$
DECLARE result jsonb; n int;
BEGIN
 SELECT public.lourex_report_summary('2026-10-01','2026-11-01')
   INTO result;
 IF (result->>'requests')::int<>1 OR (result->>'deals')::int<>1
    OR (result->>'income')::numeric<>250 OR
       (result->>'expense')::numeric<>100 THEN
   RAISE EXCEPTION 'Owner report values incorrect: %',result;
 END IF;
 SELECT count(*) INTO n FROM public.lourex_report_top_customers(
   '2026-10-01','2026-11-01',10);
 IF n<>1 THEN RAISE EXCEPTION 'Owner top customers empty'; END IF;
 SELECT count(*) INTO n FROM public.lourex_report_top_expense_categories(
   '2026-10-01','2026-11-01',10);
 IF n<>1 THEN RAISE EXCEPTION 'Owner expense categories empty'; END IF;
END $owner$;

SELECT pg_catalog.set_config('request.jwt.claim.sub',
 '00000000-0000-0000-0000-000000000002',true);
DO $ops$
BEGIN
 IF (SELECT (public.lourex_report_summary('2026-10-01','2026-11-01')->>'requests')::int)<>1
 THEN RAISE EXCEPTION 'Operations report incorrectly blocked'; END IF;
END $ops$;

-- Denied actor classes include both partners, customer, inactive owner, anon JWT.
DO $denied$
DECLARE actor uuid; refused boolean;
BEGIN
 FOREACH actor IN ARRAY ARRAY[
 '00000000-0000-0000-0000-000000000003'::uuid,
 '00000000-0000-0000-0000-000000000004'::uuid,
 '00000000-0000-0000-0000-000000000005'::uuid,
 '00000000-0000-0000-0000-000000000006'::uuid
 ] LOOP
   PERFORM pg_catalog.set_config('request.jwt.claim.sub',actor::text,true);

   refused:=false;
   BEGIN PERFORM public.lourex_report_summary('2026-10-01','2026-11-01');
   EXCEPTION WHEN raise_exception THEN refused:=true; END;
   IF NOT refused THEN RAISE EXCEPTION 'Unprivileged summary success for %',actor; END IF;

   refused:=false;
   BEGIN PERFORM 1 FROM public.lourex_report_top_customers('2026-10-01','2026-11-01',4);
   EXCEPTION WHEN raise_exception THEN refused:=true; END;
   IF NOT refused THEN RAISE EXCEPTION 'Unprivileged customer report success for %',actor; END IF;

   refused:=false;
   BEGIN PERFORM 1 FROM public.lourex_report_top_expense_categories('2026-10-01','2026-11-01',4);
   EXCEPTION WHEN raise_exception THEN refused:=true; END;
   IF NOT refused THEN RAISE EXCEPTION 'Unprivileged expense report success for %',actor; END IF;
 END LOOP;
END $denied$;

RESET ROLE;
ROLLBACK;
