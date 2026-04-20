
-- 1. Fix factory_applications: require authenticated user with matching user_id
DROP POLICY IF EXISTS "Anyone can submit factory applications" ON public.factory_applications;
CREATE POLICY "Authenticated users can submit own applications"
ON public.factory_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. KYC storage: add admin DELETE policy
CREATE POLICY "Admins can delete KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admin UPDATE policy for KYC
CREATE POLICY "Admins can update KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Fix inspection media storage policies
DROP POLICY IF EXISTS "Factory owners upload scoped inspection media" ON storage.objects;
DROP POLICY IF EXISTS "Order participants read inspection media" ON storage.objects;

CREATE POLICY "Factory owners upload inspection media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Order participants read inspection media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-media'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.buyer_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
  )
);

-- 4. Fix reviews: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Authenticated users can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

-- 5. Add trigger to enforce reviews only for completed orders
CREATE OR REPLACE FUNCTION public.enforce_review_completed_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If deal_id is set, check it's completed
  IF NEW.deal_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deals
      WHERE id = NEW.deal_id AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Reviews can only be submitted for completed deals';
    END IF;
  END IF;
  
  -- Ensure one review per deal per user
  IF NEW.deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reviews
    WHERE deal_id = NEW.deal_id AND reviewer_id = NEW.reviewer_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this deal';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_review_completed_order
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.enforce_review_completed_order();
