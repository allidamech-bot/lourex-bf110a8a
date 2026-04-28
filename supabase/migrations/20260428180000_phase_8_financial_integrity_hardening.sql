-- Phase 8: financial integrity hardening.
-- Financial entries are append-only; approved edits create correction entries.

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.security_audit_events (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    auth.uid(),
    public.current_lourex_role(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) TO authenticated;

ALTER TABLE public.financial_edit_requests
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.financial_edit_requests
SET
  requested_by = COALESCE(requested_by, created_by),
  request_reason = COALESCE(NULLIF(request_reason, ''), reason, ''),
  proposed_changes = CASE
    WHEN proposed_changes = '{}'::jsonb THEN COALESCE(proposed_value, '{}'::jsonb)
    ELSE proposed_changes
  END,
  reviewed_by = COALESCE(reviewed_by, reviewer_id),
  updated_at = COALESCE(reviewed_at, created_at, now())
WHERE requested_by IS NULL
   OR request_reason = ''
   OR proposed_changes = '{}'::jsonb
   OR reviewed_by IS NULL
   OR updated_at IS NULL;

DROP POLICY IF EXISTS "Owner and operations can update unlocked financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can update unlocked financial entries" ON public.financial_entries;

DROP POLICY IF EXISTS "Owner and operations can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Owner and operations can update financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can update financial edit requests" ON public.financial_edit_requests;

DROP POLICY IF EXISTS "Financial edit requesters can view own requests" ON public.financial_edit_requests;
CREATE POLICY "Financial edit requesters can view own requests"
ON public.financial_edit_requests
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR created_by = auth.uid()
  OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

CREATE OR REPLACE FUNCTION public.prevent_financial_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text := current_setting('app.lourex_rpc_action', true);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial entries are append-only and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_action = 'financial_correction_workflow' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Financial entries are append-only and cannot be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_financial_entry_update ON public.financial_entries;
DROP TRIGGER IF EXISTS prevent_financial_entry_mutation ON public.financial_entries;
CREATE TRIGGER prevent_financial_entry_mutation
  BEFORE UPDATE OR DELETE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_financial_entry_mutation();

CREATE OR REPLACE FUNCTION public.request_financial_entry_edit(
  p_financial_entry_id uuid,
  p_reason text,
  p_proposed_changes jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry public.financial_entries%ROWTYPE;
  v_request_id uuid;
  v_reason text := trim(COALESCE(p_reason, ''));
  v_allowed_changes jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_lourex_internal(v_user_id) THEN
    RAISE EXCEPTION 'Only internal Lourex roles can request financial edits';
  END IF;

  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'A clear financial edit reason is required';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_financial_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial entry not found';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO v_allowed_changes
  FROM jsonb_each(COALESCE(p_proposed_changes, '{}'::jsonb))
  WHERE key IN ('amount', 'method', 'counterparty', 'category', 'note', 'referenceLabel', 'reference_label', 'currency', 'entryDate', 'entry_date');

  IF v_allowed_changes = '{}'::jsonb THEN
    RAISE EXCEPTION 'Financial edit request must include allowed proposed changes';
  END IF;

  INSERT INTO public.financial_edit_requests (
    financial_entry_id,
    deal_id,
    customer_id,
    requested_by,
    requested_by_name,
    requested_by_email,
    request_reason,
    reason,
    old_value,
    proposed_changes,
    proposed_value,
    status,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    v_entry.id,
    v_entry.deal_id,
    v_entry.customer_id,
    v_user_id,
    COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), ''),
    COALESCE((SELECT email FROM public.profiles WHERE id = v_user_id), ''),
    v_reason,
    v_reason,
    jsonb_build_object(
      'amount', v_entry.amount,
      'method', v_entry.method,
      'counterparty', v_entry.counterparty,
      'category', v_entry.category,
      'note', v_entry.note,
      'reference_label', v_entry.reference_label,
      'currency', v_entry.currency,
      'entry_date', v_entry.entry_date
    ),
    v_allowed_changes,
    v_allowed_changes,
    'pending',
    v_user_id,
    now(),
    now()
  )
  RETURNING id INTO v_request_id;

  PERFORM public.log_security_audit_event(
    'financial_edit_requested',
    'financial_edit_request',
    v_request_id,
    jsonb_build_object(
      'financial_entry_id', v_entry.id,
      'proposed_changes', v_allowed_changes
    )
  );

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_financial_entry_edit_request(
  p_request_id uuid,
  p_status text,
  p_review_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.financial_edit_requests%ROWTYPE;
  v_entry public.financial_entries%ROWTYPE;
  v_status text := lower(trim(COALESCE(p_status, '')));
  v_changes jsonb;
  v_original_amount numeric;
  v_target_amount numeric;
  v_delta numeric;
  v_correction_type text;
  v_correction_amount numeric;
  v_correction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_lourex_role(v_user_id, ARRAY['owner', 'operations_employee']) THEN
    RAISE EXCEPTION 'Only owner or operations can review financial edit requests';
  END IF;

  IF v_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Financial edit review status must be approved or rejected';
  END IF;

  SELECT *
  INTO v_request
  FROM public.financial_edit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial edit request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending financial edit requests can be reviewed';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.financial_entries
  WHERE id = v_request.financial_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original financial entry not found';
  END IF;

  v_changes := CASE
    WHEN v_request.proposed_changes IS NOT NULL AND v_request.proposed_changes <> '{}'::jsonb THEN v_request.proposed_changes
    ELSE COALESCE(v_request.proposed_value, '{}'::jsonb)
  END;

  IF v_status = 'rejected' THEN
    UPDATE public.financial_edit_requests
    SET
      status = 'rejected',
      reviewed_by = v_user_id,
      reviewer_id = v_user_id,
      reviewed_at = now(),
      review_note = COALESCE(p_review_note, ''),
      updated_at = now()
    WHERE id = p_request_id;

    PERFORM public.log_security_audit_event(
      'financial_edit_rejected',
      'financial_edit_request',
      p_request_id,
      jsonb_build_object('financial_entry_id', v_entry.id, 'review_note', COALESCE(p_review_note, ''))
    );

    RETURN NULL;
  END IF;

  v_original_amount := COALESCE(v_entry.amount, 0);
  v_target_amount := COALESCE(NULLIF(v_changes ->> 'amount', '')::numeric, v_original_amount);
  v_delta := v_target_amount - v_original_amount;

  IF v_delta = 0 THEN
    UPDATE public.financial_edit_requests
    SET
      status = 'approved',
      reviewed_by = v_user_id,
      reviewer_id = v_user_id,
      reviewed_at = now(),
      review_note = COALESCE(p_review_note, ''),
      updated_at = now()
    WHERE id = p_request_id;

    PERFORM public.log_security_audit_event(
      'financial_edit_approved_no_amount_change',
      'financial_edit_request',
      p_request_id,
      jsonb_build_object(
        'financial_entry_id', v_entry.id,
        'proposed_changes', v_changes
      )
    );

    RETURN NULL;
  END IF;

  IF v_delta < 0 THEN
    v_correction_type := CASE WHEN v_entry.type = 'income' THEN 'expense' ELSE 'income' END;
    v_correction_amount := abs(v_delta);
  ELSE
    v_correction_type := v_entry.type;
    v_correction_amount := v_delta;
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'financial_correction_workflow', true);

  INSERT INTO public.financial_entries (
    entry_number,
    deal_id,
    customer_id,
    type,
    scope,
    relation_type,
    amount,
    currency,
    note,
    entry_date,
    method,
    counterparty,
    category,
    reference_label,
    created_by,
    locked
  )
  VALUES (
    'FE-CORR-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    v_entry.deal_id,
    v_entry.customer_id,
    v_correction_type,
    v_entry.scope,
    v_entry.relation_type,
    v_correction_amount,
    COALESCE(NULLIF(v_changes ->> 'currency', ''), v_entry.currency),
    'Correction for ' || v_entry.entry_number || ': ' || COALESCE(p_review_note, v_request.request_reason, v_request.reason, ''),
    COALESCE(NULLIF(v_changes ->> 'entryDate', '')::date, NULLIF(v_changes ->> 'entry_date', '')::date, v_entry.entry_date),
    COALESCE(NULLIF(v_changes ->> 'method', ''), v_entry.method),
    COALESCE(NULLIF(v_changes ->> 'counterparty', ''), v_entry.counterparty),
    COALESCE(NULLIF(v_changes ->> 'category', ''), v_entry.category),
    COALESCE(NULLIF(v_changes ->> 'referenceLabel', ''), NULLIF(v_changes ->> 'reference_label', ''), v_entry.reference_label),
    v_user_id,
    true
  )
  RETURNING id INTO v_correction_id;

  UPDATE public.financial_edit_requests
  SET
    status = 'approved',
    reviewed_by = v_user_id,
    reviewer_id = v_user_id,
    reviewed_at = now(),
    review_note = COALESCE(p_review_note, ''),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_security_audit_event(
    'financial_edit_approved',
    'financial_edit_request',
    p_request_id,
    jsonb_build_object('financial_entry_id', v_entry.id, 'correction_entry_id', v_correction_id)
  );

  PERFORM public.log_security_audit_event(
    'financial_correction_entry_created',
    'financial_entry',
    v_correction_id,
    jsonb_build_object(
      'original_financial_entry_id', v_entry.id,
      'financial_edit_request_id', p_request_id,
      'proposed_changes', v_changes,
      'delta_amount', v_delta
    )
  );

  RETURN v_correction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_financial_entry_edit_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_financial_entry_edit_request(uuid, text, text) TO authenticated;
