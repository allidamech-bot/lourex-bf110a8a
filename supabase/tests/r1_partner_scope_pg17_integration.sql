-- Disposable PostgreSQL 17 fixture for R1 partner SELECT isolation.
-- Recreates the permissive policy OR problem using the actual LOUREX key columns.
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
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'customer',
  partner_type text,
  status text NOT NULL DEFAULT 'active',
  verification_status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  full_name text NOT NULL DEFAULT '',
  CONSTRAINT profiles_partner_type_check
    CHECK (partner_type IS NULL OR partner_type IN ('turkey','saudi'))
);

CREATE FUNCTION public.is_lourex_role(_user_id uuid,_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id=_user_id AND role=ANY(_roles) AND status='active'
) $$;

CREATE TABLE public.lourex_customers (
  id uuid PRIMARY KEY,
  auth_user_id uuid,
  full_name text
);
CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY,
  customer_id uuid,
  status text,
  converted_deal_id uuid
);
CREATE TABLE public.deals (
  id uuid PRIMARY KEY,
  customer_id uuid,
  source_request_id uuid,
  assigned_turkish_partner_id uuid,
  assigned_saudi_partner_id uuid,
  operational_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY,
  deal_id uuid,
  current_stage_code text DEFAULT 'deal_accepted',
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.tracking_updates (
  id uuid PRIMARY KEY,
  shipment_id uuid,
  deal_id uuid,
  stage_code text,
  updated_by uuid,
  updated_by_role text
);
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY,
  entity_type text,
  entity_id uuid,
  uploaded_by uuid
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY,
  user_id uuid
);

DO $enable$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','lourex_customers','purchase_requests',
    'deals','shipments','tracking_updates','attachments','notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated, anon',table_name);
  END LOOP;
END;
$enable$;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id=auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id=auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO authenticated;

CREATE FUNCTION public.current_lourex_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT role FROM public.profiles WHERE id=auth.uid() AND status='active' $$;
GRANT EXECUTE ON FUNCTION public.current_lourex_role() TO authenticated;

CREATE FUNCTION public.lourex_stage_order(p_stage text) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path=''
AS $$ SELECT CASE p_stage WHEN 'deal_accepted' THEN 1
  WHEN 'product_preparation' THEN 2 WHEN 'transfer_to_port' THEN 3
  WHEN 'origin_port' THEN 4 WHEN 'origin_customs' THEN 5
  WHEN 'departed_origin' THEN 6 WHEN 'in_transit' THEN 7
  WHEN 'arrived_destination' THEN 8 WHEN 'destination_customs' THEN 9
  WHEN 'transfer_to_warehouse' THEN 10 WHEN 'delivered' THEN 11
  ELSE 0 END $$;
GRANT EXECUTE ON FUNCTION public.lourex_stage_order(text) TO authenticated;

-- The real profile guard is separately validated in PR #16 against PostgreSQL.
-- This disposable fixture supplies only its preflight signature.
CREATE FUNCTION public.guard_profile_privilege_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN RETURN NEW; END $$;

-- Exactly the dangerous pre-R1 shape: every active internal role can SELECT
-- any row in six operational tables.
DO $permissive$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'lourex_customers','purchase_requests','deals',
    'shipments','tracking_updates','attachments'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "Internal LOUREX global read" ON public.%I FOR SELECT TO authenticated USING (public.is_lourex_role(auth.uid(), ARRAY[''owner'',''operations_employee'',''turkish_partner'',''saudi_partner'']))',
      table_name
    );
  END LOOP;
END;
$permissive$;

CREATE POLICY "Customers own requests" ON public.purchase_requests
  FOR SELECT TO authenticated USING (
    customer_id IN (
      SELECT id FROM public.lourex_customers WHERE auth_user_id=auth.uid()
    )
  );
CREATE POLICY "Customers own customer record" ON public.lourex_customers
  FOR SELECT TO authenticated USING (auth_user_id=auth.uid());

INSERT INTO public.profiles(id,role,partner_type,status) VALUES
('00000000-0000-0000-0000-000000000001','owner',null,'active'),
('00000000-0000-0000-0000-000000000002','operations_employee',null,'active'),
('00000000-0000-0000-0000-000000000003','turkish_partner','turkey','active'),
('00000000-0000-0000-0000-000000000004','turkish_partner','turkey','active'),
('00000000-0000-0000-0000-000000000005','saudi_partner','saudi','active'),
('00000000-0000-0000-0000-000000000006','customer',null,'active'),
('00000000-0000-0000-0000-000000000007','customer',null,'active');

INSERT INTO public.lourex_customers(id,auth_user_id) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000007');
INSERT INTO public.purchase_requests(id,customer_id) VALUES
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
INSERT INTO public.deals(id,customer_id,source_request_id,assigned_turkish_partner_id,assigned_saudi_partner_id) VALUES
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',null);
INSERT INTO public.shipments(id,deal_id) VALUES
('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002');
INSERT INTO public.tracking_updates(id,shipment_id) VALUES
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002');
INSERT INTO public.attachments(id,entity_type,entity_id) VALUES
('60000000-0000-0000-0000-000000000001','purchase_request','20000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000002','purchase_request','20000000-0000-0000-0000-000000000002');

\ir ../migrations/20261013162000_r1_existing_schema_partner_containment.sql

DO $policy_assertions$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'deals','shipments','purchase_requests',
    'tracking_updates','lourex_customers','attachments'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public'
        AND tablename=target_table
        AND permissive='RESTRICTIVE'
        AND cmd='SELECT'
    ) THEN
      RAISE EXCEPTION 'No restrictive SELECT policy on %',target_table;
    END IF;
  END LOOP;
  IF pg_catalog.has_function_privilege('anon','public.lourex_r1_is_assigned_deal(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users can invoke R1 assignment helper';
  END IF;
END;
$policy_assertions$;

SET LOCAL ROLE authenticated;

-- The test actor can always read their own assigned records but never
-- another partner's, despite the still-present permissive global SELECT.
SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $turkish_a$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>1 OR
     (SELECT count(*) FROM public.shipments)<>1 OR
     (SELECT count(*) FROM public.purchase_requests)<>1 OR
     (SELECT count(*) FROM public.tracking_updates)<>1 OR
     (SELECT count(*) FROM public.attachments)<>1 OR
     (SELECT count(*) FROM public.lourex_customers)<>1 THEN
    RAISE EXCEPTION 'Turkish partner A did not see exactly assigned records';
  END IF;
  IF NOT public.lourex_r1_is_assigned_deal('30000000-0000-0000-0000-000000000001') OR
      public.lourex_r1_is_assigned_deal('30000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'Turkish partner assignment helper failed';
  END IF;
END;
$turkish_a$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
DO $turkish_b$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>1 OR
     NOT public.lourex_r1_is_assigned_deal('30000000-0000-0000-0000-000000000002') OR
     public.lourex_r1_is_assigned_deal('30000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Turkish partner B isolation failed';
  END IF;
END;
$turkish_b$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
DO $saudi$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>1 OR
     (SELECT count(*) FROM public.shipments)<>1 THEN
    RAISE EXCEPTION 'Saudi partner isolation failed';
  END IF;
END;
$saudi$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',true);
DO $customer_a$
BEGIN
  IF (SELECT count(*) FROM public.purchase_requests)<>1 OR
     (SELECT count(*) FROM public.lourex_customers)<>1 THEN
    RAISE EXCEPTION 'Customer A self-read was broken';
  END IF;
END;
$customer_a$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',true);
DO $customer_b$
BEGIN
  IF (SELECT count(*) FROM public.purchase_requests)<>1 OR
     (SELECT count(*) FROM public.lourex_customers)<>1 THEN
    RAISE EXCEPTION 'Customer B self-read was broken';
  END IF;
END;
$customer_b$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $owner$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>2 OR
     (SELECT count(*) FROM public.shipments)<>2 OR
     (SELECT count(*) FROM public.purchase_requests)<>2 THEN
    RAISE EXCEPTION 'Owner dashboard list is restricted';
  END IF;
END;
$owner$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $ops$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>2 OR
     (SELECT count(*) FROM public.shipments)<>2 THEN
    RAISE EXCEPTION 'Operations dashboard access is restricted';
  END IF;
END;
$ops$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  IF (SELECT count(*) FROM public.deals)<>0 OR
     (SELECT count(*) FROM public.shipments)<>0 OR
     (SELECT count(*) FROM public.purchase_requests)<>0 THEN
    RAISE EXCEPTION 'Anonymous rows were exposed';
  END IF;
END;
$anon$;

RESET ROLE;
ROLLBACK;
