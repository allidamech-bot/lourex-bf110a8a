-- ============================================================
-- Priority 1: Stricter public product visibility
-- Only products that are active AND approved AND owned by a
-- verified factory may be visible to anonymous/public viewers.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view active approved products" ON public.products;

CREATE POLICY "Public can view verified active approved products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.factories f
    WHERE f.id = products.factory_id
      AND f.is_verified = true
  )
);

-- ============================================================
-- Priority 4: Duplication-safe approval
-- Prevent multiple factories owned by the same user (one factory
-- per supplier account at this stage).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS factories_owner_user_id_unique
  ON public.factories (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- Prevent duplicate user/role assignments.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_unique
  ON public.user_roles (user_id, role);

-- ============================================================
-- Idempotent admin approval function
-- Safe to invoke multiple times: creates factory + role only if
-- missing, then marks the application as approved.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_approve_factory_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.factory_applications%ROWTYPE;
  v_factory_id uuid;
BEGIN
  -- Only admins may run this.
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO v_app
  FROM public.factory_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.user_id IS NULL THEN
    RAISE EXCEPTION 'Application has no linked user';
  END IF;

  -- Already approved? Make this a no-op so the call is safe to retry.
  IF v_app.status = 'approved' THEN
    RETURN;
  END IF;

  -- Ensure factory exists (one per user_id).
  SELECT id INTO v_factory_id
  FROM public.factories
  WHERE owner_user_id = v_app.user_id
  LIMIT 1;

  IF v_factory_id IS NULL THEN
    INSERT INTO public.factories (name, location, category, owner_user_id, is_verified)
    VALUES (v_app.company_name, v_app.location, '', v_app.user_id, false)
    RETURNING id INTO v_factory_id;
  END IF;

  -- Ensure role exists (idempotent thanks to unique index).
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_app.user_id, 'factory'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark the application approved.
  UPDATE public.factory_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_application_id;

  -- Audit
  INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES (
    'factory_applications',
    p_application_id::text,
    'application_approved',
    jsonb_build_object('status', 'approved', 'company', v_app.company_name, 'factory_id', v_factory_id),
    auth.uid()
  );
END;
$$;