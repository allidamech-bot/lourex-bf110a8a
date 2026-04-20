CREATE OR REPLACE FUNCTION public.get_staff_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id
  FROM public.organization_staff
  WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_owner_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_staff
    WHERE owner_id = _owner_id
      AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND status = 'active'
      AND role = ANY(_roles)
  )
$$;

CREATE POLICY "Factory team can view linked factories"
ON public.factories
FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_org_role(owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
);

CREATE POLICY "Factory team can update linked factories"
ON public.factories
FOR UPDATE
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_org_role(owner_user_id, ARRAY['admin','manager'])
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR public.has_org_role(owner_user_id, ARRAY['admin','manager'])
);

CREATE POLICY "Factory team can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = products.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
  )
);

CREATE POLICY "Factory team can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = products.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager'])
  )
);

CREATE POLICY "Factory team can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = products.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = products.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager'])
  )
);

CREATE POLICY "Factory team can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = products.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager'])
  )
);

CREATE POLICY "Factory team can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = orders.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
  )
);

CREATE POLICY "Factory team can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = orders.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','logistics'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.factories f
    WHERE f.id = orders.factory_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','logistics'])
  )
);

CREATE POLICY "Factory team can view inspection media"
ON public.inspection_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = inspection_media.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
  )
);

CREATE POLICY "Factory team can upload inspection media"
ON public.inspection_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = inspection_media.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','logistics'])
  )
);

CREATE POLICY "Factory team can view order documents"
ON public.order_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = order_documents.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
  )
);

CREATE POLICY "Factory team can upload order documents"
ON public.order_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = order_documents.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','logistics'])
  )
);

CREATE POLICY "Factory team can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = messages.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics','viewer'])
  )
);

CREATE POLICY "Factory team can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = messages.order_id
      AND public.has_org_role(f.owner_user_id, ARRAY['admin','manager','support','logistics'])
  )
);