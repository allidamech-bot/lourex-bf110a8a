-- R1: storage policies also require partner isolation. RLS on public
-- metadata tables does not protect private Storage objects on its own.
--
-- Legacy documents/transfer-proof policies granted all "internal" roles,
-- including partners, read AND FOR ALL access to other customers' receipts.
DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
DROP POLICY IF EXISTS "Internal users can manage transfer proofs" ON storage.objects;

-- Only owner/operations can inspect old DOCUMENTS-bucket transfer receipts.
-- Customers continue to use the existing own-request policy. Current
-- transfer-proofs bucket uses its separate owner/customer scoped policy.
DROP POLICY IF EXISTS "Lourex R1 owner ops read legacy transfer proofs" ON storage.objects;
CREATE POLICY "Lourex R1 owner ops read legacy transfer proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
);

-- The early product-images/deal-attachments policies also allowed all
-- partners to insert/update/delete objects in ANY deal folder. Until
-- deal_number -> deal_id folder ownership is guaranteed by the schema,
-- direct broad partner mutation is denied here. The authorized RPC / metadata
-- attachment workflows must be tested separately on staging.
DROP POLICY IF EXISTS "Internal deal attachments can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Internal deal attachments can be updated" ON storage.objects;
DROP POLICY IF EXISTS "Internal deal attachments can be deleted" ON storage.objects;

DROP POLICY IF EXISTS "Lourex R1 owner ops manage legacy deal objects" ON storage.objects;
CREATE POLICY "Lourex R1 owner ops manage legacy deal objects"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'deal-attachments'
  AND public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'deal-attachments'
  AND public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
);

-- IMPORTANT: If product-images is a PUBLIC bucket, object read access is
-- controlled by public URLs, not merely SELECT RLS. Staging must check the
-- bucket exposure and migrate sensitive deal artifacts to private storage.
-- This migration does not relabel old public objects or delete evidence.
