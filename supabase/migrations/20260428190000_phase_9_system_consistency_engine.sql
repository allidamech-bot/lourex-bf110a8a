-- Phase 9: database-level Lourex business consistency checks.
-- Targeted rules only; avoids inventing columns or blocking known active flows.

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
      IF OLD.status = 'cancelled'
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

    IF NEW.status = 'transfer_proof_pending'
      AND (
        NEW.transfer_proof_url IS NULL
        OR trim(NEW.transfer_proof_url) = ''
        OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      )
    THEN
      RAISE EXCEPTION 'Transfer proof pending requests require a proof URL and pending proof status';
    END IF;

    IF NEW.status = 'transfer_proof_rejected'
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

      IF v_request.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot create or update a deal from a cancelled purchase request';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_request.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_request.customer_id
      THEN
        RAISE EXCEPTION 'Deal customer must match source purchase request customer';
      END IF;
    END IF;

    IF NEW.status = 'completed'
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

      IF (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled deals';
      END IF;

      IF (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
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

    IF NEW.occurred_at IS NOT NULL
      AND v_latest_tracking_at IS NOT NULL
      AND NEW.occurred_at < v_latest_tracking_at
    THEN
      RAISE EXCEPTION 'Tracking update chronology cannot move backwards';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'financial_entries' THEN
    IF NEW.amount < 0 THEN
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

    IF NEW.entry_number LIKE 'FE-CORR-%'
      AND NEW.locked IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'Financial correction entries must be locked';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_purchase_requests_consistency ON public.purchase_requests;
CREATE TRIGGER validate_purchase_requests_consistency
  BEFORE INSERT OR UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_deals_consistency ON public.deals;
CREATE TRIGGER validate_deals_consistency
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_shipments_consistency ON public.shipments;
CREATE TRIGGER validate_shipments_consistency
  BEFORE INSERT OR UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_tracking_updates_consistency ON public.tracking_updates;
CREATE TRIGGER validate_tracking_updates_consistency
  BEFORE INSERT OR UPDATE ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_financial_entries_consistency ON public.financial_entries;
CREATE TRIGGER validate_financial_entries_consistency
  BEFORE INSERT OR UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();
