-- R1 live-schema partner SELECT isolation.
-- Stack this migration AFTER 20261013160000_r1_profile_privilege_guard.sql.
-- The prerequisite guard is required: without it, a client could self-promote
-- before reaching these assignment checks.
--
-- IMPORTANT: This is phase R1-B READ isolation only. Direct mutation policies
-- and trigger paths must be hardened and tested before calling R1 complete.
-- Existing marketplace-specific permissions for clients/brokers are retained.
-- RESTRICTIVE policies constrain ALL permissive policies combined by OR.

DO $prerequisite$
DECLARE
  v_missing text[];
BEGIN
  IF to_regprocedure('public.guard_profile_privilege_fields()') IS NULL THEN
    RAISE EXCEPTION 'R1 dependency missing: profile privilege guard';
  END IF;

  SELECT array_agg(name) INTO v_missing
  FROM unnest(ARRAY[
    'public.profiles','public.deals','public.shipments',
    'public.purchase_requests','public.tracking_updates',
    'public.attachments','public.lourex_customers'
  ]) name
  WHERE to_regclass(name) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'R1 partner read schema missing: %', v_missing;
  END IF;

  IF to_regprocedure('public.is_lourex_role(uuid,text[])') IS NULL THEN
    RAISE EXCEPTION 'R1 dependency missing: is_lourex_role(uuid,text[])';
  END IF;
END;
$prerequisite$;

-- Fixed-path, caller-bound boolean predicates. No arbitrary user_id argument,
-- and no result rows returned from private deals/shipments.
CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_deal(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE d.id = p_deal_id
      AND p.status = 'active'
      AND (
        (p.role = 'turkish_partner' AND d.assigned_turkish_partner_id = p.id)
        OR (p.role = 'saudi_partner' AND d.assigned_saudi_partner_id = p.id)
      )
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.source_request_id = p_request_id
      AND public.lourex_r1_is_assigned_deal(d.id)
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_shipment(p_shipment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = p_shipment_id
      AND s.deal_id IS NOT NULL
      AND public.lourex_r1_is_assigned_deal(s.deal_id)
  ), false);
$function$;

REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) TO authenticated;

-- Active partner actors are the ONLY authenticated users limited by these
-- additional row scopes. Owners/operations retain established management
-- policies, and customer self-read policies are untouched.
DROP POLICY IF EXISTS "R1 active partners read assigned deals" ON public.deals;
CREATE POLICY "R1 active partners read assigned deals"
ON public.deals AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(id)
);

DROP POLICY IF EXISTS "R1 active partners read assigned shipments" ON public.shipments;
CREATE POLICY "R1 active partners read assigned shipments"
ON public.shipments AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_shipment(id)
);

DROP POLICY IF EXISTS "R1 active partners read assigned purchase requests" ON public.purchase_requests;
CREATE POLICY "R1 active partners read assigned purchase requests"
ON public.purchase_requests AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_request(id)
);

DROP POLICY IF EXISTS "R1 active partners read assigned tracking" ON public.tracking_updates;
CREATE POLICY "R1 active partners read assigned tracking"
ON public.tracking_updates AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_shipment(shipment_id)
);

DROP POLICY IF EXISTS "R1 active partners read assigned customers" ON public.lourex_customers;
CREATE POLICY "R1 active partners read assigned customers"
ON public.lourex_customers AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.customer_id = lourex_customers.id
      AND public.lourex_r1_is_assigned_deal(d.id)
  )
);

DROP POLICY IF EXISTS "R1 active partners read assigned attachments" ON public.attachments;
CREATE POLICY "R1 active partners read assigned attachments"
ON public.attachments AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR (entity_type = 'deal' AND public.lourex_r1_is_assigned_deal(entity_id))
  OR (entity_type = 'purchase_request' AND public.lourex_r1_is_assigned_request(entity_id))
  OR (entity_type = 'shipment' AND public.lourex_r1_is_assigned_shipment(entity_id))
);
