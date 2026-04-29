-- Phase 13.6: Shipment timeline and audit events.
-- Shipment events are append-only timeline records for shipment creation,
-- stage changes, notes, and future safe operational milestones.

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage text NULL,
  to_stage text NULL,
  note text NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_customer_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id
  ON public.shipment_events(shipment_id);

CREATE INDEX IF NOT EXISTS idx_shipment_events_created_at
  ON public.shipment_events(created_at DESC);

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipment_events_internal_full_access" ON public.shipment_events;
CREATE POLICY "shipment_events_internal_full_access"
ON public.shipment_events
FOR ALL
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
)
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
);

DROP POLICY IF EXISTS "shipment_events_customers_read_visible_own" ON public.shipment_events;
CREATE POLICY "shipment_events_customers_read_visible_own"
ON public.shipment_events
FOR SELECT
USING (
  is_customer_visible = true
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.shipments s
    LEFT JOIN public.deals d ON d.id = s.deal_id
    LEFT JOIN public.purchase_requests pr ON pr.id = d.source_request_id
    WHERE s.id = shipment_events.shipment_id
      AND (
        s.user_id = auth.uid()
        OR d.customer_id = auth.uid()
        OR d.client_id = auth.uid()
        OR pr.customer_id = auth.uid()
      )
  )
);

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(public.current_lourex_role(), '') NOT IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Only internal Lourex users can log shipment events';
  END IF;

  INSERT INTO public.shipment_events (
    shipment_id,
    event_type,
    from_stage,
    to_stage,
    note,
    actor_user_id,
    is_customer_visible
  )
  VALUES (
    p_shipment_id,
    p_event_type,
    p_from_stage,
    p_to_stage,
    p_note,
    COALESCE(p_actor_user_id, auth.uid()),
    COALESCE(p_is_customer_visible, false)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_shipment_event(uuid, text, text, text, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_shipment_event(uuid, text, text, text, text, uuid, boolean)
TO authenticated;

CREATE OR REPLACE FUNCTION public.record_shipment_timeline_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.shipment_events (
      shipment_id,
      event_type,
      from_stage,
      to_stage,
      note,
      actor_user_id,
      is_customer_visible
    )
    VALUES (
      NEW.id,
      'system_created',
      NULL,
      COALESCE(NEW.current_stage_code, 'factory'),
      COALESCE(NULLIF(NEW.customer_visible_note, ''), 'Shipment timeline started.'),
      auth.uid(),
      true
    );
  ELSIF TG_OP = 'UPDATE'
    AND NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    INSERT INTO public.shipment_events (
      shipment_id,
      event_type,
      from_stage,
      to_stage,
      note,
      actor_user_id,
      is_customer_visible
    )
    VALUES (
      NEW.id,
      'stage_changed',
      OLD.current_stage_code,
      NEW.current_stage_code,
      NULLIF(NEW.customer_visible_note, ''),
      auth.uid(),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_shipment_timeline_event ON public.shipments;
CREATE TRIGGER record_shipment_timeline_event
AFTER INSERT OR UPDATE OF current_stage_code ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.record_shipment_timeline_event();
