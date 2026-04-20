-- Allow factory owners to delete their own product images
CREATE POLICY "Factory owners can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Prevent duplicate reviews per reviewer per factory
ALTER TABLE public.reviews
  ADD CONSTRAINT unique_reviewer_factory UNIQUE (reviewer_id, factory_id);
