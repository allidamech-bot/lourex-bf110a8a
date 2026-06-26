-- LOUREX Sprint 1 — RLS Ownership & Partner Scope Hardening
-- Date: 2026-06-26
-- Purpose: Harden Supabase authorization, ownership, and partner-scoped access so that
-- no user can read, update, insert, or infer commercial data they do not own or are not
-- explicitly assigned to, even if they bypass the frontend and call Supabase directly.

-- ============================================================
-- 1. HELPER FUNCTION: Partner Assignment Check
-- ============================================================
-- Returns true if the user is assigned to the deal as the specified partner type.
-- This function is used to enforce assignment-scoped access at the RLS level.

CREATE OR REPLACE FUNCTION public.is_assigned_turkish_partner(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.profiles p ON p.id = d.assigned_turkish_partner_id
    WHERE d.id = p_deal_id
      AND p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'turkish_partner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_saudi_partner(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.profiles p ON p.id = d.assigned_saudi_partner_id
    WHERE d.id = p_deal_id
      AND p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'saudi_partner'
  );
$$;

-- ============================================================
-- 2. DEALS RLS POLICIES - Partner Assignment Scoped
-- ============================================================
-- Remove overexposed policies and replace with assignment-scoped ones.

-- Customers can view their own deals
DROP POLICY IF EXISTS "Clients can view own deals" ON public.deals;
CREATE POLICY "Customers can view own deals"
ON public.deals FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
);

-- Owner and operations can view all deals
DROP POLICY IF EXISTS "Owner and operations can view deals" ON public.deals;
CREATE POLICY "Owner and operations can view deals"
ON public.deals FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Turkish partners can only view deals explicitly assigned to them
DROP POLICY IF EXISTS "Turkish partners can view assigned deals" ON public.deals;
DROP POLICY IF EXISTS "Internal Lourex roles can view deals" ON public.deals;
CREATE POLICY "Turkish partners can view assigned deals"
ON public.deals FOR SELECT
TO authenticated
USING (
  public.is_assigned_turkish_partner(deals.id)
);

-- Saudi partners can only view deals explicitly assigned to them
DROP POLICY IF EXISTS "Saudi partners can view assigned deals" ON public.deals;
CREATE POLICY "Saudi partners can view assigned deals"
ON public.deals FOR SELECT
TO authenticated
USING (
  public.is_assigned_saudi_partner(deals.id)
);

-- Owner and operations can insert deals (unchanged)
DROP POLICY IF EXISTS "Owner and operations can insert deals" ON public.deals;
CREATE POLICY "Owner and operations can insert deals"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Owner and operations can update deals (but partners can update within their stage domain)
DROP POLICY IF EXISTS "Internal Lourex roles can update deals" ON public.deals;
CREATE POLICY "Owner and operations can update deals"
ON public.deals FOR UPDATE
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Partners can update deal operational status within their stage domain
-- Turkish partner: stages 1-6 (origin execution)
DROP POLICY IF EXISTS "Turkish partners can update assigned deals within stage domain" ON public.deals;
CREATE POLICY "Turkish partners can update assigned deals within stage domain"
ON public.deals FOR UPDATE
TO authenticated
USING (
  public.is_assigned_turkish_partner(deals.id)
)
WITH CHECK (
  public.is_assigned_turkish_partner(deals.id)
);

-- Saudi partner: stages 7-11 (destination execution)
DROP POLICY IF EXISTS "Saudi partners can update assigned deals within stage domain" ON public.deals;
CREATE POLICY "Saudi partners can update assigned deals within stage domain"
ON public.deals FOR UPDATE
TO authenticated
USING (
  public.is_assigned_saudi_partner(deals.id)
)
WITH CHECK (
  public.is_assigned_saudi_partner(deals.id)
);

-- ============================================================
-- 3. SHIPMENTS RLS POLICIES - Partner Assignment Scoped
-- ============================================================

-- Customers can view shipments linked to their deals
DROP POLICY IF EXISTS "Clients can view own shipments" ON public.shipments;
CREATE POLICY "Customers can view own shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = shipments.deal_id
      AND d.customer_id = auth.uid()
  )
);

-- Owner and operations can view all shipments (unchanged)
DROP POLICY IF EXISTS "Owner and operations can view shipments" ON public.shipments;
CREATE POLICY "Owner and operations can view shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Turkish partners can only view shipments for their assigned deals
DROP POLICY IF EXISTS "Turkish partners can view assigned shipments" ON public.shipments;
DROP POLICY IF EXISTS "Turkish Brokers have full logistics SELECT" ON public.shipments;
CREATE POLICY "Turkish partners can view assigned shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = shipments.deal_id
      AND d.assigned_turkish_partner_id = auth.uid()
  )
);

-- Saudi partners can only view shipments for their assigned deals
DROP POLICY IF EXISTS "Saudi partners can view assigned shipments" ON public.shipments;
CREATE POLICY "Saudi partners can view assigned shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = shipments.deal_id
      AND d.assigned_saudi_partner_id = auth.uid()
  )
);

-- Owner and operations can insert/update shipments (unchanged)
DROP POLICY IF EXISTS "Owner and operations can insert shipments" ON public.shipments;
CREATE POLICY "Owner and operations can insert shipments"
ON public.shipments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

DROP POLICY IF EXISTS "Owner and operations can update shipments" ON public.shipments;
CREATE POLICY "Owner and operations can update shipments"
ON public.shipments FOR UPDATE
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- ============================================================
-- 4. PURCHASE_REQUESTS RLS POLICIES - Customer Ownership Scoped
-- ============================================================

-- Customers can view their own purchase requests
DROP POLICY IF EXISTS "Customers can view own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can view own purchase requests"
ON public.purchase_requests FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
);

-- Owner and operations can view all purchase requests
DROP POLICY IF EXISTS "Owner and operations can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Owner and operations can view purchase requests"
ON public.purchase_requests FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Turkish partners can view purchase requests linked to their assigned deals
DROP POLICY IF EXISTS "Turkish partners can view assigned purchase requests" ON public.purchase_requests;
CREATE POLICY "Turkish partners can view assigned purchase requests"
ON public.purchase_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.source_request_id = purchase_requests.id
      AND d.assigned_turkish_partner_id = auth.uid()
  )
);

-- Saudi partners can view purchase requests linked to their assigned deals
DROP POLICY IF EXISTS "Saudi partners can view assigned purchase requests" ON public.purchase_requests;
CREATE POLICY "Saudi partners can view assigned purchase requests"
ON public.purchase_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.source_request_id = purchase_requests.id
      AND d.assigned_saudi_partner_id = auth.uid()
  )
);

-- Customers can insert their own purchase requests (for authenticated submissions)
DROP POLICY IF EXISTS "Customers can insert own purchase requests" ON public.purchase_requests;
CREATE POLICY "Public and customers can submit purchase requests"
ON public.purchase_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Owner and operations can update purchase requests (unchanged)
DROP POLICY IF EXISTS "Owner and operations can update purchase requests" ON public.purchase_requests;
CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests FOR UPDATE
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- ============================================================
-- 5. TRACKING_UPDATES RLS POLICIES - Partner Assignment Scoped
-- ============================================================

-- Customers can view customer_visible tracking updates for their shipments
DROP POLICY IF EXISTS "Customers can view own tracking updates" ON public.tracking_updates;
CREATE POLICY "Customers can view own tracking updates"
ON public.tracking_updates FOR SELECT
TO authenticated
USING (
  visibility = 'customer_visible'
  AND EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.deals d ON d.id = s.deal_id
    WHERE s.id = tracking_updates.shipment_id
      AND d.customer_id = auth.uid()
  )
);

-- Owner and operations can view all tracking updates
DROP POLICY IF EXISTS "Owner and operations can view tracking updates" ON public.tracking_updates;
CREATE POLICY "Owner and operations can view tracking updates"
ON public.tracking_updates FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Turkish partners can view tracking updates for their assigned deals (origin stages)
DROP POLICY IF EXISTS "Turkish partners can view assigned tracking updates" ON public.tracking_updates;
CREATE POLICY "Turkish partners can view assigned tracking updates"
ON public.tracking_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = COALESCE(tracking_updates.deal_id, 
           (SELECT deal_id FROM public.shipments WHERE id = tracking_updates.shipment_id))
      AND d.assigned_turkish_partner_id = auth.uid()
  )
);

-- Saudi partners can view tracking updates for their assigned deals (destination stages)
DROP POLICY IF EXISTS "Saudi partners can view assigned tracking updates" ON public.tracking_updates;
CREATE POLICY "Saudi partners can view assigned tracking updates"
ON public.tracking_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = COALESCE(tracking_updates.deal_id,
           (SELECT deal_id FROM public.shipments WHERE id = tracking_updates.shipment_id))
      AND d.assigned_saudi_partner_id = auth.uid()
  )
);

-- Insert policy: turkish_partner can insert for stages 1-6, saudi_partner for stages 7-11
DROP POLICY IF EXISTS "Allowed partners can insert tracking updates" ON public.tracking_updates;
CREATE POLICY "Allowed partners can insert tracking updates"
ON public.tracking_updates FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  OR (
    public.get_profile_role(auth.uid()) = 'turkish_partner'
    AND public.lourex_stage_order(tracking_updates.stage_code) BETWEEN 1 AND 6
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = COALESCE(tracking_updates.deal_id,
             (SELECT deal_id FROM public.shipments WHERE id = tracking_updates.shipment_id))
        AND d.assigned_turkish_partner_id = auth.uid()
    )
  )
  OR (
    public.get_profile_role(auth.uid()) = 'saudi_partner'
    AND public.lourex_stage_order(tracking_updates.stage_code) BETWEEN 7 AND 11
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = COALESCE(tracking_updates.deal_id,
             (SELECT deal_id FROM public.shipments WHERE id = tracking_updates.shipment_id))
        AND d.assigned_saudi_partner_id = auth.uid()
    )
  )
);

-- ============================================================
-- 6. ATTACHMENTS RLS POLICIES - Customer/Partner Ownership Scoped
-- ============================================================

-- Customers can view customer_visible attachments for their entities
DROP POLICY IF EXISTS "Customers can view customer_visible attachments" ON public.attachments;
CREATE POLICY "Customers can view customer_visible attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  visibility = 'customer_visible'
  AND (
    (entity_type = 'purchase_request' AND EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = attachments.entity_id
        AND pr.customer_id = auth.uid()
    ))
    OR
    (entity_type = 'deal' AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = attachments.entity_id
        AND d.customer_id = auth.uid()
    ))
  )
);

-- Owner and operations can view all attachments
DROP POLICY IF EXISTS "Owner and operations can view attachments" ON public.attachments;
CREATE POLICY "Owner and operations can view attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Turkish partners can view attachments for their assigned deals
DROP POLICY IF EXISTS "Turkish partners can view assigned attachments" ON public.attachments;
CREATE POLICY "Turkish partners can view assigned attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE (d.id = attachments.entity_id AND attachments.entity_type = 'deal')
      OR (d.source_request_id = attachments.entity_id AND attachments.entity_type = 'purchase_request')
      AND d.assigned_turkish_partner_id = auth.uid()
  )
);

-- Saudi partners can view attachments for their assigned deals
DROP POLICY IF EXISTS "Saudi partners can view assigned attachments" ON public.attachments;
CREATE POLICY "Saudi partners can view assigned attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE (d.id = attachments.entity_id AND attachments.entity_type = 'deal')
      OR (d.source_request_id = attachments.entity_id AND attachments.entity_type = 'purchase_request')
      AND d.assigned_saudi_partner_id = auth.uid()
  )
);

-- ============================================================
-- 7. TRANSFER_PROOFS RLS POLICIES - Customer Ownership Scoped
-- ============================================================

-- Customers can view their own transfer proofs
DROP POLICY IF EXISTS "Customers can read own transfer proofs" ON public.transfer_proofs;
CREATE POLICY "Customers can read own transfer proofs"
ON public.transfer_proofs FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
);

-- Owner and operations can view all transfer proofs
DROP POLICY IF EXISTS "Owner and operations can view transfer proofs" ON public.transfer_proofs;
CREATE POLICY "Owner and operations can view transfer proofs"
ON public.transfer_proofs FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- ============================================================
-- 8. LOUREX_CUSTOMERS RLS POLICIES - Internal Only View
-- ============================================================

-- Note: lourex_customers contains customer business records.
-- Only internal roles can view them; customers access via their own profile.
DROP POLICY IF EXISTS "Internal Lourex roles can view customers" ON public.lourex_customers;
CREATE POLICY "Internal Lourex roles can view customers"
ON public.lourex_customers FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- ============================================================
-- 9. AUDIT_LOGS RLS POLICIES - Internal Only View
-- ============================================================

DROP POLICY IF EXISTS "Internal Lourex roles can view audit logs" ON public.audit_logs;
CREATE POLICY "Owner and operations can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

DROP POLICY IF EXISTS "Internal Lourex roles can insert audit logs" ON public.audit_logs;
CREATE POLICY "Owner and operations can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  AND changed_by = auth.uid()
);

-- ============================================================
-- 10. SECURITY_AUDIT_EVENTS RLS POLICIES - Owner/Operations Only
-- ============================================================

DROP POLICY IF EXISTS "Owner and operations can view security audit events" ON public.security_audit_events;
CREATE POLICY "Owner and operations can view security audit events"
ON public.security_audit_events FOR SELECT
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

-- Security audit events can only be inserted via SECURITY DEFINER functions
-- No direct INSERT policy for authenticated users on this table.

-- ============================================================
-- 11. GRANTS FOR HELPER FUNCTIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_assigned_turkish_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_saudi_partner(uuid) TO authenticated;