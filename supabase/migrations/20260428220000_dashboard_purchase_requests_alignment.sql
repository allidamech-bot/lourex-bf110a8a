-- Dashboard purchase request workflow alignment.
-- This migration only restores the schema and RLS surface used by the owner/operations/partner
-- purchase request dashboard and the Phase 13.3 minimal deal automation.

ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS converted_deal_id uuid,
  ADD COLUMN IF NOT EXISTS customer_hidden_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS internal_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS transfer_proof_url text,
  ADD COLUMN IF NOT EXISTS transfer_proof_name text,
  ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_proof_status text,
  ADD COLUMN IF NOT EXISTS transfer_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_accepted_by uuid,
  ADD COLUMN IF NOT EXISTS transfer_rejection_reason text;

DO $$
BEGIN
  IF to_regclass('public.deals') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'purchase_requests_converted_deal_id_fkey'
        AND conrelid = 'public.purchase_requests'::regclass
    )
  THEN
    ALTER TABLE public.purchase_requests
      ADD CONSTRAINT purchase_requests_converted_deal_id_fkey
      FOREIGN KEY (converted_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_reviewed_by_fkey'
      AND conrelid = 'public.purchase_requests'::regclass
  )
  THEN
    ALTER TABLE public.purchase_requests
      ADD CONSTRAINT purchase_requests_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_transfer_accepted_by_fkey'
      AND conrelid = 'public.purchase_requests'::regclass
  )
  THEN
    ALTER TABLE public.purchase_requests
      ADD CONSTRAINT purchase_requests_transfer_accepted_by_fkey
      FOREIGN KEY (transfer_accepted_by) REFERENCES auth.users(id);
  END IF;
END $$;

UPDATE public.purchase_requests
SET status = 'in_progress',
    updated_at = now()
WHERE status = 'converted_to_deal';

ALTER TABLE public.purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

ALTER TABLE public.purchase_requests
  ADD CONSTRAINT purchase_requests_status_check
  CHECK (
    status IN (
      'intake_submitted',
      'under_review',
      'awaiting_clarification',
      'ready_for_conversion',
      'transfer_proof_pending',
      'transfer_proof_rejected',
      'in_progress',
      'completed',
      'cancelled'
    )
  );

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source_request_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS operation_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'awaiting_assignment',
  ADD COLUMN IF NOT EXISTS shipment_id uuid,
  ADD COLUMN IF NOT EXISTS accounting_reference text DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_turkish_partner_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_saudi_partner_id uuid;

DO $$
BEGIN
  IF to_regclass('public.purchase_requests') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_source_request_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_source_request_id_fkey
      FOREIGN KEY (source_request_id) REFERENCES public.purchase_requests(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.lourex_customers') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_customer_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.lourex_customers(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_assigned_turkish_partner_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_assigned_turkish_partner_id_fkey
      FOREIGN KEY (assigned_turkish_partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_assigned_saudi_partner_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_assigned_saudi_partner_id_fkey
      FOREIGN KEY (assigned_saudi_partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard internal can select purchase requests" ON public.purchase_requests;
CREATE POLICY "Dashboard internal can select purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can update purchase requests" ON public.purchase_requests;
CREATE POLICY "Dashboard internal can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
)
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Customers can select own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can select own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Customers can insert own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Dashboard internal can select deals" ON public.deals;
CREATE POLICY "Dashboard internal can select deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert deals" ON public.deals;
CREATE POLICY "Dashboard internal can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Customers can select own deals" ON public.deals;
CREATE POLICY "Customers can select own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Dashboard internal can select notifications" ON public.notifications;
CREATE POLICY "Dashboard internal can select notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert notifications" ON public.notifications;
CREATE POLICY "Dashboard internal can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
CREATE POLICY "Users can select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Dashboard internal can select audit logs" ON public.audit_logs;
CREATE POLICY "Dashboard internal can select audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert audit logs" ON public.audit_logs;
CREATE POLICY "Dashboard internal can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);
