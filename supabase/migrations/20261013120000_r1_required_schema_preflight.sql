-- LOUREX TRADING R1: read-only prerequisite gate.
-- Known deployed `lourex` database is behind the repository's schema
-- migrations. Do not partially apply R1 to it or treat green Vite CI as a
-- PostgreSQL integration test.
--
-- Requires all foundational migrations to be applied and validated on
-- disposable staging FIRST. If any dependency is missing, this migration
-- fails before the R1 security patch creates/changes database objects.
DO $$
DECLARE
  missing_relations text[];
  missing_functions text[];
BEGIN
  SELECT array_agg(name ORDER BY name) INTO missing_relations
  FROM unnest(ARRAY[
    'profiles',
    'deals',
    'shipments',
    'purchase_requests',
    'tracking_updates',
    'audit_logs',
    'lourex_customers',
    'attachments',
    'ledger_accounts',
    'ledger_entries',
    'ledger_lines',
    'supplier_packing_lists',
    'supplier_packing_list_items',
    'shipment_events',
    'system_events',
    'system_health_snapshots',
    'transfer_proofs',
    'business_rules',
    'notifications',
    'financial_entries'
  ]::text[]) AS name
  WHERE to_regclass('public.' || name) IS NULL;

  SELECT array_agg(signature ORDER BY signature) INTO missing_functions
  FROM unnest(ARRAY[
    'public.current_lourex_role()',
    'public.current_lourex_customer_id()',
    'public.lourex_stage_order(text)',
    'public.lourex_normalized_stage(text)',
    'public.is_lourex_role(uuid,text[])'
  ]::text[]) AS signature
  WHERE to_regprocedure(signature) IS NULL;

  IF missing_relations IS NOT NULL OR missing_functions IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'R1 SCHEMA PREREQUISITES NOT MET',
      DETAIL = format('missing tables: %s; missing functions: %s',
                      COALESCE(missing_relations::text, 'none'),
                      COALESCE(missing_functions::text, 'none')),
      HINT = 'Restore compatible schema on disposable staging, verify all historical migrations and role tests, then retry R1. Never apply partial R1 DDL on production.';
  END IF;

  RAISE NOTICE 'R1 schema prerequisite gate passed; not an RLS integration test';
END $$;
