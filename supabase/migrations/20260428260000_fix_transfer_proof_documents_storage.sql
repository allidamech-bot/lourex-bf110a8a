-- Ensure private transfer proof storage exists and is scoped to the owning customer request.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'customer-portal'
  AND (storage.foldername(name))[2] = 'requests'
  AND (storage.foldername(name))[3] IS NOT NULL
  AND (storage.foldername(name))[4] = 'transfer-proof'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[3]
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
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[3] IS NOT NULL
      AND (storage.foldername(name))[4] = 'transfer-proof'
      AND EXISTS (
        SELECT 1
        FROM public.purchase_requests pr
        WHERE pr.id::text = (storage.foldername(name))[3]
          AND pr.customer_id = auth.uid()
      )
    )
    OR (
      (storage.foldername(name))[1] = 'transfer-proofs'
      AND (storage.foldername(name))[2] IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.purchase_requests pr
        WHERE pr.id::text = (storage.foldername(name))[2]
          AND pr.customer_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can read transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
);

DROP POLICY IF EXISTS "Internal users can manage transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can manage transfer proofs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
);
