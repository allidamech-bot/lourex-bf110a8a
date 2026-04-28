-- Phase 10: configurable Lourex business rules.

CREATE TABLE IF NOT EXISTS public.business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_group text NOT NULL,
  description text NULL,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'error',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT business_rules_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view business rules" ON public.business_rules;
CREATE POLICY "Owner and operations can view business rules"
ON public.business_rules
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Owner can insert business rules" ON public.business_rules;
CREATE POLICY "Owner can insert business rules"
ON public.business_rules
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Owner can update business rules" ON public.business_rules;
CREATE POLICY "Owner can update business rules"
ON public.business_rules
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Owner can delete business rules" ON public.business_rules;
CREATE POLICY "Owner can delete business rules"
ON public.business_rules
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

INSERT INTO public.business_rules (rule_key, rule_group, description, enabled, severity, config)
VALUES
  ('purchase_request.restore_cancelled_requires_owner_ops', 'purchase_requests', 'Cancelled purchase requests require an owner/operations workflow before restoration.', true, 'critical', '{}'::jsonb),
  ('purchase_request.transfer_proof_pending_requires_url', 'purchase_requests', 'Transfer proof pending requests must include a proof URL and pending proof status.', true, 'error', '{}'::jsonb),
  ('purchase_request.transfer_proof_rejected_requires_reason', 'purchase_requests', 'Rejected transfer proofs must include rejected proof status and a rejection reason.', true, 'error', '{}'::jsonb),
  ('deal.prevent_cancelled_request_conversion', 'deals', 'Deals cannot be created or updated from cancelled purchase requests.', true, 'critical', '{}'::jsonb),
  ('deal.completed_requires_delivered_shipment', 'deals', 'Completed deals should have at least one delivered shipment.', true, 'warning', '{"enforcement":"soft"}'::jsonb),
  ('shipment.prevent_delivered_for_cancelled_deal', 'shipments', 'Delivered shipments cannot belong to cancelled deals or source requests.', true, 'critical', '{}'::jsonb),
  ('tracking.prevent_backdated_updates', 'tracking', 'Tracking updates should not move chronology backwards.', true, 'warning', '{}'::jsonb),
  ('finance.prevent_negative_amount', 'financial_entries', 'Financial entry amounts must be non-negative.', true, 'critical', '{}'::jsonb),
  ('finance.require_locked_corrections', 'financial_entries', 'Financial correction entries must remain locked.', true, 'critical', '{}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_business_rule_enabled(p_rule_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.business_rules WHERE rule_key = p_rule_key),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_business_rule_config(p_rule_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT config FROM public.business_rules WHERE rule_key = p_rule_key),
    '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_rule_enabled(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_rule_config(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_rule_enabled(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_rule_config(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_business_rules_updated_at()
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

DROP TRIGGER IF EXISTS touch_business_rules_updated_at ON public.business_rules;
CREATE TRIGGER touch_business_rules_updated_at
  BEFORE UPDATE ON public.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_business_rules_updated_at();

CREATE OR REPLACE FUNCTION public.validate_lourex_business_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text := current_setting('app.lourex_rpc_action', true);
  v_is_owner_ops boolean := COALESCE(public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']), false);
  v_request public.purchase_requests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_latest_tracking_at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'purchase_requests' THEN
    IF TG_OP = 'UPDATE' THEN
      IF public.is_business_rule_enabled('purchase_request.restore_cancelled_requires_owner_ops')
        AND OLD.status = 'cancelled'
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NOT (v_is_owner_ops AND v_action = 'restore_cancelled_purchase_request')
      THEN
        RAISE EXCEPTION 'Cancelled purchase requests cannot be restored without an approved owner/operations workflow';
      END IF;

      IF OLD.status = 'completed'
        AND public.current_lourex_role() = 'customer'
        AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)
      THEN
        RAISE EXCEPTION 'Completed purchase requests cannot be edited by customers';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('purchase_request.transfer_proof_pending_requires_url')
      AND NEW.status = 'transfer_proof_pending'
      AND (
        NEW.transfer_proof_url IS NULL
        OR trim(NEW.transfer_proof_url) = ''
        OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      )
    THEN
      RAISE EXCEPTION 'Transfer proof pending requests require a proof URL and pending proof status';
    END IF;

    IF public.is_business_rule_enabled('purchase_request.transfer_proof_rejected_requires_reason')
      AND NEW.status = 'transfer_proof_rejected'
      AND (
        NEW.transfer_proof_status IS DISTINCT FROM 'rejected'
        OR trim(COALESCE(NEW.transfer_rejection_reason, '')) = ''
      )
    THEN
      RAISE EXCEPTION 'Rejected transfer proofs require rejected proof status and a rejection reason';
    END IF;

    IF NEW.status = 'ready_for_conversion'
      AND NEW.transfer_proof_status = 'accepted'
    THEN
      RAISE EXCEPTION 'Ready-for-conversion requests cannot already have accepted transfer proof status';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'deals' THEN
    IF NEW.source_request_id IS NOT NULL THEN
      SELECT *
      INTO v_request
      FROM public.purchase_requests
      WHERE id = NEW.source_request_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Deal source purchase request does not exist';
      END IF;

      IF public.is_business_rule_enabled('deal.prevent_cancelled_request_conversion')
        AND v_request.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Cannot create or update a deal from a cancelled purchase request';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_request.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_request.customer_id
      THEN
        RAISE EXCEPTION 'Deal customer must match source purchase request customer';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('deal.completed_requires_delivered_shipment')
      AND COALESCE(public.get_business_rule_config('deal.completed_requires_delivered_shipment') ->> 'enforcement', 'hard') <> 'soft'
      AND NEW.status = 'completed'
      AND (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.deal_id = NEW.id
          AND (s.status = 'delivered' OR s.current_stage_code = 'delivered')
      )
    THEN
      RAISE EXCEPTION 'Completed deals require at least one delivered shipment';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'shipments' THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Shipment linked deal does not exist';
      END IF;

      IF public.is_business_rule_enabled('shipment.prevent_delivered_for_cancelled_deal')
        AND (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled deals';
      END IF;

      IF public.is_business_rule_enabled('shipment.prevent_delivered_for_cancelled_deal')
        AND (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.source_request_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.purchase_requests pr
          WHERE pr.id = v_deal.source_request_id
            AND pr.status = 'cancelled'
        )
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled source requests';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'tracking_updates' THEN
    IF NEW.deal_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.id = NEW.shipment_id
          AND s.deal_id = NEW.deal_id
      )
    THEN
      RAISE EXCEPTION 'Tracking update deal must match shipment deal';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = NEW.shipment_id) THEN
      RAISE EXCEPTION 'Tracking update shipment does not exist';
    END IF;

    SELECT max(tu.occurred_at)
    INTO v_latest_tracking_at
    FROM public.tracking_updates tu
    WHERE tu.shipment_id = NEW.shipment_id
      AND (TG_OP = 'INSERT' OR tu.id <> NEW.id);

    IF public.is_business_rule_enabled('tracking.prevent_backdated_updates')
      AND COALESCE(public.get_business_rule_config('tracking.prevent_backdated_updates') ->> 'enforcement', 'hard') <> 'soft'
      AND NEW.occurred_at IS NOT NULL
      AND v_latest_tracking_at IS NOT NULL
      AND NEW.occurred_at < v_latest_tracking_at
    THEN
      RAISE EXCEPTION 'Tracking update chronology cannot move backwards';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'financial_entries' THEN
    IF public.is_business_rule_enabled('finance.prevent_negative_amount')
      AND NEW.amount < 0
    THEN
      RAISE EXCEPTION 'Financial entry amount must be non-negative';
    END IF;

    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Financial entry linked deal does not exist';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_deal.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_deal.customer_id
      THEN
        RAISE EXCEPTION 'Financial entry customer must match linked deal customer';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('finance.require_locked_corrections')
      AND NEW.entry_number LIKE 'FE-CORR-%'
      AND NEW.locked IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'Financial correction entries must be locked';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
