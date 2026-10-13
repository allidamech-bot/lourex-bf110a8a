-- R1: prevent arbitrary authenticated users from injecting global system events.
-- Retain prior validation and payload format. Deploy only after staging tests.
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
  -- SECURITY DEFINER writes global diagnostics. No customers or partners
  -- may impersonate system signals by calling this RPC directly.
  IF auth.uid() IS NULL
     OR NOT public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'R1: system event writer requires owner or operations';
  END IF;

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


REVOKE ALL ON FUNCTION public.log_system_event(text,text,text,text,uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_system_event(text,text,text,text,uuid,text,jsonb) TO authenticated;
