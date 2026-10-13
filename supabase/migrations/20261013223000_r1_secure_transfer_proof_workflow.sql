-- R1 secure, additive transfer-proof workflow on standalone LOUREX Supabase.
-- Avoid replaying legacy migrations whose customer checks trust contact emails.
-- Customer relationship = lourex_customers.auth_user_id, never email or auth.uid=customer PK.
DO $preflight$
BEGIN
 IF to_regclass('public.purchase_requests') IS NULL
   OR to_regclass('public.lourex_customers') IS NULL
   OR to_regclass('storage.objects') IS NULL
   OR to_regclass('storage.buckets') IS NULL
   OR to_regprocedure('public.is_lourex_role(uuid,text[])') IS NULL
   OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='transfer-proofs' AND public=false)
 THEN
   RAISE EXCEPTION 'Private transfer proof workflow prerequisites missing';
 END IF;
END
$preflight$;

ALTER TABLE public.purchase_requests
 ADD COLUMN IF NOT EXISTS transfer_proof_url text,
 ADD COLUMN IF NOT EXISTS transfer_proof_name text,
 ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at timestamptz,
 ADD COLUMN IF NOT EXISTS transfer_proof_status text,
 ADD COLUMN IF NOT EXISTS transfer_accepted_at timestamptz,
 ADD COLUMN IF NOT EXISTS transfer_accepted_by uuid REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS transfer_rejection_reason text;

ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_transfer_proof_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_transfer_proof_status_check
  CHECK (transfer_proof_status IS NULL OR transfer_proof_status IN ('pending','accepted','rejected'))
  NOT VALID;
ALTER TABLE public.purchase_requests VALIDATE CONSTRAINT purchase_requests_transfer_proof_status_check;

-- Preserve all existing statuses and add only those consumed by present UI flows.
ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_status_check
  CHECK (status IN (
    'intake_submitted','under_review','awaiting_clarification',
    'ready_for_conversion','converted_to_deal','cancelled',
    'transfer_uploaded','transfer_proof_pending','transfer_proof_rejected','in_progress'
  )) NOT VALID;
ALTER TABLE public.purchase_requests VALIDATE CONSTRAINT purchase_requests_status_check;

CREATE TABLE IF NOT EXISTS public.transfer_proofs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
 deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
 customer_id uuid NOT NULL REFERENCES public.lourex_customers(id) ON DELETE RESTRICT,
 uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 file_path text NOT NULL,
 file_name text NOT NULL,
 file_type text NOT NULL DEFAULT '',
 file_size bigint NOT NULL DEFAULT 0,
 storage_bucket text NOT NULL DEFAULT 'transfer-proofs',
 status text NOT NULL DEFAULT 'pending_review',
 reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 reviewed_at timestamptz,
 rejection_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT transfer_proofs_status_check CHECK(status IN ('pending_review','approved','rejected')),
 CONSTRAINT transfer_proofs_storage_bucket_check CHECK(storage_bucket='transfer-proofs')
);
CREATE UNIQUE INDEX IF NOT EXISTS r1_one_pending_transfer_proof_per_request
 ON public.transfer_proofs (request_id) WHERE status='pending_review';
CREATE INDEX IF NOT EXISTS r1_transfer_proofs_request_idx ON public.transfer_proofs(request_id);

ALTER TABLE public.transfer_proofs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.transfer_proofs TO authenticated;
REVOKE INSERT, DELETE ON public.transfer_proofs FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "R1 customer or internal can read transfer proofs" ON public.transfer_proofs;
CREATE POLICY "R1 customer or internal can read transfer proofs"
 ON public.transfer_proofs FOR SELECT TO authenticated
 USING (
  public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee'])
  OR EXISTS (
   SELECT 1 FROM public.lourex_customers c
   WHERE c.id=transfer_proofs.customer_id
     AND c.auth_user_id=auth.uid()
     AND public.is_lourex_role(auth.uid(),ARRAY['customer'])
  )
 );

DROP POLICY IF EXISTS "R1 only staff can review transfer proofs" ON public.transfer_proofs;
CREATE POLICY "R1 only staff can review transfer proofs"
 ON public.transfer_proofs FOR UPDATE TO authenticated
 USING (public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee']))
 WITH CHECK (public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee']));

CREATE OR REPLACE FUNCTION public.submit_transfer_proof_for_purchase_request(
 request_id uuid,
 proof_url text,
 proof_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
SET row_security='off'
AS $function$
DECLARE
 v_actor uuid := auth.uid();
 v_request public.purchase_requests%rowtype;
 v_customer uuid;
 v_path text := NULLIF(btrim(COALESCE(proof_path, proof_url,'')), '');
 v_uploaded_by text;
BEGIN
 IF v_actor IS NULL THEN
  RAISE EXCEPTION 'AUTH_REQUIRED: sign in to upload transfer proof' USING ERRCODE='42501';
 END IF;
 IF NOT public.is_lourex_role(v_actor, ARRAY['owner','operations_employee','customer']) THEN
  RAISE EXCEPTION 'NOT_AUTHORIZED: role cannot upload transfer proof' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_request FROM public.purchase_requests
 WHERE id=request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND: no matching purchase request' USING ERRCODE='P0002'; END IF;
 IF v_request.status NOT IN ('ready_for_conversion','transfer_uploaded','transfer_proof_rejected') THEN
  RAISE EXCEPTION 'INVALID_STATUS: request is not accepting payment proof' USING ERRCODE='23514';
 END IF;

 SELECT c.id INTO v_customer
 FROM public.lourex_customers c WHERE c.id=v_request.customer_id;
 IF v_customer IS NULL THEN
  RAISE EXCEPTION 'CUSTOMER_NOT_LINKED: request has no valid customer row' USING ERRCODE='42501';
 END IF;
 IF NOT public.is_lourex_role(v_actor, ARRAY['owner','operations_employee'])
    AND NOT EXISTS (
      SELECT 1 FROM public.lourex_customers c
      WHERE c.id=v_request.customer_id AND c.auth_user_id=v_actor
    ) THEN
  RAISE EXCEPTION 'NOT_OWNER: customer record does not belong to current account' USING ERRCODE='42501';
 END IF;

 -- A supplied path must be inside the exact immutable request-scoped directory.
 IF v_path IS NULL OR
    v_path NOT LIKE ('customer-portal/requests/'||request_id::text||'/transfer-proof/%')
    OR split_part(v_path,'/',6) <> ''
    OR split_part(v_path,'/',5) = ''
    OR (proof_url IS NOT NULL AND btrim(proof_url)<>v_path)
 THEN
  RAISE EXCEPTION 'INVALID_PROOF_PATH: proof path is outside the request folder' USING ERRCODE='22023';
 END IF;

 -- Verify the Supabase Storage API already accepted an actual authenticated upload.
 SELECT o.owner_id INTO v_uploaded_by FROM storage.objects o
 WHERE o.bucket_id='transfer-proofs' AND o.name=v_path LIMIT 1;
 IF v_uploaded_by IS DISTINCT FROM v_actor::text THEN
  RAISE EXCEPTION 'PROOF_OBJECT_MISSING_OR_UNOWNED: upload the file before submitting' USING ERRCODE='42501';
 END IF;

 INSERT INTO public.transfer_proofs (
  request_id,deal_id,customer_id,uploaded_by,file_path,file_name,
  status,storage_bucket
 ) VALUES (
  request_id,v_request.converted_deal_id,v_customer,v_actor,v_path,
  split_part(v_path,'/',5),'pending_review','transfer-proofs'
 );

 UPDATE public.purchase_requests
 SET transfer_proof_url=v_path,
     transfer_proof_name=split_part(v_path,'/',5),
     transfer_proof_uploaded_at=now(),
     transfer_proof_status='pending',
     transfer_rejection_reason=NULL,
     status='transfer_proof_pending',
     updated_at=now()
 WHERE id=request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid,text,text)
 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid,text,text)
 TO authenticated;
