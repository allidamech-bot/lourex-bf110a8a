-- Harden write RLS policies so no effective INSERT/UPDATE/DELETE policy is unrestricted.

DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
CREATE POLICY "Public can submit validated inquiries"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 1 AND 200
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(COALESCE(phone, '')) <= 30
  AND length(COALESCE(company, '')) <= 200
  AND length(COALESCE(message, '')) <= 2000
  AND length(COALESCE(inquiry_type, 'general')) <= 50
  AND length(COALESCE(factory_name, '')) <= 200
);

DROP POLICY IF EXISTS "Anyone can submit factory applications" ON public.factory_applications;
DROP POLICY IF EXISTS "Authenticated users can submit own applications" ON public.factory_applications;
CREATE POLICY "Authenticated users can submit own applications"
ON public.factory_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(btrim(company_name)) > 0
  AND length(btrim(contact_name)) > 0
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(btrim(cr_number)) > 0
  AND length(btrim(tax_id)) > 0
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

DROP POLICY IF EXISTS "Anyone can submit purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can update own purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
)
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_is_owner boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  )
  INTO v_actor_is_owner;

  IF NOT v_actor_is_owner
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

DROP TRIGGER IF EXISTS prevent_profile_self_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_self_escalation();

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
