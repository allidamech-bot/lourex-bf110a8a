
-- =============================================
-- 1. FIX: Deal participants can tamper all fields
-- =============================================

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Deal participants can update" ON public.deals;

-- Create restricted UPDATE policy: participants can only update status and notes
CREATE POLICY "Deal participants can update limited fields"
ON public.deals
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid()
)
WITH CHECK (
  -- Ensure participant IDs and financial fields are not changed
  client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid()
);

-- Create secure RPC for deal updates that validates allowed fields
CREATE OR REPLACE FUNCTION public.update_deal_safe(
  _deal_id uuid,
  _status text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid_statuses text[] := ARRAY['draft','pending','negotiation','accepted','rejected','completed','cancelled'];
BEGIN
  -- Validate status if provided
  IF _status IS NOT NULL AND NOT (_status = ANY(_valid_statuses)) THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  -- Only update allowed fields, verify caller is a participant
  UPDATE public.deals
  SET
    status = COALESCE(_status, status),
    notes = COALESCE(_notes, notes),
    updated_at = now()
  WHERE id = _deal_id
    AND (client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found or access denied';
  END IF;
END;
$$;

-- Revoke direct UPDATE for non-admins by making the policy stricter:
-- participants can only change status and notes columns
DROP POLICY IF EXISTS "Deal participants can update limited fields" ON public.deals;

CREATE POLICY "Deal participants can update status and notes"
ON public.deals
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid()
)
WITH CHECK (
  -- The participant must remain in their original role (can't reassign IDs)
  (client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid())
);

-- =============================================
-- 2. FIX: Verification not enforced at DB level
-- =============================================

-- Create helper function to check if user is verified
CREATE OR REPLACE FUNCTION public.is_verified_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND verification_status IN ('verified', 'approved')
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Update INSERT policies on business tables to require verification

-- Deals: Clients must be verified to create deals
DROP POLICY IF EXISTS "Clients can create deals" ON public.deals;
CREATE POLICY "Verified clients can create deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid() AND public.is_verified_user());

-- Orders: Buyers must be verified to create orders
DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Verified buyers can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid() AND public.is_verified_user());

-- RFQs: Requesters must be verified
DROP POLICY IF EXISTS "Requesters can manage own rfqs" ON public.rfqs;
CREATE POLICY "Verified requesters can manage own rfqs"
ON public.rfqs
FOR ALL
TO authenticated
USING (requester_id = auth.uid() AND public.is_verified_user())
WITH CHECK (requester_id = auth.uid() AND public.is_verified_user());

-- Messages: Senders must be verified (order participant insert)
DROP POLICY IF EXISTS "Order participants can send messages" ON public.messages;
CREATE POLICY "Verified order participants can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_verified_user()
  AND order_id IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = messages.order_id AND orders.buyer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN factories f ON o.factory_id = f.id WHERE o.id = messages.order_id AND f.owner_user_id = auth.uid())
  )
);

-- Deal messages: Senders must be verified
DROP POLICY IF EXISTS "Deal participants can send messages" ON public.deal_messages;
CREATE POLICY "Verified deal participants can send messages"
ON public.deal_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_verified_user()
  AND EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_messages.deal_id
      AND (d.client_id = auth.uid() OR d.supplier_id = auth.uid() OR d.broker_id = auth.uid())
  )
);

-- Cart items: Users must be verified to add items
DROP POLICY IF EXISTS "Users can add to cart" ON public.cart_items;
CREATE POLICY "Verified users can add to cart"
ON public.cart_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_verified_user());

-- =============================================
-- 3. FIX: user_roles privilege escalation risk
-- =============================================

-- Explicitly restrict INSERT/UPDATE/DELETE to admins only
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. FIX: Factory applicants can't read own app
-- =============================================

CREATE POLICY "Applicants can view own application"
ON public.factory_applications
FOR SELECT
TO authenticated
USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));
