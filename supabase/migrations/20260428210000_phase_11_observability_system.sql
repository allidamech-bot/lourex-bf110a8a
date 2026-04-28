-- Phase 11: observability and system health.

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view system events" ON public.system_events;
CREATE POLICY "Owner and operations can view system events"
ON public.system_events
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.system_events FROM PUBLIC;
REVOKE ALL ON public.system_events FROM anon;
REVOKE ALL ON public.system_events FROM authenticated;
GRANT SELECT ON public.system_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  status text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view system health snapshots" ON public.system_health_snapshots;
CREATE POLICY "Owner and operations can view system health snapshots"
ON public.system_health_snapshots
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.system_health_snapshots FROM PUBLIC;
REVOKE ALL ON public.system_health_snapshots FROM anon;
REVOKE ALL ON public.system_health_snapshots FROM authenticated;
GRANT SELECT ON public.system_health_snapshots TO authenticated;

CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type text,
  p_severity text,
  p_source text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_message text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_severity text := lower(trim(COALESCE(p_severity, 'info')));
BEGIN
  IF v_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE EXCEPTION 'Invalid system event severity: %', p_severity;
  END IF;

  IF trim(COALESCE(p_event_type, '')) = '' THEN
    RAISE EXCEPTION 'System event type is required';
  END IF;

  IF trim(COALESCE(p_source, '')) = '' THEN
    RAISE EXCEPTION 'System event source is required';
  END IF;

  IF trim(COALESCE(p_message, '')) = '' THEN
    RAISE EXCEPTION 'System event message is required';
  END IF;

  INSERT INTO public.system_events (
    event_type,
    severity,
    source,
    entity_type,
    entity_id,
    message,
    metadata
  )
  VALUES (
    trim(p_event_type),
    v_severity,
    trim(p_source),
    NULLIF(trim(COALESCE(p_entity_type, '')), ''),
    p_entity_id,
    trim(p_message),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_system_event(text, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_system_event(text, text, text, text, uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_system_health_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'purchase_requests', (SELECT count(*) FROM public.purchase_requests),
    'deals', (SELECT count(*) FROM public.deals),
    'shipments', (SELECT count(*) FROM public.shipments),
    'financial_entries', (SELECT count(*) FROM public.financial_entries),
    'pending_financial_edit_requests', (
      SELECT count(*)
      FROM public.financial_edit_requests
      WHERE status = 'pending'
    )
  )
  INTO v_metrics;

  INSERT INTO public.system_health_snapshots (
    snapshot_type,
    status,
    metrics
  )
  VALUES (
    'auto',
    'ok',
    v_metrics
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_system_health_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_system_health_snapshot() TO authenticated;
