-- P1 security: legacy elevated commercial actions require a signed-in caller.
-- Anonymous catalog reads and public shipment tracking remain unchanged.
-- SECURITY DEFINER internal identity checks are preserved.
DO $harden$
DECLARE
  function_signature text;
  function_oid oid;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.accept_quote(uuid)',
    'public.admin_approve_factory_application(uuid)',
    'public.confirm_delivery(uuid,text)',
    'public.create_rfq(text,text,integer,text,numeric,numeric,text,text,text,text,uuid[])',
    'public.submit_quote(uuid,uuid,numeric,integer,text,text,text)',
    'public.supplier_submit_quote(uuid,numeric,timestamp with time zone,text)',
    'public.update_deal_safe(uuid,text,text)',
    'public.update_order_status(uuid,text,text)',
    'public.get_profile_role(uuid)',
    'public.get_staff_owner_id()'
  ] LOOP
    function_oid := to_regprocedure(function_signature);
    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Expected commercial RPC not found: %', function_signature;
    END IF;

    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', function_oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', function_oid::regprocedure);
  END LOOP;
END;
$harden$;

-- Trigger functions do not need public RPC execution permissions.
-- PostgreSQL executes installed triggers independently of these grants.
DO $triggers$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef
      AND p.prorettype='pg_catalog.trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_row.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_row.signature);
  END LOOP;
END;
$triggers$;

-- Remove mutable search paths from six pre-existing support functions.
-- Keep public after pg_catalog to preserve existing qualified/unqualified lookups.
ALTER FUNCTION public.prevent_locked_financial_entry_update() SET search_path = pg_catalog, public;
ALTER FUNCTION public.extract_legacy_line(text,text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.backfill_lourex_domain() SET search_path = pg_catalog, public;
ALTER FUNCTION public.lourex_stage_order(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.validate_tracking_update() SET search_path = pg_catalog, public;
ALTER FUNCTION public.apply_tracking_update() SET search_path = pg_catalog, public;
