-- Phase 13.8-13.14: shipment production hardening.
-- current_stage_code is the source of truth. shipments.status mirrors it.

UPDATE public.shipments
SET current_stage_code = public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'))
WHERE current_stage_code IS NULL
   OR current_stage_code IS DISTINCT FROM public.lourex_normalized_stage(current_stage_code);

UPDATE public.shipments
SET status = public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'))
WHERE status IS DISTINCT FROM public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'));

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_status_check
  CHECK (
    status IN (
      'factory',
      'received_turkey',
      'in_turkey_warehouse',
      'preparing_export',
      'departed_turkey',
      'in_transit',
      'arrived_destination',
      'customs_clearance',
      'out_for_delivery',
      'delivered',
      'closed'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_tracking_id_unique
  ON public.shipments(tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_and_sync_shipment_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_stage text;
  new_stage text;
  old_order integer;
  new_order integer;
BEGIN
  new_stage := public.lourex_normalized_stage(COALESCE(NEW.current_stage_code, NEW.status, 'factory'));
  NEW.current_stage_code := new_stage;
  NEW.status := new_stage;

  IF TG_OP = 'UPDATE' AND NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    old_stage := public.lourex_normalized_stage(COALESCE(OLD.current_stage_code, OLD.status, 'factory'));
    old_order := public.lourex_stage_order(old_stage);
    new_order := public.lourex_stage_order(new_stage);

    IF old_stage = 'closed' THEN
      RAISE EXCEPTION 'Closed shipments cannot be advanced';
    END IF;

    IF old_stage = 'delivered' AND new_stage <> 'closed' THEN
      RAISE EXCEPTION 'Delivered shipments can only move to closed';
    END IF;

    IF new_order <= old_order OR new_order > old_order + 1 THEN
      RAISE EXCEPTION 'Shipment stages must move forward one stage at a time';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_and_sync_shipment_stage ON public.shipments;
CREATE TRIGGER validate_and_sync_shipment_stage
BEFORE INSERT OR UPDATE OF current_stage_code, status ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_sync_shipment_stage();

CREATE OR REPLACE FUNCTION public.validate_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_stage text;
  current_order integer;
  next_order integer;
BEGIN
  NEW.stage_code := public.lourex_normalized_stage(NEW.stage_code);
  IF NEW.previous_stage_code IS NOT NULL THEN
    NEW.previous_stage_code := public.lourex_normalized_stage(NEW.previous_stage_code);
  END IF;

  SELECT current_stage_code
  INTO current_stage
  FROM public.shipments
  WHERE id = NEW.shipment_id;

  current_stage := public.lourex_normalized_stage(COALESCE(current_stage, 'factory'));
  current_order := public.lourex_stage_order(current_stage);
  next_order := public.lourex_stage_order(NEW.stage_code);

  IF NEW.previous_stage_code IS NULL THEN
    NEW.previous_stage_code := current_stage;
  END IF;

  IF next_order = 0 THEN
    RAISE EXCEPTION 'Unknown Lourex tracking stage';
  END IF;

  IF current_stage = 'closed' THEN
    RAISE EXCEPTION 'Closed shipments cannot be advanced';
  END IF;

  IF current_stage = 'delivered' AND NEW.stage_code <> 'closed' THEN
    RAISE EXCEPTION 'Delivered shipments can only move to closed';
  END IF;

  IF next_order < current_order OR next_order > current_order + 1 THEN
    RAISE EXCEPTION 'Tracking updates must follow the official Lourex stage sequence';
  END IF;

  UPDATE public.shipments
  SET current_stage_code = NEW.stage_code,
      status = NEW.stage_code,
      customer_visible_note = CASE
        WHEN COALESCE(NEW.customer_note, '') <> '' THEN NEW.customer_note
        ELSE customer_visible_note
      END,
      updated_at = GREATEST(COALESCE(updated_at, now()), NEW.occurred_at)
  WHERE id = NEW.shipment_id;

  UPDATE public.deals
  SET updated_at = now(),
      operational_status = CASE
        WHEN NEW.stage_code IN ('factory', 'received_turkey', 'in_turkey_warehouse', 'preparing_export', 'departed_turkey') THEN 'origin_execution'
        WHEN NEW.stage_code = 'in_transit' THEN 'in_transit'
        WHEN NEW.stage_code IN ('arrived_destination', 'customs_clearance', 'out_for_delivery') THEN 'destination_execution'
        WHEN NEW.stage_code = 'delivered' THEN 'delivered'
        WHEN NEW.stage_code = 'closed' THEN 'closed'
        ELSE operational_status
      END
  WHERE id = COALESCE(NEW.deal_id, (SELECT deal_id FROM public.shipments WHERE id = NEW.shipment_id));

  RETURN NEW;
END;
$$;
