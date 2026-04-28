-- Align purchase_requests.status with the frontend canonical status list.
-- converted_to_deal was a legacy status; the frontend now uses in_progress after conversion/payment approval.
-- transfer_proof_status remains separate and continues to use pending / accepted / rejected.

UPDATE public.purchase_requests
SET status = 'in_progress'
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
