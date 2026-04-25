-- Fix purchase_requests status check constraint to include 'cancelled'
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
      'converted_to_deal',
      'cancelled'
    )
  );

-- Remove broad customer UPDATE policy if it exists
DROP POLICY IF EXISTS "Customers can update own purchase requests to cancelled" ON public.purchase_requests;

-- Security definer RPC for safe cancellation
-- This is the ONLY path for customers to cancel their own requests.
CREATE OR REPLACE FUNCTION public.cancel_purchase_request(p_request_id uuid, p_reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal boolean;
  v_user_id uuid;
BEGIN
  -- 1. Validate auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_internal := public.is_lourex_internal(v_user_id);

  -- 2. Perform the update with strict visibility/state checks
  UPDATE public.purchase_requests
  SET 
    status = 'cancelled',
    updated_at = now()
    -- p_reason is ignored for now as no dedicated column exists and 
    -- we MUST NOT write customer-provided reason into internal_notes.
  WHERE id = p_request_id
    AND (
      -- Internal roles can cancel any non-converted request
      (v_is_internal AND status <> 'converted_to_deal')
      OR (
        -- Customers can only cancel their own if in submission/clarification phase
        public.current_lourex_role() = 'customer'
        AND customer_id = v_user_id
        AND status IN ('intake_submitted', 'awaiting_clarification')
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled in its current state';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid, text) TO authenticated;
