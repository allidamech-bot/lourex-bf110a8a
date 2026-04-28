-- Phase 7C: add security audit logging and tighten storage ownership policies.

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view security audit events" ON public.security_audit_events;
CREATE POLICY "Owner and operations can view security audit events"
ON public.security_audit_events
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.security_audit_events FROM PUBLIC;
REVOKE ALL ON public.security_audit_events FROM anon;
REVOKE ALL ON public.security_audit_events FROM authenticated;
GRANT SELECT ON public.security_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.security_audit_events (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    auth.uid(),
    public.current_lourex_role(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) TO authenticated;

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

  PERFORM public.log_security_audit_event(
    'purchase_request_hidden_by_customer',
    'purchase_request',
    p_request_id,
    '{}'::jsonb
  );
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

  PERFORM public.log_security_audit_event(
    'transfer_proof_submitted',
    'purchase_request',
    p_request_id,
    jsonb_build_object(
      'proof_path', v_storage_value,
      'proof_file_name', COALESCE(v_file_name, 'transfer-proof')
    )
  );
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

  PERFORM public.log_security_audit_event(
    'purchase_request_cancelled',
    'purchase_request',
    p_request_id,
    jsonb_build_object(
      'reason', COALESCE(p_reason, ''),
      'is_internal', v_is_internal
    )
  );
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

-- Product request images are uploaded before a purchase request id always exists,
-- so this remains authenticated-only rather than ownership-scoped by request id.

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND (storage.foldername(name))[2] IS NOT NULL
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
  AND (storage.foldername(name))[2] IS NOT NULL
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
