-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/r1_policy_catalog_gate.sql
-- Against an isolated staging clone with ALL migrations applied. Read-only.
-- Passing this catalog test does not replace negative/positive access tests
-- with real owner, employee, Turkish, Saudi and customer authenticated sessions.

DO $$
DECLARE
  missing text[];
  unsafe text[];
BEGIN
  SELECT array_agg(t.name)
  INTO missing
  FROM (VALUES
    ('deals', 'Lourex R1 scoped deals read'),
    ('deals', 'Lourex R1 owner ops update deals'),
    ('purchase_requests', 'Lourex R1 scoped requests read'),
    ('shipments', 'Lourex R1 scoped shipments read'),
    ('shipments', 'Lourex R1 assigned shipments update'),
    ('tracking_updates', 'Lourex R1 scoped tracking read'),
    ('tracking_updates', 'Lourex R1 assigned tracking insert'),
    ('audit_logs', 'Lourex R1 owner ops read audit'),
    ('lourex_customers', 'Lourex R1 scoped customer directory'),
    ('attachments', 'Lourex R1 partner assigned attachments read'),
    ('shipment_events', 'Lourex R1 assigned shipment events read'),
    ('ledger_entries', 'Lourex R1 Saudi assigned ledger entries'),
    ('ledger_lines', 'Lourex R1 Saudi assigned ledger lines'),
    ('ledger_accounts', 'Lourex R1 Saudi assigned ledger accounts'),
    ('profiles', 'Lourex users can read allowed profiles'),
    ('notifications', 'Lourex R1 scoped notification recipients'),
    ('supplier_packing_lists', 'supplier_packing_lists_select'),
    ('supplier_packing_list_items', 'supplier_packing_items_select')
  ) AS t(tbl, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tbl
      AND p.policyname = t.name
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'R1 missing security policies: %', missing;
  END IF;

  SELECT array_agg(p.tablename || ':' || p.policyname)
  INTO unsafe
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      p.policyname IN (
        'Internal Lourex roles can view deals',
        'Internal Lourex roles can update deals',
        'Internal Lourex roles can view shipments',
        'Internal Lourex roles can insert shipments',
        'Internal Lourex roles can update shipments',
        'Internal Lourex roles can view purchase requests',
        'Internal Lourex roles can view tracking updates',
        'Internal users can view tracking updates',
        'Internal Lourex roles can view customers',
        'Internal Lourex roles can view attachments',
        'Internal Lourex roles can manage attachments',
        'shipment_events_internal_full_access',
        'Internal roles can view shipment events',
        'Internal roles can view system events',
        'Internal roles can view health snapshots',
        'Turkish Brokers have full logistics SELECT',
        'Turkish Brokers have full logistics INSERT',
        'Turkish Brokers have full logistics UPDATE',
        'Saudi Partners can view ledger accounts',
        'Saudi Partners can view ledger entries',
        'Saudi Partners can view ledger lines',
        'Allowed partners can insert tracking updates',
        'Saudi partner can insert destination tracking updates',
        'Dashboard internal can update purchase requests',
        'Internal Lourex users can insert notifications',
        'Public can view customer visible tracking updates',
        'Assigned partners can insert tracking updates'
      )
      OR (p.tablename IN ('deals','shipments','purchase_requests',
                          'tracking_updates','audit_logs','lourex_customers',
                          'attachments','shipment_events','system_events',
                          'system_health_snapshots')
          AND COALESCE(p.qual, '') LIKE '%is_lourex_internal%')
    );

  IF unsafe IS NOT NULL THEN
    RAISE EXCEPTION 'R1 legacy broad policies remain: %', unsafe;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('deals','shipments','purchase_requests',
                        'tracking_updates','audit_logs','lourex_customers',
                        'attachments','shipment_events','ledger_entries',
                        'ledger_lines','ledger_accounts','profiles')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'R1: a protected relation has RLS disabled';
  END IF;

  -- Packing-list SELECT policies must not grant every active partner global
  -- access; check pg_policies expressions, not only policy presence.
  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.tablename = 'supplier_packing_lists'
         AND p.policyname = 'supplier_packing_lists_select')
        OR (p.tablename = 'supplier_packing_list_items'
         AND p.policyname = 'supplier_packing_items_select')
      )
      AND COALESCE(p.qual, '') NOT LIKE '%lourex_r1_is_assigned%'
  ) THEN
    RAISE EXCEPTION 'R1: packing-list policy lacks deal assignment';
  END IF;

  IF has_function_privilege(
    'anon', 'public.lourex_r1_is_assigned_deal(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'R1: anon can execute assignment helper';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'lourex_report_summary',
        'lourex_report_top_customers',
        'lourex_report_top_expense_categories'
      )
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'R1: global report RPC still bypasses caller RLS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_system_event'
      AND pg_get_functiondef(p.oid) LIKE '%R1: system event writer requires owner or operations%'
  ) THEN
    RAISE EXCEPTION 'R1: privileged system event RPC is not guarded';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'storage'
      AND p.tablename = 'objects'
      AND p.policyname IN (
        'Internal users can read transfer proofs',
        'Internal users can manage transfer proofs',
        'Internal deal attachments can be uploaded',
        'Internal deal attachments can be updated',
        'Internal deal attachments can be deleted'
      )
  ) THEN
    RAISE EXCEPTION 'R1: legacy broad Storage permissions remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.buckets b
    JOIN storage.objects o ON o.bucket_id = b.id
    WHERE b.id = 'product-images'
      AND b.public = true
      AND (storage.foldername(o.name))[1] = 'deal-attachments'
  ) THEN
    RAISE EXCEPTION 'R1: deal attachment objects found in public product-images bucket';
  END IF;

  IF has_function_privilege(
    'anon', 'public.lourex_r1_can_notify(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'R1: anonymous users can execute notification recipient check';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE (p.role = 'turkish_partner' AND p.partner_type IS DISTINCT FROM 'turkish')
       OR (p.role = 'saudi_partner' AND p.partner_type IS DISTINCT FROM 'saudi')
       OR (p.role NOT IN ('turkish_partner', 'saudi_partner') AND p.partner_type IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'R1: inconsistent stored partner_type for one or more profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.conname = 'profiles_partner_type_check'
      AND pg_get_constraintdef(c.oid) LIKE '%turkish%'
  ) THEN
    RAISE EXCEPTION 'R1: partner_type constraint not aligned to canonical turkish';
  END IF;

  RAISE NOTICE 'R1 policy catalog gate passed; execute role-session tests next';
END;
$$;
