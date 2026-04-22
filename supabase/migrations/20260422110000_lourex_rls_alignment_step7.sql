CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'operations_employee', 'saudi_partner')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_lourex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_requests
    WHERE id = p_request_id
      AND customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_deal(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals
    WHERE id = p_deal_id
      AND customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_shipment(p_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.deals d ON d.id = s.deal_id
    WHERE s.id = p_shipment_id
      AND d.customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_tracking_update(p_tracking_update_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tracking_updates tu
    JOIN public.shipments s ON s.id = tu.shipment_id
    JOIN public.deals d ON d.id = s.deal_id
    WHERE tu.id = p_tracking_update_id
      AND tu.visibility = 'customer_visible'
      AND d.customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_financial_entry(p_financial_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_entries fe
    LEFT JOIN public.deals d ON d.id = fe.deal_id
    WHERE fe.id = p_financial_entry_id
      AND (
        fe.customer_id = auth.uid()
        OR d.customer_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_attachment(p_attachment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attachments a
    LEFT JOIN public.purchase_requests pr
      ON a.entity_type = 'purchase_request'
     AND pr.id = a.entity_id
    LEFT JOIN public.deals d
      ON a.entity_type = 'deal'
     AND d.id = a.entity_id
    WHERE a.id = p_attachment_id
      AND a.visibility = 'customer_visible'
      AND (
        pr.customer_id = auth.uid()
        OR d.customer_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_lourex_customer_record(
  p_customer_user_id uuid,
  p_email text,
  p_full_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_country text DEFAULT '',
  p_city text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_duplicate public.lourex_customers%ROWTYPE;
BEGIN
  IF p_customer_user_id IS NULL THEN
    RAISE EXCEPTION 'Customer user id is required';
  END IF;

  IF COALESCE(btrim(p_email), '') = '' THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  SELECT id
  INTO v_existing_id
  FROM public.lourex_customers
  WHERE id = p_customer_user_id
  LIMIT 1;

  SELECT *
  INTO v_duplicate
  FROM public.lourex_customers
  WHERE lower(email) = lower(p_email)
    AND id <> p_customer_user_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.lourex_customers (
      id,
      full_name,
      phone,
      email,
      country,
      city
    )
    VALUES (
      p_customer_user_id,
      COALESCE(NULLIF(p_full_name, ''), v_duplicate.full_name, ''),
      COALESCE(NULLIF(p_phone, ''), v_duplicate.phone, ''),
      CASE
        WHEN v_duplicate.id IS NOT NULL THEN format('__migrating__%s', p_customer_user_id)
        ELSE p_email
      END,
      COALESCE(NULLIF(p_country, ''), v_duplicate.country, ''),
      COALESCE(NULLIF(p_city, ''), v_duplicate.city, '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      updated_at = now();
  ELSE
    UPDATE public.lourex_customers
    SET
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
      phone = COALESCE(p_phone, ''),
      email = p_email,
      country = COALESCE(p_country, ''),
      city = COALESCE(p_city, ''),
      updated_at = now()
    WHERE id = p_customer_user_id;
  END IF;

  IF v_duplicate.id IS NOT NULL THEN
    UPDATE public.purchase_requests
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.deals
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.financial_entries
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.financial_edit_requests
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    DELETE FROM public.lourex_customers
    WHERE id = v_duplicate.id;
  END IF;

  UPDATE public.lourex_customers
  SET
    email = p_email,
    full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
    phone = COALESCE(NULLIF(p_phone, ''), phone),
    country = COALESCE(NULLIF(p_country, ''), country),
    city = COALESCE(NULLIF(p_city, ''), city),
    updated_at = now()
  WHERE id = p_customer_user_id;

  RETURN p_customer_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.upsert_current_customer_record(
  p_full_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_country text DEFAULT '',
  p_city text DEFAULT ''
)
RETURNS TABLE (customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.current_lourex_role() IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Only customers can upsert their customer record';
  END IF;

  RETURN QUERY
  SELECT public.upsert_lourex_customer_record(
    auth.uid(),
    p_email,
    p_full_name,
    p_phone,
    p_country,
    p_city
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_current_customer_record(text, text, text, text, text) TO authenticated;

UPDATE public.purchase_requests pr
SET customer_id = p.id
FROM public.profiles p
WHERE p.role = 'customer'
  AND p.status = 'active'
  AND COALESCE(pr.customer_id::text, '') = ''
  AND COALESCE(pr.email, '') <> ''
  AND lower(pr.email) = lower(p.email);

UPDATE public.deals d
SET customer_id = pr.customer_id
FROM public.purchase_requests pr
WHERE d.customer_id IS NULL
  AND d.source_request_id = pr.id
  AND pr.customer_id IS NOT NULL;

UPDATE public.financial_entries fe
SET customer_id = d.customer_id
FROM public.deals d
WHERE fe.customer_id IS NULL
  AND fe.deal_id = d.id
  AND d.customer_id IS NOT NULL;

UPDATE public.financial_edit_requests fer
SET customer_id = COALESCE(fer.customer_id, fe.customer_id, d.customer_id)
FROM public.financial_entries fe
LEFT JOIN public.deals d ON d.id = fe.deal_id
WHERE fer.financial_entry_id = fe.id
  AND COALESCE(fer.customer_id, fe.customer_id, d.customer_id) IS NOT NULL;

DO $$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN
    SELECT id, email, full_name
    FROM public.profiles
    WHERE role = 'customer'
      AND status = 'active'
      AND COALESCE(email, '') <> ''
  LOOP
    PERFORM public.upsert_lourex_customer_record(
      v_profile.id,
      v_profile.email,
      COALESCE(v_profile.full_name, ''),
      '',
      '',
      ''
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.lookup_lourex_tracking(p_tracking_id text)
RETURNS TABLE (
  tracking_id text,
  destination text,
  client_name text,
  current_stage_code text,
  customer_note text,
  last_updated timestamptz,
  deal_number text,
  request_number text,
  operation_title text,
  timeline jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.tracking_id,
    s.destination,
    s.client_name,
    COALESCE(s.current_stage_code, 'deal_accepted') AS current_stage_code,
    COALESCE(
      NULLIF(s.customer_visible_note, ''),
      (
        SELECT tu.customer_note
        FROM public.tracking_updates tu
        WHERE tu.shipment_id = s.id
          AND tu.visibility = 'customer_visible'
        ORDER BY COALESCE(tu.occurred_at, tu.created_at) DESC, tu.created_at DESC
        LIMIT 1
      ),
      ''
    ) AS customer_note,
    s.updated_at AS last_updated,
    d.deal_number,
    pr.request_number,
    COALESCE(NULLIF(d.operation_title, ''), NULLIF(pr.product_name, ''), 'عملية Lourex') AS operation_title,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', tu.id,
            'shipmentId', tu.shipment_id,
            'dealId', tu.deal_id,
            'stageCode', tu.stage_code,
            'previousStageCode', tu.previous_stage_code,
            'note', tu.note,
            'customerNote', tu.customer_note,
            'visibility', tu.visibility,
            'updatedBy', tu.updated_by,
            'updatedByRole', tu.updated_by_role,
            'occurredAt', COALESCE(tu.occurred_at, tu.created_at),
            'createdAt', tu.created_at
          )
          ORDER BY COALESCE(tu.occurred_at, tu.created_at), tu.created_at
        )
        FROM public.tracking_updates tu
        WHERE tu.shipment_id = s.id
          AND tu.visibility = 'customer_visible'
      ),
      '[]'::jsonb
    ) AS timeline
  FROM public.shipments s
  LEFT JOIN public.deals d ON d.id = s.deal_id
  LEFT JOIN public.purchase_requests pr ON pr.id = d.source_request_id
  WHERE upper(s.tracking_id) = upper(p_tracking_id)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_lourex_tracking(text) TO anon, authenticated;

DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles',
    'purchase_requests',
    'lourex_customers',
    'deals',
    'shipments',
    'tracking_updates',
    'financial_entries',
    'financial_edit_requests',
    'attachments',
    'audit_logs',
    'notifications'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_table);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lourex_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lourex users can read allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_internal(auth.uid())
);

CREATE POLICY "Lourex users can insert own customer profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'customer'
  AND status = 'active'
);

CREATE POLICY "Lourex users can update own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
)
WITH CHECK (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);

CREATE POLICY "Internal Lourex roles can view customers"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer record"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Owner and operations can manage customers"
ON public.lourex_customers
FOR ALL
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Internal Lourex roles can insert purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Owner and operations can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can view shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_shipment(id)
);

CREATE POLICY "Internal Lourex roles can insert shipments"
ON public.shipments
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can update shipments"
ON public.shipments
FOR UPDATE
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Owner can delete shipments"
ON public.shipments
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

CREATE POLICY "Internal Lourex roles can view tracking updates"
ON public.tracking_updates
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer-visible tracking updates"
ON public.tracking_updates
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_tracking_update(id)
);

CREATE POLICY "Owner and operations can insert tracking updates"
ON public.tracking_updates
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Saudi partner can insert destination tracking updates"
ON public.tracking_updates
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'saudi_partner'
  AND public.lourex_stage_order(stage_code) BETWEEN 7 AND 11
);

CREATE POLICY "Owner and operations can update tracking updates"
ON public.tracking_updates
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can view financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Customers can view own financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_financial_entry(id)
);

CREATE POLICY "Owner and operations can insert financial entries"
ON public.financial_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update unlocked financial entries"
ON public.financial_entries
FOR UPDATE
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  AND NOT locked
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  AND NOT locked
);

CREATE POLICY "Owner and operations can view financial edit requests"
ON public.financial_edit_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can insert financial edit requests"
ON public.financial_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update financial edit requests"
ON public.financial_edit_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer-visible attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_attachment(id)
);

CREATE POLICY "Internal Lourex roles can manage attachments"
ON public.attachments
FOR ALL
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can insert own purchase request attachments"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND entity_type = 'purchase_request'
  AND public.customer_can_access_purchase_request(entity_id)
);

CREATE POLICY "Internal Lourex roles can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_internal(auth.uid())
  AND changed_by = auth.uid()
);

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Internal Lourex users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_internal(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles recipient
    WHERE recipient.id = notifications.user_id
  )
);
