-- Stabilize locked financial entry creation and approved correction workflow.
-- Financial entries remain append-only; initial locked entry creation is handled by an RPC
-- so the insert and audit trail commit or fail together.

CREATE OR REPLACE FUNCTION public.create_locked_financial_entry(
  p_entry_number text,
  p_deal_id uuid,
  p_customer_id uuid,
  p_type text,
  p_scope text,
  p_relation_type text,
  p_amount numeric,
  p_currency text,
  p_note text,
  p_entry_date date,
  p_method text,
  p_counterparty text,
  p_category text,
  p_reference_label text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_entry_number text := COALESCE(NULLIF(trim(p_entry_number), ''), 'FE-' || to_char(now(), 'YYYY') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_deal public.deals%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_lourex_role(v_user_id, ARRAY['owner', 'operations_employee']) THEN
    RAISE EXCEPTION 'Only owner or operations can create financial entries';
  END IF;

  IF p_type NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Financial entry type must be income or expense';
  END IF;

  IF p_scope NOT IN ('deal_linked', 'global') THEN
    RAISE EXCEPTION 'Financial entry scope must be deal_linked or global';
  END IF;

  IF p_relation_type NOT IN ('deal_linked', 'customer_linked', 'general') THEN
    RAISE EXCEPTION 'Financial entry relation type is invalid';
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Financial entry amount must be greater than zero';
  END IF;

  IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'A valid financial entry currency is required';
  END IF;

  IF p_entry_date IS NULL THEN
    RAISE EXCEPTION 'A valid financial entry date is required';
  END IF;

  IF trim(COALESCE(p_note, '')) = ''
    OR trim(COALESCE(p_method, '')) = ''
    OR trim(COALESCE(p_counterparty, '')) = ''
    OR trim(COALESCE(p_category, '')) = ''
  THEN
    RAISE EXCEPTION 'All required financial entry details must be completed';
  END IF;

  IF p_scope = 'deal_linked' AND p_deal_id IS NULL THEN
    RAISE EXCEPTION 'A deal-linked financial entry requires a linked deal';
  END IF;

  IF p_scope = 'global' AND (p_deal_id IS NOT NULL OR p_customer_id IS NOT NULL) THEN
    RAISE EXCEPTION 'A global financial entry cannot include a linked deal or customer';
  END IF;

  IF p_deal_id IS NOT NULL THEN
    SELECT *
    INTO v_deal
    FROM public.deals
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial entry linked deal does not exist';
    END IF;

    IF p_customer_id IS NOT NULL
      AND v_deal.customer_id IS NOT NULL
      AND p_customer_id IS DISTINCT FROM v_deal.customer_id
    THEN
      RAISE EXCEPTION 'Financial entry customer must match linked deal customer';
    END IF;
  END IF;

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
    v_entry_number,
    p_deal_id,
    p_customer_id,
    p_type,
    p_scope,
    p_relation_type,
    p_amount,
    p_currency,
    trim(p_note),
    p_entry_date,
    trim(p_method),
    trim(p_counterparty),
    trim(p_category),
    COALESCE(trim(p_reference_label), ''),
    v_user_id,
    true
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    changed_by,
    new_values
  )
  VALUES (
    'financial_entry.created',
    'financial_entries',
    v_entry_id::text,
    v_user_id,
    jsonb_build_object(
      'entry_number', v_entry_number,
      'deal_id', p_deal_id,
      'customer_id', p_customer_id,
      'amount', p_amount,
      'currency', p_currency,
      'type', p_type,
      'locked', true,
      'entity_label', v_entry_number
    )
  );

  PERFORM public.log_security_audit_event(
    'financial_entry_created',
    'financial_entry',
    v_entry_id,
    jsonb_build_object('entry_number', v_entry_number, 'locked', true)
  );

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_financial_entry_edit(
  p_financial_entry_id uuid,
  p_reason text,
  p_proposed_changes jsonb,
  p_requested_by_name text DEFAULT NULL,
  p_requested_by_email text DEFAULT NULL
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
  v_requester_name text := trim(COALESCE(p_requested_by_name, ''));
  v_requester_email text := trim(COALESCE(p_requested_by_email, ''));
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

  IF v_entry.locked IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Only locked financial entries can be updated through edit requests';
  END IF;

  SELECT COALESCE(jsonb_object_agg(
    CASE
      WHEN key = 'referenceLabel' THEN 'reference_label'
      WHEN key = 'entryDate' THEN 'entry_date'
      ELSE key
    END,
    value
  ), '{}'::jsonb)
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
    COALESCE(NULLIF(v_requester_name, ''), (SELECT full_name FROM public.profiles WHERE id = v_user_id), ''),
    COALESCE(NULLIF(v_requester_email, ''), (SELECT email FROM public.profiles WHERE id = v_user_id), ''),
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

REVOKE ALL ON FUNCTION public.create_locked_financial_entry(text, uuid, uuid, text, text, text, numeric, text, text, date, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_locked_financial_entry(text, uuid, uuid, text, text, text, numeric, text, text, date, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb, text, text) TO authenticated;
