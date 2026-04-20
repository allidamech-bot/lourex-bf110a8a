
-- 1. DEALS: Remove broad participant update policy (use update_deal_safe RPC instead)
DROP POLICY IF EXISTS "Deal participants can update status and notes" ON public.deals;

-- 2. FACTORY APPLICATIONS: Add user_id column and fix RLS
ALTER TABLE public.factory_applications ADD COLUMN IF NOT EXISTS user_id uuid;

DROP POLICY IF EXISTS "Applicants can view own application" ON public.factory_applications;
CREATE POLICY "Applicants can view own application" ON public.factory_applications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. REVIEWS: Require verification
DROP POLICY IF EXISTS "Authenticated can create reviews" ON public.reviews;
CREATE POLICY "Verified users can create reviews" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid() AND is_verified_user());

-- 4. NOTIFICATIONS: Remove user self-insert, restrict to admins/system
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Only admins can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. ORG ROLE FUNCTIONS: Remove email-fallback to prevent privilege escalation
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
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_staff_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id
  FROM public.organization_staff
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- Auto-link staff records when user_id matches email on login
CREATE OR REPLACE FUNCTION public.link_staff_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organization_staff
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;
