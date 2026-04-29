-- Phase 14: Partner accounting and settlement system.
-- Additive settlement model. Existing financial entries remain append-only/locked.

CREATE TABLE IF NOT EXISTS public.partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  partner_role text NOT NULL CHECK (partner_role IN ('turkish_partner', 'saudi_partner')),
  settlement_period text NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  partner_commission numeric NOT NULL DEFAULT 0 CHECK (partner_commission >= 0),
  expenses numeric NOT NULL DEFAULT 0 CHECK (expenses >= 0),
  net_due numeric NOT NULL DEFAULT 0 CHECK (net_due >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'paid', 'disputed')),
  approved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  paid_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_settlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.partner_settlements(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status text NULL,
  new_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner_id
  ON public.partner_settlements(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_status
  ON public.partner_settlements(status);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_period
  ON public.partner_settlements(settlement_period);

CREATE INDEX IF NOT EXISTS idx_partner_settlement_events_settlement_id
  ON public.partner_settlement_events(settlement_id, created_at DESC);

ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner operations can manage partner settlements" ON public.partner_settlements;
CREATE POLICY "Owner operations can manage partner settlements"
ON public.partner_settlements
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Partners can view own settlements" ON public.partner_settlements;
CREATE POLICY "Partners can view own settlements"
ON public.partner_settlements
FOR SELECT
USING (
  partner_id = auth.uid()
  AND public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
);

DROP POLICY IF EXISTS "Owner operations can view settlement events" ON public.partner_settlement_events;
CREATE POLICY "Owner operations can view settlement events"
ON public.partner_settlement_events
FOR SELECT
USING (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Partners can view own settlement events" ON public.partner_settlement_events;
CREATE POLICY "Partners can view own settlement events"
ON public.partner_settlement_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.partner_settlements ps
    WHERE ps.id = partner_settlement_events.settlement_id
      AND ps.partner_id = auth.uid()
      AND public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
  )
);

CREATE OR REPLACE FUNCTION public.touch_partner_settlement_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_partner_settlement_updated_at ON public.partner_settlements;
CREATE TRIGGER touch_partner_settlement_updated_at
BEFORE UPDATE ON public.partner_settlements
FOR EACH ROW
EXECUTE FUNCTION public.touch_partner_settlement_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_final_partner_settlement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Partner settlements cannot be deleted';
  END IF;

  IF OLD.status IN ('approved', 'paid') AND current_setting('app.lourex_rpc_action', true) IS DISTINCT FROM 'partner_settlement_workflow' THEN
    RAISE EXCEPTION 'Approved or paid partner settlements cannot be edited directly';
  END IF;

  IF OLD.status = 'paid' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Paid partner settlements are terminal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_final_partner_settlement_mutation ON public.partner_settlements;
CREATE TRIGGER prevent_final_partner_settlement_mutation
BEFORE UPDATE OR DELETE ON public.partner_settlements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_final_partner_settlement_mutation();

CREATE OR REPLACE FUNCTION public.log_partner_settlement_event(
  p_settlement_id uuid,
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
  INSERT INTO public.partner_settlement_events (
    settlement_id,
    action,
    actor_user_id,
    old_status,
    new_status,
    metadata
  )
  VALUES (
    p_settlement_id,
    p_action,
    auth.uid(),
    p_old_status,
    p_new_status,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_partner_settlement(
  p_partner_id uuid,
  p_partner_role text,
  p_settlement_period text,
  p_gross_amount numeric DEFAULT 0,
  p_partner_commission numeric DEFAULT 0,
  p_expenses numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement_id uuid;
  v_net_due numeric := GREATEST(COALESCE(p_partner_commission, 0) + COALESCE(p_expenses, 0), 0);
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can create partner settlements';
  END IF;

  IF p_partner_role NOT IN ('turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Invalid partner role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_partner_id AND role = p_partner_role AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active partner profile not found';
  END IF;

  INSERT INTO public.partner_settlements (
    partner_id,
    partner_role,
    settlement_period,
    gross_amount,
    partner_commission,
    expenses,
    net_due,
    status,
    created_by,
    updated_by
  )
  VALUES (
    p_partner_id,
    p_partner_role,
    p_settlement_period,
    COALESCE(p_gross_amount, 0),
    COALESCE(p_partner_commission, 0),
    COALESCE(p_expenses, 0),
    v_net_due,
    'draft',
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_settlement_id;

  PERFORM public.log_partner_settlement_event(
    v_settlement_id,
    'created',
    NULL,
    'draft',
    jsonb_build_object(
      'gross_amount', COALESCE(p_gross_amount, 0),
      'partner_commission', COALESCE(p_partner_commission, 0),
      'expenses', COALESCE(p_expenses, 0),
      'net_due', v_net_due
    )
  );

  RETURN v_settlement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_partner_settlement(
  p_settlement_id uuid,
  p_gross_amount numeric,
  p_partner_commission numeric,
  p_expenses numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_status text;
  v_net_due numeric := GREATEST(COALESCE(p_partner_commission, 0) + COALESCE(p_expenses, 0), 0);
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can recalculate partner settlements';
  END IF;

  SELECT status INTO v_status
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_status NOT IN ('draft', 'pending_review', 'disputed') THEN
    RAISE EXCEPTION 'Only draft, pending review, or disputed settlements can be recalculated';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET gross_amount = COALESCE(p_gross_amount, 0),
      partner_commission = COALESCE(p_partner_commission, 0),
      expenses = COALESCE(p_expenses, 0),
      net_due = v_net_due,
      status = CASE WHEN status = 'draft' THEN 'draft' ELSE 'pending_review' END
  WHERE id = p_settlement_id;

  PERFORM public.log_partner_settlement_event(
    p_settlement_id,
    'recalculated',
    v_status,
    (SELECT status FROM public.partner_settlements WHERE id = p_settlement_id),
    jsonb_build_object('net_due', v_net_due)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_partner_settlement(p_settlement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can approve partner settlements';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_settlement.status NOT IN ('draft', 'pending_review', 'disputed') THEN
    RAISE EXCEPTION 'Only draft, pending review, or disputed settlements can be approved';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_settlement_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED'
  ) THEN
    INSERT INTO public.financial_entries (
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
      'FE-SET-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      'expense',
      'global',
      'general',
      v_settlement.net_due,
      'SAR',
      'Approved partner settlement for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement',
      v_settlement.partner_role,
      'partner_settlement_accrual',
      'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED',
      auth.uid(),
      true
    );
  END IF;

  PERFORM public.log_partner_settlement_event(p_settlement_id, 'approved', v_settlement.status, 'approved', '{}'::jsonb);
END;
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
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can mark partner settlements paid';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_settlement.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved settlements can be marked paid';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'paid',
      paid_at = now()
  WHERE id = p_settlement_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-PAID'
  ) THEN
    INSERT INTO public.financial_entries (
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
      'Paid partner settlement for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement_payment',
      v_settlement.partner_role,
      'partner_settlement_payment',
      'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-PAID',
      auth.uid(),
      true
    );
  END IF;

  PERFORM public.log_partner_settlement_event(p_settlement_id, 'marked_paid', v_settlement.status, 'paid', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.dispute_partner_settlement(
  p_settlement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Only internal users can dispute partner settlements';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_role IN ('turkish_partner', 'saudi_partner') AND v_settlement.partner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Partners can only dispute their own settlements';
  END IF;

  IF v_settlement.status = 'paid' THEN
    RAISE EXCEPTION 'Paid settlements are terminal';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'disputed'
  WHERE id = p_settlement_id;

  PERFORM public.log_partner_settlement_event(
    p_settlement_id,
    'disputed',
    v_settlement.status,
    'disputed',
    jsonb_build_object('reason', COALESCE(p_reason, ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_partner_settlement_event(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_partner_settlement(uuid, text, text, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_partner_settlement(uuid, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_partner_settlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_partner_settlement_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispute_partner_settlement(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_partner_settlement(uuid, text, text, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_partner_settlement(uuid, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_partner_settlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_partner_settlement_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispute_partner_settlement(uuid, text) TO authenticated;
