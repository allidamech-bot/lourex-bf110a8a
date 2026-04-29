-- Phase 15: Payment tracking and financial reconciliation.
-- Adds payment trail, allocations, audit events, and settlement payment linkage.

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  payer_type text NOT NULL CHECK (payer_type IN ('customer', 'saudi_partner', 'turkish_partner', 'internal')),
  payer_id uuid NULL,
  related_deal_id uuid NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  related_settlement_id uuid NULL REFERENCES public.partner_settlements(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  received_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  financial_entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  allocated_amount numeric NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, financial_entry_id)
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status text NULL,
  new_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_type, payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_deal ON public.payments(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_settlement ON public.payments(related_settlement_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_entry ON public.payment_allocations(financial_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON public.payment_events(payment_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can manage payments" ON public.payments;
CREATE POLICY "Internal users can manage payments"
ON public.payments
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments"
ON public.payments
FOR SELECT
USING (
  public.current_lourex_role() = 'customer'
  AND (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = payments.related_deal_id
        AND (d.customer_id = auth.uid() OR d.client_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Partners can view related payments" ON public.payments;
CREATE POLICY "Partners can view related payments"
ON public.payments
FOR SELECT
USING (
  public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
  AND (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.partner_settlements ps
      WHERE ps.id = payments.related_settlement_id
        AND ps.partner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Internal users can manage payment allocations" ON public.payment_allocations;
CREATE POLICY "Internal users can manage payment allocations"
ON public.payment_allocations
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Visible payment allocations can be read" ON public.payment_allocations;
CREATE POLICY "Visible payment allocations can be read"
ON public.payment_allocations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
  )
);

DROP POLICY IF EXISTS "Internal users can view payment events" ON public.payment_events;
CREATE POLICY "Internal users can view payment events"
ON public.payment_events
FOR SELECT
USING (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Visible payment events can be read" ON public.payment_events;
CREATE POLICY "Visible payment events can be read"
ON public.payment_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_events.payment_id
  )
);

CREATE OR REPLACE FUNCTION public.touch_payment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_payment_updated_at ON public.payments;
CREATE TRIGGER touch_payment_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.touch_payment_updated_at();

CREATE OR REPLACE FUNCTION public.validate_payment_allocation_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payment_amount numeric;
  v_payment_status text;
  v_entry_amount numeric;
  v_payment_allocated numeric;
  v_entry_allocated numeric;
BEGIN
  SELECT amount, payment_status INTO v_payment_amount, v_payment_status
  FROM public.payments
  WHERE id = NEW.payment_id;

  IF v_payment_status IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be allocated';
  END IF;

  SELECT amount INTO v_entry_amount
  FROM public.financial_entries
  WHERE id = NEW.financial_entry_id;

  IF v_entry_amount IS NULL THEN
    RAISE EXCEPTION 'Financial entry not found';
  END IF;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_payment_allocated
  FROM public.payment_allocations
  WHERE payment_id = NEW.payment_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_entry_allocated
  FROM public.payment_allocations
  WHERE financial_entry_id = NEW.financial_entry_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_payment_allocated + NEW.allocated_amount > v_payment_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds confirmed payment amount';
  END IF;

  IF v_entry_allocated + NEW.allocated_amount > v_entry_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds financial entry amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_allocation_limits ON public.payment_allocations;
CREATE TRIGGER validate_payment_allocation_limits
BEFORE INSERT OR UPDATE ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_allocation_limits();

CREATE OR REPLACE FUNCTION public.log_payment_event(
  p_payment_id uuid,
  p_action text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_events(payment_id, action, actor_user_id, old_status, new_status, metadata)
  VALUES (p_payment_id, p_action, auth.uid(), p_old_status, p_new_status, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment(
  p_payer_type text,
  p_payer_id uuid,
  p_related_deal_id uuid,
  p_related_settlement_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'SAR',
  p_payment_method text DEFAULT 'bank_transfer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment_id uuid;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can create payments';
  END IF;

  IF p_payer_type NOT IN ('customer', 'saudi_partner', 'turkish_partner', 'internal') THEN
    RAISE EXCEPTION 'Invalid payer type';
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  v_reference := 'PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.payments(
    reference_number,
    payer_type,
    payer_id,
    related_deal_id,
    related_settlement_id,
    amount,
    currency,
    payment_method,
    payment_status
  )
  VALUES (
    v_reference,
    p_payer_type,
    p_payer_id,
    p_related_deal_id,
    p_related_settlement_id,
    p_amount,
    COALESCE(NULLIF(p_currency, ''), 'SAR'),
    COALESCE(NULLIF(p_payment_method, ''), 'bank_transfer'),
    'pending'
  )
  RETURNING id INTO v_payment_id;

  PERFORM public.log_payment_event(v_payment_id, 'created', NULL, 'pending', jsonb_build_object('reference_number', v_reference));
  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment public.payments%ROWTYPE;
  v_entry_id uuid;
  v_entry_type text;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can confirm payments';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending payments can be confirmed';
  END IF;

  UPDATE public.payments
  SET payment_status = 'confirmed',
      received_at = COALESCE(received_at, now())
  WHERE id = p_payment_id;

  v_entry_type := CASE WHEN v_payment.payer_type = 'internal' THEN 'expense' ELSE 'income' END;
  v_reference := 'PAYMENT-' || p_payment_id::text || '-CONFIRMED';

  IF NOT EXISTS (SELECT 1 FROM public.financial_entries WHERE reference_label = v_reference) THEN
    INSERT INTO public.financial_entries(
      entry_number,
      deal_id,
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
      'FE-PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      v_payment.related_deal_id,
      v_entry_type,
      CASE WHEN v_payment.related_deal_id IS NULL THEN 'global' ELSE 'deal_linked' END,
      CASE WHEN v_payment.related_deal_id IS NULL THEN 'general' ELSE 'deal_linked' END,
      v_payment.amount,
      v_payment.currency,
      'Confirmed payment ' || v_payment.reference_number,
      now()::date,
      v_payment.payment_method,
      v_payment.payer_type,
      'payment',
      v_reference,
      auth.uid(),
      true
    )
    RETURNING id INTO v_entry_id;
  ELSE
    SELECT id INTO v_entry_id FROM public.financial_entries WHERE reference_label = v_reference LIMIT 1;
  END IF;

  PERFORM public.log_payment_event(p_payment_id, 'confirmed', 'pending', 'confirmed', jsonb_build_object('financial_entry_id', v_entry_id));
  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can reject payments';
  END IF;

  SELECT payment_status INTO v_status FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Only pending payments can be rejected'; END IF;

  UPDATE public.payments SET payment_status = 'rejected' WHERE id = p_payment_id;
  PERFORM public.log_payment_event(p_payment_id, 'rejected', v_status, 'rejected', jsonb_build_object('reason', COALESCE(p_reason, '')));
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_payment(
  p_payment_id uuid,
  p_financial_entry_id uuid,
  p_allocated_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment_amount numeric;
  v_payment_status text;
  v_existing_payment_allocated numeric;
  v_existing_entry_allocated numeric;
  v_entry_amount numeric;
  v_allocation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can allocate payments';
  END IF;

  IF COALESCE(p_allocated_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Allocation amount must be positive';
  END IF;

  SELECT amount, payment_status INTO v_payment_amount, v_payment_status
  FROM public.payments
  WHERE id = p_payment_id;

  IF v_payment_status IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment_status <> 'confirmed' THEN RAISE EXCEPTION 'Only confirmed payments can be allocated'; END IF;

  SELECT amount INTO v_entry_amount FROM public.financial_entries WHERE id = p_financial_entry_id;
  IF v_entry_amount IS NULL THEN RAISE EXCEPTION 'Financial entry not found'; END IF;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_payment_allocated
  FROM public.payment_allocations
  WHERE payment_id = p_payment_id;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_entry_allocated
  FROM public.payment_allocations
  WHERE financial_entry_id = p_financial_entry_id;

  IF v_existing_payment_allocated + p_allocated_amount > v_payment_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds confirmed payment amount';
  END IF;

  IF v_existing_entry_allocated + p_allocated_amount > v_entry_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds financial entry amount';
  END IF;

  INSERT INTO public.payment_allocations(payment_id, financial_entry_id, allocated_amount)
  VALUES (p_payment_id, p_financial_entry_id, p_allocated_amount)
  RETURNING id INTO v_allocation_id;

  PERFORM public.log_payment_event(
    p_payment_id,
    'allocated',
    'confirmed',
    'confirmed',
    jsonb_build_object('financial_entry_id', p_financial_entry_id, 'allocated_amount', p_allocated_amount)
  );

  RETURN v_allocation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_outstanding_balance(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS TABLE(expected_amount numeric, paid_amount numeric, outstanding_amount numeric, reconciliation_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH relevant_entries AS (
    SELECT id, amount
    FROM public.financial_entries
    WHERE (
      (type = 'income' AND p_entity_type = 'deal' AND deal_id = p_entity_id)
      OR (type = 'income' AND p_entity_type = 'customer' AND customer_id = p_entity_id)
      OR (p_entity_type = 'settlement' AND reference_label = 'PARTNER-SETTLEMENT-' || p_entity_id::text || '-APPROVED')
    )
  ),
  totals AS (
    SELECT
      COALESCE((SELECT SUM(amount) FROM relevant_entries), 0) AS expected_amount,
      COALESCE((
        SELECT SUM(pa.allocated_amount)
        FROM public.payment_allocations pa
        WHERE pa.financial_entry_id IN (SELECT id FROM relevant_entries)
      ), 0) AS paid_amount
  )
  SELECT
    expected_amount,
    paid_amount,
    GREATEST(expected_amount - paid_amount, 0) AS outstanding_amount,
    CASE
      WHEN expected_amount = 0 THEN 'unpaid'
      WHEN paid_amount >= expected_amount THEN 'fully_paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END AS reconciliation_status
  FROM totals;
$$;

CREATE OR REPLACE FUNCTION public.mark_partner_settlement_paid(p_settlement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
  v_payment_id uuid;
  v_payment_reference text;
  v_entry_id uuid;
  v_approval_entry_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can mark partner settlements paid';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN RAISE EXCEPTION 'Partner settlement not found'; END IF;
  IF v_settlement.status <> 'approved' THEN RAISE EXCEPTION 'Only approved settlements can be marked paid'; END IF;

  v_payment_reference := 'SET-PAY-' || p_settlement_id::text;

  SELECT id INTO v_payment_id FROM public.payments WHERE reference_number = v_payment_reference LIMIT 1;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments(
      reference_number,
      payer_type,
      payer_id,
      related_settlement_id,
      amount,
      currency,
      payment_method,
      payment_status,
      received_at
    )
    VALUES (
      v_payment_reference,
      'internal',
      auth.uid(),
      p_settlement_id,
      v_settlement.net_due,
      'SAR',
      'settlement_payment',
      'confirmed',
      now()
    )
    RETURNING id INTO v_payment_id;

    PERFORM public.log_payment_event(v_payment_id, 'created', NULL, 'confirmed', jsonb_build_object('related_settlement_id', p_settlement_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PAYMENT-' || v_payment_id::text || '-CONFIRMED'
  ) THEN
    INSERT INTO public.financial_entries(
      entry_number,
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
      'FE-PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      'expense',
      'global',
      'general',
      v_settlement.net_due,
      'SAR',
      'Settlement payment for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement_payment',
      v_settlement.partner_role,
      'partner_settlement_payment',
      'PAYMENT-' || v_payment_id::text || '-CONFIRMED',
      auth.uid(),
      true
    )
    RETURNING id INTO v_entry_id;
  ELSE
    SELECT id INTO v_entry_id
    FROM public.financial_entries
    WHERE reference_label = 'PAYMENT-' || v_payment_id::text || '-CONFIRMED'
    LIMIT 1;
  END IF;

  SELECT id INTO v_approval_entry_id
  FROM public.financial_entries
  WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED'
  LIMIT 1;

  IF v_approval_entry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.payment_allocations
    WHERE payment_id = v_payment_id AND financial_entry_id = v_approval_entry_id
  ) THEN
    INSERT INTO public.payment_allocations(payment_id, financial_entry_id, allocated_amount)
    VALUES (v_payment_id, v_approval_entry_id, v_settlement.net_due);
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'paid',
      paid_at = now()
  WHERE id = p_settlement_id;

  PERFORM public.log_payment_event(v_payment_id, 'allocated', 'confirmed', 'confirmed', jsonb_build_object('related_settlement_id', p_settlement_id));
  PERFORM public.log_partner_settlement_event(p_settlement_id, 'marked_paid', v_settlement.status, 'paid', jsonb_build_object('payment_id', v_payment_id, 'financial_entry_id', v_entry_id));
END;
$$;

REVOKE ALL ON FUNCTION public.log_payment_event(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment(text, uuid, uuid, uuid, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_payment(uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_outstanding_balance(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_payment(text, uuid, uuid, uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_payment(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outstanding_balance(text, uuid) TO authenticated;
