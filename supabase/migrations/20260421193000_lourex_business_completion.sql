ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS internal_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS converted_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS assigned_turkish_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_saudi_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'awaiting_assignment',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_operational_status_check'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_operational_status_check
      CHECK (
        operational_status IN (
          'awaiting_assignment',
          'partner_assigned',
          'sourcing',
          'origin_execution',
          'in_transit',
          'destination_execution',
          'delivered',
          'closed'
        )
      );
  END IF;
END $$;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_visible_note text NOT NULL DEFAULT '';

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS relation_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entry_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS counterparty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_label text NOT NULL DEFAULT '';

UPDATE public.financial_entries
SET relation_type = CASE
  WHEN deal_id IS NOT NULL THEN 'deal_linked'
  WHEN customer_id IS NOT NULL THEN 'customer_linked'
  ELSE 'general'
END
WHERE relation_type IS NULL
   OR relation_type = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_entries_relation_type_check'
  ) THEN
    ALTER TABLE public.financial_entries
      ADD CONSTRAINT financial_entries_relation_type_check
      CHECK (relation_type IN ('deal_linked', 'customer_linked', 'general'));
  END IF;
END $$;

ALTER TABLE public.financial_edit_requests
  ADD COLUMN IF NOT EXISTS old_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'reference',
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'product-images',
  storage_path text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'internal',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_entity_type_check'
  ) THEN
    ALTER TABLE public.attachments
      ADD CONSTRAINT attachments_entity_type_check
      CHECK (entity_type IN ('purchase_request', 'deal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_visibility_check'
  ) THEN
    ALTER TABLE public.attachments
      ADD CONSTRAINT attachments_visibility_check
      CHECK (visibility IN ('internal', 'customer_visible'));
  END IF;
END $$;

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can view operational profiles" ON public.profiles;
CREATE POLICY "Internal users can view operational profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner'])
  );

DROP POLICY IF EXISTS "Internal users can view attachments" ON public.attachments;
CREATE POLICY "Internal users can view attachments"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Internal users can manage attachments" ON public.attachments;
CREATE POLICY "Internal users can manage attachments"
  ON public.attachments
  FOR ALL
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
  WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Public purchase request attachments can be inserted" ON public.attachments;
CREATE POLICY "Public purchase request attachments can be inserted"
  ON public.attachments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (entity_type = 'purchase_request');

CREATE TABLE IF NOT EXISTS public.tracking_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  stage_code text NOT NULL,
  previous_stage_code text,
  note text NOT NULL DEFAULT '',
  customer_note text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'internal',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_stage_code_check'
  ) THEN
    ALTER TABLE public.tracking_updates
      ADD CONSTRAINT tracking_updates_stage_code_check
      CHECK (
        stage_code IN (
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'in_transit',
          'arrived_destination',
          'destination_customs',
          'transfer_to_warehouse',
          'delivered'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_previous_stage_code_check'
  ) THEN
    ALTER TABLE public.tracking_updates
      ADD CONSTRAINT tracking_updates_previous_stage_code_check
      CHECK (
        previous_stage_code IS NULL OR previous_stage_code IN (
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'in_transit',
          'arrived_destination',
          'destination_customs',
          'transfer_to_warehouse',
          'delivered'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_visibility_check'
  ) THEN
    ALTER TABLE public.tracking_updates
      ADD CONSTRAINT tracking_updates_visibility_check
      CHECK (visibility IN ('internal', 'customer_visible'));
  END IF;
END $$;

ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lourex_stage_order(p_stage text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stage
    WHEN 'deal_accepted' THEN 1
    WHEN 'product_preparation' THEN 2
    WHEN 'transfer_to_port' THEN 3
    WHEN 'origin_port' THEN 4
    WHEN 'origin_customs' THEN 5
    WHEN 'departed_origin' THEN 6
    WHEN 'in_transit' THEN 7
    WHEN 'arrived_destination' THEN 8
    WHEN 'destination_customs' THEN 9
    WHEN 'transfer_to_warehouse' THEN 10
    WHEN 'delivered' THEN 11
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.validate_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_stage text;
  current_order integer;
  next_order integer;
BEGIN
  SELECT current_stage_code
  INTO current_stage
  FROM public.shipments
  WHERE id = NEW.shipment_id;

  current_order := public.lourex_stage_order(COALESCE(current_stage, 'deal_accepted'));
  next_order := public.lourex_stage_order(NEW.stage_code);

  IF NEW.previous_stage_code IS NULL THEN
    NEW.previous_stage_code := current_stage;
  END IF;

  IF next_order = 0 THEN
    RAISE EXCEPTION 'Unknown Lourex tracking stage';
  END IF;

  IF next_order < current_order OR next_order > current_order + 1 THEN
    RAISE EXCEPTION 'Tracking updates must follow the official Lourex stage sequence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.shipments
  SET current_stage_code = NEW.stage_code,
      customer_visible_note = CASE
        WHEN COALESCE(NEW.customer_note, '') <> '' THEN NEW.customer_note
        ELSE customer_visible_note
      END,
      updated_at = GREATEST(COALESCE(updated_at, now()), NEW.occurred_at)
  WHERE id = NEW.shipment_id;

  UPDATE public.deals
  SET updated_at = now(),
      operational_status = CASE
        WHEN NEW.stage_code IN ('product_preparation', 'transfer_to_port', 'origin_port', 'origin_customs', 'departed_origin') THEN 'origin_execution'
        WHEN NEW.stage_code IN ('in_transit') THEN 'in_transit'
        WHEN NEW.stage_code IN ('arrived_destination', 'destination_customs', 'transfer_to_warehouse') THEN 'destination_execution'
        WHEN NEW.stage_code = 'delivered' THEN 'delivered'
        ELSE operational_status
      END
  WHERE id = COALESCE(NEW.deal_id, (SELECT deal_id FROM public.shipments WHERE id = NEW.shipment_id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tracking_update ON public.tracking_updates;
CREATE TRIGGER validate_tracking_update
  BEFORE INSERT ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tracking_update();

DROP TRIGGER IF EXISTS apply_tracking_update ON public.tracking_updates;
CREATE TRIGGER apply_tracking_update
  AFTER INSERT ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_tracking_update();

DROP POLICY IF EXISTS "Internal users can view tracking updates" ON public.tracking_updates;
CREATE POLICY "Internal users can view tracking updates"
  ON public.tracking_updates
  FOR SELECT
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Allowed partners can insert tracking updates" ON public.tracking_updates;
CREATE POLICY "Allowed partners can insert tracking updates"
  ON public.tracking_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) OR
    (
      public.get_profile_role(auth.uid()) = 'turkish_partner' AND
      public.lourex_stage_order(stage_code) BETWEEN 1 AND 6
    ) OR
    (
      public.get_profile_role(auth.uid()) = 'saudi_partner' AND
      public.lourex_stage_order(stage_code) BETWEEN 7 AND 11
    )
  );

CREATE OR REPLACE FUNCTION public.log_purchase_request_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_values, new_values)
  VALUES (
    'purchase_request.submitted',
    'purchase_requests',
    NEW.id,
    NULL,
    NULL,
    jsonb_build_object(
      'request_id', NEW.id,
      'request_number', NEW.request_number,
      'customer_name', NEW.full_name,
      'customer_email', NEW.email,
      'summary', format('تم استلام طلب الشراء %s', NEW.request_number),
      'actor_label', 'Public Request',
      'entity_label', COALESCE(NULLIF(NEW.product_name, ''), NEW.request_number)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_purchase_request_submission ON public.purchase_requests;
CREATE TRIGGER log_purchase_request_submission
  AFTER INSERT ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_purchase_request_submission();

CREATE INDEX IF NOT EXISTS idx_purchase_requests_converted_deal_id ON public.purchase_requests(converted_deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_turkish_partner_id ON public.deals(assigned_turkish_partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_saudi_partner_id ON public.deals(assigned_saudi_partner_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_relation_type ON public.financial_entries(relation_type);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_shipment_id ON public.tracking_updates(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_deal_id ON public.tracking_updates(deal_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_occurred_at ON public.tracking_updates(occurred_at DESC);
