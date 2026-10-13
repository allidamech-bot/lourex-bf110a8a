-- Applied and verified on LOUREX Supabase gxmqchznfolerliorpkz.
-- Prevent anonymous forgery of request attachment metadata. Preserve
-- authenticated customer-own-request images and internal operator workflows.
-- No data or Storage objects are deleted.
DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='attachments' AND policyname='Public purchase request attachments can be inserted')
 THEN RAISE EXCEPTION 'Expected legacy attachment policy absent; review current state'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='purchase_requests' AND policyname='Customers can view own purchase requests')
 THEN RAISE EXCEPTION 'Customer request read policy absent; abort'; END IF;
END $guard$;

DROP POLICY IF EXISTS "Public purchase request attachments can be inserted"
 ON public.attachments;

CREATE POLICY "Customers can insert own request product images"
 ON public.attachments FOR INSERT TO authenticated
 WITH CHECK (
   auth.uid() IS NOT NULL
   AND entity_type = 'purchase_request'
   AND category = 'product_image'
   AND visibility = 'internal'
   AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
   AND EXISTS (
     SELECT 1 FROM public.purchase_requests pr
     JOIN public.lourex_customers c ON c.id = pr.customer_id
     WHERE pr.id = attachments.entity_id
       AND c.auth_user_id = auth.uid()
   )
 );

CREATE POLICY "Customers can read own request product image metadata"
 ON public.attachments FOR SELECT TO authenticated
 USING (
   auth.uid() IS NOT NULL
   AND entity_type = 'purchase_request'
   AND category = 'product_image'
   AND EXISTS (
     SELECT 1 FROM public.purchase_requests pr
     JOIN public.lourex_customers c ON c.id = pr.customer_id
     WHERE pr.id = attachments.entity_id
       AND c.auth_user_id = auth.uid()
   )
 );

REVOKE INSERT ON public.attachments FROM anon;

DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='attachments' AND policyname='Public purchase request attachments can be inserted')
 THEN RAISE EXCEPTION 'Anonymous attachment insertion remains open'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='attachments' AND policyname='Customers can insert own request product images')
 THEN RAISE EXCEPTION 'Customer write permission missing'; END IF;
END $verify$;
