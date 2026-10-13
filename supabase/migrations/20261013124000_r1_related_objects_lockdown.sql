-- R1 / Sprint B: cover related tables and privileged event writer.
-- Deploy only after 20261013123000_r1_partner_scope_lockdown.sql, and only
-- after verifying the complete active policy catalog in a staging clone.

-- Row-level access to *profiles* previously treated any active partner as
-- authorized to read every user. Owner/operations remain able to manage the
-- company roster; partners can see their own profile and counterpart assigned
-- to the same deal only.
CREATE OR REPLACE FUNCTION public.can_read_lourex_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(auth.uid() = p_profile_id, false)
    OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE public.lourex_r1_is_assigned_deal(d.id)
        AND p_profile_id IN (
          d.assigned_turkish_partner_id,
          d.assigned_saudi_partner_id
        )
    );
$$;
REVOKE ALL ON FUNCTION public.can_read_lourex_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_lourex_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Lourex users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Internal users can view operational profiles" ON public.profiles;
DROP POLICY IF EXISTS "Lourex users can read allowed profiles" ON public.profiles;
CREATE POLICY "Lourex users can read allowed profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.can_read_lourex_profile(id));

-- Customer directory: partners only see the customers on assigned deals.
DROP POLICY IF EXISTS "Internal Lourex roles can view customers" ON public.lourex_customers;
DROP POLICY IF EXISTS "Lourex R1 scoped customer directory" ON public.lourex_customers;
CREATE POLICY "Lourex R1 scoped customer directory"
ON public.lourex_customers FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.customer_id = lourex_customers.id
      AND public.lourex_r1_is_assigned_deal(d.id)
  )
);
-- Existing customer self-read policies remain intact.

-- Attachment metadata is commercially sensitive. Do not leave a permissive
-- FOR ALL policy around: it also grants unrestricted UPDATE/DELETE of evidence.
DROP POLICY IF EXISTS "Internal Lourex roles can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Internal Lourex roles can manage attachments" ON public.attachments;
DROP POLICY IF EXISTS "Lourex R1 owner ops attachments" ON public.attachments;
CREATE POLICY "Lourex R1 owner ops attachments"
ON public.attachments FOR ALL TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

DROP POLICY IF EXISTS "Lourex R1 partner assigned attachments read" ON public.attachments;
CREATE POLICY "Lourex R1 partner assigned attachments read"
ON public.attachments FOR SELECT TO authenticated
USING (
  (entity_type = 'deal' AND public.lourex_r1_is_assigned_deal(entity_id))
  OR
  (entity_type = 'purchase_request' AND public.lourex_r1_is_assigned_request(entity_id))
);
DROP POLICY IF EXISTS "Lourex R1 partner assigned attachments insert" ON public.attachments;
CREATE POLICY "Lourex R1 partner assigned attachments insert"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.current_lourex_role() IN ('turkish_partner','saudi_partner')
  AND (
    (entity_type = 'deal' AND public.lourex_r1_is_assigned_deal(entity_id))
    OR (entity_type = 'purchase_request' AND public.lourex_r1_is_assigned_request(entity_id))
  )
);

-- Shipment timeline previously had an unrestricted internal FOR ALL policy.
DROP POLICY IF EXISTS "shipment_events_internal_full_access" ON public.shipment_events;
DROP POLICY IF EXISTS "Internal roles can view shipment events" ON public.shipment_events;
DROP POLICY IF EXISTS "Lourex R1 owner ops shipment events" ON public.shipment_events;
CREATE POLICY "Lourex R1 owner ops shipment events"
ON public.shipment_events FOR ALL TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));
DROP POLICY IF EXISTS "Lourex R1 assigned shipment events read" ON public.shipment_events;
CREATE POLICY "Lourex R1 assigned shipment events read"
ON public.shipment_events FOR SELECT TO authenticated
USING (public.lourex_r1_is_assigned_shipment(shipment_id));

-- The privileged RPC formerly allowed any internal user to fabricate shipment
-- timeline events for *any* shipment, with an arbitrary actor_user_id.
CREATE OR REPLACE FUNCTION public.log_shipment_event(
  p_shipment_id uuid,
  p_event_type text,
  p_from_stage text DEFAULT NULL,
  p_to_stage text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_is_customer_visible boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_role text := public.current_lourex_role();
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
     AND NOT (
       v_role IN ('turkish_partner','saudi_partner')
       AND public.lourex_r1_is_assigned_shipment(p_shipment_id)
     ) THEN
    RAISE EXCEPTION 'R1: shipment event is not in the actor scope';
  END IF;
  IF p_actor_user_id IS NOT NULL AND p_actor_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'R1: event actor must be the authenticated user';
  END IF;
  INSERT INTO public.shipment_events (
    shipment_id, event_type, from_stage, to_stage,
    note, actor_user_id, is_customer_visible
  ) VALUES (
    p_shipment_id, p_event_type, p_from_stage, p_to_stage,
    p_note, auth.uid(), COALESCE(p_is_customer_visible, false)
  )
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_shipment_event(uuid,text,text,text,text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_shipment_event(uuid,text,text,text,text,uuid,boolean) TO authenticated;

-- System-wide diagnostics and health aggregates are not partner-scoped.
DROP POLICY IF EXISTS "Internal roles can view system events" ON public.system_events;
DROP POLICY IF EXISTS "Lourex R1 owner ops read system events" ON public.system_events;
CREATE POLICY "Lourex R1 owner ops read system events"
ON public.system_events FOR SELECT TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

DROP POLICY IF EXISTS "Internal roles can view health snapshots" ON public.system_health_snapshots;
DROP POLICY IF EXISTS "Lourex R1 owner ops read health" ON public.system_health_snapshots;
CREATE POLICY "Lourex R1 owner ops read health"
ON public.system_health_snapshots FOR SELECT TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

-- This migration deliberately does not change SECURITY DEFINER reporting
-- procedures. Their authority must be separately reviewed before release.
