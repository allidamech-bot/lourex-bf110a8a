-- R1 verification gate for disposable staging AFTER all 3 R1 migrations.
-- Read-only catalog assertions. They do NOT replace role-authenticated tests
-- for SELECT/INSERT/UPDATE/DELETE, RPCs, RLS or Storage.
DO $gate$
DECLARE
  missing text[];
BEGIN
  SELECT array_agg(expected.tablename || ':' || expected.policyname)
  INTO missing
  FROM (VALUES
    ('deals','R1 existing-schema partner deal select guard'),
    ('deals','R1 existing-schema partner deal update guard'),
    ('deals','R1 existing-schema partner deal insert guard'),
    ('deals','R1 existing-schema partner deal delete guard'),
    ('shipments','R1 existing-schema partner shipment select guard'),
    ('shipments','R1 existing-schema partner shipment update guard'),
    ('shipments','R1 existing-schema partner shipment insert guard'),
    ('shipments','R1 existing-schema partner shipment delete guard'),
    ('purchase_requests','R1 existing-schema partner requests read guard'),
    ('purchase_requests','R1 existing-schema partner requests insert guard'),
    ('purchase_requests','R1 existing-schema partner requests update guard'),
    ('purchase_requests','R1 existing-schema partner requests delete guard'),
    ('lourex_customers','R1 existing-schema partner customer directory read guard'),
    ('attachments','R1 existing-schema partner attachment scope guard'),
    ('attachments','R1 existing-schema partner attachment delete guard'),
    ('tracking_updates','R1 existing-schema partner tracking select guard'),
    ('tracking_updates','R1 existing-schema partner tracking insert guard'),
    ('notifications','R1 existing-schema partner notifications insert guard')
  ) AS expected(tablename,policyname)
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = expected.tablename
   AND p.policyname = expected.policyname
   AND p.permissive = 'RESTRICTIVE'
  WHERE p.policyname IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing RESTRICTIVE R1 partner guards: %', missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.deals'::regclass
      AND t.tgname = 'lourex_r1_guard_partner_deal_update'
      AND NOT t.tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.shipments'::regclass
      AND t.tgname = 'lourex_r1_guard_partner_shipment_update'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing R1 structural mutation guards';
  END IF;

  IF has_function_privilege('anon','public.lourex_r1_is_assigned_deal(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.upsert_current_customer_record(text,text,text,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.lourex_report_summary(timestamptz,timestamptz)','EXECUTE')
  THEN
    RAISE EXCEPTION 'Anonymous caller can execute a private privileged R1 RPC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'lourex_report_summary','lourex_report_top_customers',
        'lourex_report_top_expense_categories'
      )
      AND pg_get_functiondef(p.oid) LIKE '%IF NOT public.is_lourex_internal(auth.uid())%'
  ) THEN
    RAISE EXCEPTION 'A privileged report still admits unscoped partner roles';
  END IF;

  RAISE NOTICE 'R1 catalog gate passed: mandatory authenticated role-session tests remain';
END;
$gate$;
