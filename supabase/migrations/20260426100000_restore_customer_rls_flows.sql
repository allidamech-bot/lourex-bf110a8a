-- Restore authenticated customer RLS flows after write-policy hardening.
-- Keep writes ownership/role scoped and keep helper functions out of profile RLS recursion.

CREATE OR REPLACE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role = ANY (_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_lourex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_lourex_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT auth.uid() = p_profile_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
    )
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_requests
    WHERE id = p_request_id
      AND customer_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lourex_internal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_lourex_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_lourex_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_can_access_purchase_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND NOT public.is_lourex_role(auth.uid(), ARRAY['owner'])
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    )
  THEN
    RAISE EXCEPTION 'Only active owners can change profile access fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Lourex users can read allowed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Lourex users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Internal users can view operational profiles" ON public.profiles;
CREATE POLICY "Lourex users can read allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_read_lourex_profile(id));

DROP POLICY IF EXISTS "Lourex users can insert own customer profile" ON public.profiles;
CREATE POLICY "Lourex users can insert own customer profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'customer'
  AND status = 'active'
);

DROP POLICY IF EXISTS "Lourex users can update own safe profile fields" ON public.profiles;
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

DROP POLICY IF EXISTS "Internal Lourex roles can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Customers can view own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can view own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DROP POLICY IF EXISTS "Internal Lourex roles can insert purchase requests" ON public.purchase_requests;
CREATE POLICY "Internal Lourex roles can insert purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Customers can insert own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DROP POLICY IF EXISTS "Owner and operations can update purchase requests" ON public.purchase_requests;
CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can update own purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
)
WITH CHECK (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        lower(btrim(COALESCE(qual, ''))) = 'true'
        OR lower(btrim(COALESCE(with_check, ''))) = 'true'
      )
  LOOP
    RAISE EXCEPTION 'Unsafe write RLS policy remains: %.% policy "%" command %',
      v_policy.schemaname,
      v_policy.tablename,
      v_policy.policyname,
      v_policy.cmd;
  END LOOP;
END $$;
