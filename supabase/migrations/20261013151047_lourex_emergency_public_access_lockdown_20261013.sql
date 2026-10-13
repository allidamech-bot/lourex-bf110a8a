-- Applied on Supabase project gxmqchznfolerliorpkz, 2026-10-13.
-- This is the exact emergency access-control migration applied successfully
-- via Supabase. Historical schema/data are left intact.
-- Existing self-customer request SELECT, authenticated request INSERT,
-- and specific purchase-request image-upload policies are retained.
DO $guard$
BEGIN
  IF to_regclass('public.purchase_requests') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Required LOUREX tables are absent';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='purchase_requests' AND policyname='Customers can view own purchase requests'
  ) THEN RAISE EXCEPTION 'Missing customer self-read policy: aborting'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='audit_logs' AND policyname='Internal Lourex roles can insert audit logs'
  ) THEN RAISE EXCEPTION 'Missing internal audit insert policy: aborting'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects' AND policyname='Public can upload purchase request product images'
  ) THEN RAISE EXCEPTION 'Missing narrower public upload policy: aborting'; END IF;
END $guard$;

DROP POLICY IF EXISTS "Allow public select purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow public select audit_logs" ON public.audit_logs;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Internal Lourex roles can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Lourex owner and operations can read audit logs" ON public.audit_logs;
CREATE POLICY "Lourex owner and operations can read audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

DROP POLICY IF EXISTS "Allow public read storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload product images (public)" ON storage.objects;

DO $verify$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.audit_logs'::regclass)
    THEN RAISE EXCEPTION 'Audit RLS is still disabled'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE (p.schemaname='public' AND p.tablename IN ('purchase_requests','audit_logs')
           AND p.policyname LIKE 'Allow public select %')
       OR (p.schemaname='storage' AND p.tablename='objects'
           AND p.policyname IN ('Allow public read storage objects','Public can upload product images (public)'))
  ) THEN RAISE EXCEPTION 'Legacy public policy still exists'; END IF;
END $verify$;
