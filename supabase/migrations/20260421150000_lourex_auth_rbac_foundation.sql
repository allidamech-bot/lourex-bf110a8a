ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS partner_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles p
SET email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

UPDATE public.profiles p
SET role = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = 'admin'::public.app_role
  ) THEN 'owner'
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = 'broker'::public.app_role
  ) THEN 'operations_employee'
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role IN ('factory'::public.app_role, 'manufacturer'::public.app_role, 'seller'::public.app_role)
  ) THEN 'turkish_partner'
  ELSE 'customer'
END
WHERE role IS NULL
   OR role = 'customer'
   OR role IN ('admin', 'moderator', 'user', 'buyer', 'factory', 'broker', 'seller', 'manufacturer');

UPDATE public.profiles
SET partner_type = CASE
  WHEN role = 'turkish_partner' THEN 'turkey'
  WHEN role = 'saudi_partner' THEN 'saudi'
  ELSE NULL
END
WHERE partner_type IS NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'turkish_partner', 'saudi_partner', 'operations_employee', 'customer'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN ('turkey', 'saudi'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    partner_type,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'customer',
    NULL,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role = ANY (_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_lourex_role(auth.uid(), ARRAY['owner']) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'You cannot change restricted profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Lourex users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
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

DROP POLICY IF EXISTS "Admins can view Lourex customers" ON public.lourex_customers;
DROP POLICY IF EXISTS "Admins can manage Lourex customers" ON public.lourex_customers;

CREATE POLICY "Internal Lourex roles can view customers"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can manage customers"
ON public.lourex_customers
FOR ALL
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Admins can view purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Admins can update purchase requests" ON public.purchase_requests;

CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Admins can view financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can insert financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can update unlocked financial entries" ON public.financial_entries;

CREATE POLICY "Owner and operations can view financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can insert financial entries"
ON public.financial_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update unlocked financial entries"
ON public.financial_entries
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) AND NOT locked)
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) AND NOT locked);

DROP POLICY IF EXISTS "Admins can view financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can update financial edit requests" ON public.financial_edit_requests;

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

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Internal Lourex roles can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner'])
  AND changed_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;

CREATE POLICY "Internal Lourex roles can view shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can insert shipments"
ON public.shipments
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can update shipments"
ON public.shipments
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner can delete shipments"
ON public.shipments
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

CREATE POLICY "Internal Lourex roles can view deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);
