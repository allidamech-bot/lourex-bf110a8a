-- =============================================
-- FIX 1: Factory Applications Status Injection
-- =============================================
-- Force status to 'pending' on INSERT to prevent self-approval
CREATE OR REPLACE FUNCTION public.enforce_pending_factory_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_pending_on_factory_app_insert
BEFORE INSERT ON public.factory_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_pending_factory_status();

-- =============================================
-- FIX 2: Messages Cross-Order Injection
-- =============================================
-- Drop the overly broad insert policy
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Create scoped policy: only order participants can send messages
CREATE POLICY "Order participants can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND order_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = messages.order_id
        AND orders.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.factories f ON o.factory_id = f.id
      WHERE o.id = messages.order_id
        AND f.owner_user_id = auth.uid()
    )
  )
);

-- =============================================
-- FIX 3: Staff Privilege Escalation (email → user_id)
-- =============================================
-- Add user_id column for identity-based access
ALTER TABLE public.organization_staff ADD COLUMN IF NOT EXISTS user_id uuid;

-- Update has_org_role to use user_id instead of email
CREATE OR REPLACE FUNCTION public.has_org_role(_owner_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_staff
    WHERE owner_id = _owner_id
      AND (
        user_id = auth.uid()
        OR (user_id IS NULL AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      )
      AND status = 'active'
      AND role = ANY(_roles)
  )
$$;

-- Update get_staff_owner_id similarly
CREATE OR REPLACE FUNCTION public.get_staff_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT owner_id
  FROM public.organization_staff
  WHERE (
    user_id = auth.uid()
    OR (user_id IS NULL AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  )
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- Update staff view own record policy
DROP POLICY IF EXISTS "Staff can view own record" ON public.organization_staff;
CREATE POLICY "Staff can view own record"
ON public.organization_staff
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND email = (SELECT (auth.jwt() ->> 'email'::text)))
);

-- =============================================
-- FIX 4: Audit Log Poisoning
-- =============================================
-- Remove direct insert access for regular users
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

-- Create audit triggers on critical tables
CREATE OR REPLACE TRIGGER audit_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_deals
AFTER INSERT OR UPDATE OR DELETE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_factories
AFTER INSERT OR UPDATE OR DELETE ON public.factories
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_rfqs
AFTER INSERT OR UPDATE OR DELETE ON public.rfqs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_kyc_documents
AFTER INSERT OR UPDATE OR DELETE ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();