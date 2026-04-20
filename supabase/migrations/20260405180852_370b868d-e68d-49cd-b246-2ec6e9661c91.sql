
-- Drop existing mismatched policies
DROP POLICY IF EXISTS "Factory owners upload inspection media" ON storage.objects;
DROP POLICY IF EXISTS "Order participants read inspection media" ON storage.objects;

-- Recreate INSERT: factory owners upload under their user ID folder
CREATE POLICY "Factory owners upload inspection media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Recreate SELECT: owner can read own uploads, buyers can read media from their order's factory owner, admins can read all
CREATE POLICY "Inspection media read access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.factories f ON o.factory_id = f.id
      WHERE o.buyer_id = auth.uid()
        AND (f.owner_user_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- UPDATE: only the uploader (folder owner) or admin
CREATE POLICY "Inspection media update access"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'inspection-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- DELETE: only the uploader (folder owner) or admin
CREATE POLICY "Inspection media delete access"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'inspection-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);
