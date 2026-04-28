-- Phase 7B: harden customer purchase request mutations behind dedicated RPCs.
-- Customers may no longer directly update arbitrary purchase_requests columns.

DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Customers can update own purchase requests to cancelled" ON public.purchase_requests;

CREATE OR REPLACE FUNCTION public.protect_purchase_requests_customer_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_action text := current_setting('app.lourex_rpc_action', true);
  v_is_trusted_rpc_context boolean := current_user NOT IN ('anon', 'authenticated');
BEGIN
  IF v_user_id IS NULL THEN
    IF current_role IN ('postgres', 'service_role', 'supabase_admin') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.is_lourex_role(v_user_id, ARRAY['owner', 'operations_employee']) THEN
    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'hide_purchase_request' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY['customer_hidden_at'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['customer_hidden_at'])
    THEN
      RAISE EXCEPTION 'Only customer hide updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'submit_transfer_proof' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR OLD.status NOT IN ('ready_for_conversion', 'transfer_proof_rejected')
      OR NEW.status IS DISTINCT FROM 'transfer_proof_pending'
      OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY[
            'status',
            'transfer_proof_url',
            'transfer_proof_name',
            'transfer_proof_uploaded_at',
            'transfer_proof_status',
            'transfer_rejection_reason',
            'updated_at'
          ])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY[
            'status',
            'transfer_proof_url',
            'transfer_proof_name',
            'transfer_proof_uploaded_at',
            'transfer_proof_status',
            'transfer_rejection_reason',
            'updated_at'
          ])
    THEN
      RAISE EXCEPTION 'Only transfer proof submission updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'cancel_purchase_request' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR OLD.status NOT IN ('intake_submitted', 'awaiting_clarification')
      OR NEW.status IS DISTINCT FROM 'cancelled'
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY['status', 'updated_at'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['status', 'updated_at'])
    THEN
      RAISE EXCEPTION 'Only eligible customer cancellation updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Direct customer updates to purchase requests are not allowed';
END;
$$;

DROP TRIGGER IF EXISTS protect_purchase_requests_customer_updates ON public.purchase_requests;
CREATE TRIGGER protect_purchase_requests_customer_updates
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_purchase_requests_customer_updates();

CREATE OR REPLACE FUNCTION public.hide_purchase_request_for_customer(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'hide_purchase_request', true);

  UPDATE public.purchase_requests
  SET customer_hidden_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or you do not have permission to hide it';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_transfer_proof_for_purchase_request(
  request_id uuid,
  proof_url text,
  proof_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  p_proof_url ALIAS FOR $2;
  p_proof_path ALIAS FOR $3;
  v_user_id uuid := auth.uid();
  v_storage_value text;
  v_file_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_storage_value := COALESCE(NULLIF(trim(p_proof_path), ''), NULLIF(trim(p_proof_url), ''));
  IF v_storage_value IS NULL THEN
    RAISE EXCEPTION 'Transfer proof path is required';
  END IF;

  v_file_name := NULLIF(regexp_replace(v_storage_value, '^.*/', ''), '');

  PERFORM set_config('app.lourex_rpc_action', 'submit_transfer_proof', true);

  -- "Awaiting payment" is represented by ready_for_conversion in the current schema.
  -- transfer_proof_rejected remains valid so customers can resubmit corrected proof.
  UPDATE public.purchase_requests
  SET
    transfer_proof_url = v_storage_value,
    transfer_proof_name = COALESCE(v_file_name, 'transfer-proof'),
    transfer_proof_uploaded_at = now(),
    transfer_proof_status = 'pending',
    transfer_rejection_reason = NULL,
    status = 'transfer_proof_pending',
    updated_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer'
    AND status IN ('ready_for_conversion', 'transfer_proof_rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer proof can only be uploaded for requests awaiting payment proof';
  END IF;
END;
$$;

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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_internal := public.is_lourex_internal(v_user_id);

  IF NOT v_is_internal THEN
    PERFORM set_config('app.lourex_rpc_action', 'cancel_purchase_request', true);
  END IF;

  UPDATE public.purchase_requests
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id
    AND status NOT IN ('completed', 'cancelled')
    AND (
      v_is_internal
      OR (
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

REVOKE ALL ON FUNCTION public.hide_purchase_request_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase_request(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hide_purchase_request_for_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can upload purchase request product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload purchase request product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload purchase request product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'purchase-requests'
);

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
      AND pr.status IN ('ready_for_conversion', 'transfer_proof_rejected')
  )
);

DROP POLICY IF EXISTS "Customers can read own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can read own transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can read transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.is_lourex_internal(auth.uid())
);
