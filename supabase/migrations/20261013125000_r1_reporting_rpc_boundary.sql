-- R1 / Sprint C: report RPCs were SECURITY DEFINER and checked only
-- is_lourex_internal(), which includes partners, thus bypassing table RLS.
-- SECURITY INVOKER keeps the existing reports but applies the actual scoped
-- SELECT policies for the authenticated caller.
ALTER FUNCTION public.lourex_report_summary(timestamptz, timestamptz)
  SECURITY INVOKER;
ALTER FUNCTION public.lourex_report_top_customers(timestamptz, timestamptz, integer)
  SECURITY INVOKER;
ALTER FUNCTION public.lourex_report_top_expense_categories(timestamptz, timestamptz, integer)
  SECURITY INVOKER;

-- Capturing a SYSTEM-WIDE snapshot remains privileged. Only an active owner
-- or operations employee can perform this global SECURITY DEFINER operation.
CREATE OR REPLACE FUNCTION public.capture_system_health_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'Only owner and operations may capture system health';
  END IF;

  INSERT INTO public.system_health_snapshots (metrics)
  VALUES (
    jsonb_build_object(
      'requests', (SELECT COUNT(*) FROM public.purchase_requests),
      'deals', (SELECT COUNT(*) FROM public.deals),
      'shipments', (SELECT COUNT(*) FROM public.shipments),
      'customers', (SELECT COUNT(*) FROM public.lourex_customers),
      'financial_entries', (SELECT COUNT(*) FROM public.financial_entries),
      'timestamp', now()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_system_health_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_system_health_snapshot() TO authenticated;

-- On staging, test owner, operations, both partners, inactive accounts and
-- customer callers. No reports may aggregate rows hidden by the caller's RLS.
