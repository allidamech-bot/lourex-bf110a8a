-- R1: standalone Supabase private commercial document Storage.
-- Safe for the connected LOUREX schema: does not move, delete or overwrite objects.
-- Keep product-images public for established public purchase-request product images.
DO $preflight$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR to_regclass('public.deals') IS NULL
     OR to_regclass('public.purchase_requests') IS NULL
     OR to_regclass('public.lourex_customers') IS NULL
     OR to_regprocedure('public.is_lourex_role(uuid,text[])') IS NULL
     OR to_regprocedure('public.lourex_r1_is_assigned_deal(uuid)') IS NULL
  THEN
    RAISE EXCEPTION 'Missing LOUREX private-storage prerequisites';
  END IF;

  -- Never silently make an existing live bucket private (old links would break).
  IF EXISTS (SELECT 1 FROM storage.buckets
             WHERE id IN ('documents', 'transfer-proofs') AND public IS DISTINCT FROM false)
  THEN
    RAISE EXCEPTION 'Existing document bucket is public: manual migration required';
  END IF;
END;
$preflight$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
('documents','documents',false,8388608,ARRAY[
  'application/pdf','image/jpeg','image/png','image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel','text/plain','text/csv'
]),
('transfer-proofs','transfer-proofs',false,8388608,ARRAY[
  'application/pdf','image/jpeg','image/png','image/webp'
])
ON CONFLICT (id) DO NOTHING;

-- Storage uses deal-attachments/<deal-number>/<file-name>.
-- A partner sees only documents of deals explicitly assigned to that partner.
CREATE OR REPLACE FUNCTION public.lourex_r1_private_deal_document_access(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $function$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND split_part(p_path,'/',1) = 'deal-attachments'
    AND split_part(p_path,'/',2) <> ''
    AND split_part(p_path,'/',3) <> ''
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.deal_number = split_part(p_path,'/',2)
        AND (
          public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee'])
          OR public.lourex_r1_is_assigned_deal(d.id)
        )
    ), false);
$function$;

-- Storage uses customer-portal/requests/<request UUID>/transfer-proof/<file>.
-- Request contact email is NEVER an ownership credential.
CREATE OR REPLACE FUNCTION public.lourex_r1_private_transfer_proof_access(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $function$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND split_part(p_path,'/',1) = 'customer-portal'
    AND split_part(p_path,'/',2) = 'requests'
    AND split_part(p_path,'/',4) = 'transfer-proof'
    AND split_part(p_path,'/',5) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.purchase_requests pr
      LEFT JOIN public.lourex_customers c ON c.id=pr.customer_id
      WHERE pr.id = CASE
        WHEN split_part(p_path,'/',3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(p_path,'/',3)::uuid ELSE NULL::uuid END
        AND (
          public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee'])
          OR (
            public.is_lourex_role(auth.uid(),ARRAY['customer'])
            AND c.auth_user_id = auth.uid()
          )
        )
    ),false);
$function$;

REVOKE ALL ON FUNCTION public.lourex_r1_private_deal_document_access(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_private_transfer_proof_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_r1_private_deal_document_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_private_transfer_proof_access(text) TO authenticated;

DROP POLICY IF EXISTS "LOUREX R1 documents read" ON storage.objects;
CREATE POLICY "LOUREX R1 documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='documents' AND public.lourex_r1_private_deal_document_access(name));

DROP POLICY IF EXISTS "LOUREX R1 documents upload" ON storage.objects;
CREATE POLICY "LOUREX R1 documents upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='documents' AND public.lourex_r1_private_deal_document_access(name));

DROP POLICY IF EXISTS "LOUREX R1 documents staff delete" ON storage.objects;
CREATE POLICY "LOUREX R1 documents staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id='documents'
    AND public.is_lourex_role(auth.uid(),ARRAY['owner','operations_employee'])
    AND public.lourex_r1_private_deal_document_access(name));

DROP POLICY IF EXISTS "LOUREX R1 proof read" ON storage.objects;
CREATE POLICY "LOUREX R1 proof read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='transfer-proofs' AND public.lourex_r1_private_transfer_proof_access(name));

DROP POLICY IF EXISTS "LOUREX R1 proof upload" ON storage.objects;
CREATE POLICY "LOUREX R1 proof upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='transfer-proofs' AND public.lourex_r1_private_transfer_proof_access(name));

-- Deliberately NO authenticated UPDATE or DELETE policy for transfer proofs:
-- uploaded financial evidence is immutable via the client.
-- Retire legacy upload policies that encouraged private deal evidence in
-- the PUBLIC product-images bucket. Public purchase request image flow remains.
DROP POLICY IF EXISTS "Internal deal attachments can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Internal deal attachments can be updated" ON storage.objects;
DROP POLICY IF EXISTS "Internal deal attachments can be deleted" ON storage.objects;
