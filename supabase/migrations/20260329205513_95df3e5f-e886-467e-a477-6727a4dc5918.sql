
-- Fix inspection-media storage: tighten policies on storage.objects
-- Drop existing overly permissive policies for inspection-media
DROP POLICY IF EXISTS "Authenticated read inspection media" ON storage.objects;
DROP POLICY IF EXISTS "Factory owners upload inspection media" ON storage.objects;

-- Scoped READ: only order participants + admins
CREATE POLICY "Order participants read inspection media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspection-media' AND
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN factories f ON o.factory_id = f.id
      WHERE (storage.foldername(name))[1] = o.id::text
      AND (o.buyer_id = auth.uid() OR f.owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Scoped INSERT: only factory owners for their orders + admins
CREATE POLICY "Factory owners upload scoped inspection media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-media' AND
    EXISTS (
      SELECT 1 FROM orders o
      JOIN factories f ON o.factory_id = f.id
      WHERE (storage.foldername(name))[1] = o.id::text
      AND (f.owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );
