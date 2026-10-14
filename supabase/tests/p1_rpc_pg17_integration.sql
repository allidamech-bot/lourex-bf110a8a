\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE FUNCTION public.accept_quote(uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.admin_approve_factory_application(uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.confirm_delivery(uuid,text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.create_rfq(text,text,integer,text,numeric,numeric,text,text,text,text,uuid[]) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.submit_quote(uuid,uuid,numeric,integer,text,text,text) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.supplier_submit_quote(uuid,numeric,timestamp with time zone,text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.update_deal_safe(uuid,text,text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.update_order_status(uuid,text,text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.get_profile_role(uuid) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'customer'::text $$;
CREATE FUNCTION public.get_staff_owner_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.audit_trigger_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.lookup_shipment_by_tracking(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::text $$;
CREATE FUNCTION public.prevent_locked_financial_entry_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.extract_legacy_line(text,text) RETURNS text LANGUAGE sql AS $$ SELECT ''::text $$;
CREATE FUNCTION public.backfill_lourex_domain() RETURNS bigint LANGUAGE sql AS $$ SELECT 0::bigint $$;
CREATE FUNCTION public.lourex_stage_order(text) RETURNS integer LANGUAGE sql AS $$ SELECT 0::integer $$;
CREATE FUNCTION public.validate_tracking_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.apply_tracking_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

\ir ../migrations/20261015024500_p1_legacy_rpc_access_hardening.sql

DO $verify$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
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
    IF pg_catalog.has_function_privilege('anon',f,'EXECUTE') THEN
      RAISE EXCEPTION 'Anonymous caller can still execute %',f;
    END IF;
    IF NOT pg_catalog.has_function_privilege('authenticated',f,'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('service_role',f,'EXECUTE') THEN
      RAISE EXCEPTION 'Authenticated or service_role access broken for %',f;
    END IF;
  END LOOP;
  IF pg_catalog.has_function_privilege('anon','public.audit_trigger_fn()','EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated','public.audit_trigger_fn()','EXECUTE') THEN
    RAISE EXCEPTION 'Direct execution of privileged trigger still enabled';
  END IF;
  IF NOT pg_catalog.has_function_privilege('anon','public.lookup_shipment_by_tracking(text)','EXECUTE') THEN
    RAISE EXCEPTION 'Public tracking endpoint unexpectedly blocked';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('prevent_locked_financial_entry_update','extract_legacy_line',
          'backfill_lourex_domain','lourex_stage_order','validate_tracking_update','apply_tracking_update')
      AND NOT ('search_path=pg_catalog, public'=ANY(p.proconfig))
  ) THEN
    RAISE EXCEPTION 'Function search path remains mutable';
  END IF;
END $verify$;
ROLLBACK;
