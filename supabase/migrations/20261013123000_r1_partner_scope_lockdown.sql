-- R1 / Sprint A: close pre-existing cross-partner read/write policies.
-- This is intentionally additive to migration history; never edit already-applied SQL.
-- MUST be applied to a disposable staging clone and checked with real user sessions
-- before applying to production. SECURITY DEFINER reporting RPCs are a separate gate.

-- Assignment checks are intentionally SECURITY DEFINER so a nested RLS policy
-- cannot recurse through public.deals. They reveal only a boolean and bind to
-- the authenticated user and their active, server-managed profile role.
CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_deal(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE d.id = p_deal_id
      AND p.status = 'active'
      AND (
        (p.role = 'turkish_partner' AND d.assigned_turkish_partner_id = p.id)
        OR
        (p.role = 'saudi_partner' AND d.assigned_saudi_partner_id = p.id)
      )
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.source_request_id = p_request_id
      AND public.lourex_r1_is_assigned_deal(d.id)
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_shipment(p_shipment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = p_shipment_id
      AND s.deal_id IS NOT NULL
      AND public.lourex_r1_is_assigned_deal(s.deal_id)
  ), false);
$$;

REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) TO authenticated;

-- Legacy internal role predicates include BOTH partners; permissive policies
-- combine with OR, so merely adding narrow policies would not fix isolation.
DROP POLICY IF EXISTS "Internal Lourex roles can view deals" ON public.deals;
DROP POLICY IF EXISTS "Internal Lourex roles can update deals" ON public.deals;
DROP POLICY IF EXISTS "Clients can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Lourex R1 scoped deals read" ON public.deals;
CREATE POLICY "Lourex R1 scoped deals read"
ON public.deals FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_deal(id)
  OR (
    public.current_lourex_role() = 'customer'
    AND (customer_id = auth.uid() OR customer_id = public.current_lourex_customer_id())
  )
);
-- No partner direct writes to deals: partner progress is via authorized tracking.
DROP POLICY IF EXISTS "Lourex R1 owner ops update deals" ON public.deals;
CREATE POLICY "Lourex R1 owner ops update deals"
ON public.deals FOR UPDATE TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

DROP POLICY IF EXISTS "Internal Lourex roles can view purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Internal Lourex roles can insert purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Dashboard internal can update purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Lourex R1 scoped requests read" ON public.purchase_requests;
CREATE POLICY "Lourex R1 scoped requests read"
ON public.purchase_requests FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_request(id)
);
DROP POLICY IF EXISTS "Lourex R1 owner ops insert requests" ON public.purchase_requests;
CREATE POLICY "Lourex R1 owner ops insert requests"
ON public.purchase_requests FOR INSERT TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));
DROP POLICY IF EXISTS "Lourex R1 owner ops update requests" ON public.purchase_requests;
CREATE POLICY "Lourex R1 owner ops update requests"
ON public.purchase_requests FOR UPDATE TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));
-- The existing customer-specific request policies remain intact.

DROP POLICY IF EXISTS "Internal Lourex roles can view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Internal Lourex roles can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Internal Lourex roles can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Turkish Brokers have full logistics SELECT" ON public.shipments;
DROP POLICY IF EXISTS "Turkish Brokers have full logistics INSERT" ON public.shipments;
DROP POLICY IF EXISTS "Turkish Brokers have full logistics UPDATE" ON public.shipments;
DROP POLICY IF EXISTS "Clients can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Lourex R1 scoped shipments read" ON public.shipments;
CREATE POLICY "Lourex R1 scoped shipments read"
ON public.shipments FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
);
DROP POLICY IF EXISTS "Lourex R1 owner ops insert shipments" ON public.shipments;
CREATE POLICY "Lourex R1 owner ops insert shipments"
ON public.shipments FOR INSERT TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

-- Partners need scoped shipment updates when the tracking trigger synchronizes
-- the current stage; prohibit edits to shipment ownership, routing, and cargo.
CREATE OR REPLACE FUNCTION public.lourex_r1_guard_partner_shipment_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_next_order integer;
  v_old_order integer;
BEGIN
  IF v_role NOT IN ('turkish_partner', 'saudi_partner') THEN
    RETURN NEW;
  END IF;
  IF NOT public.lourex_r1_is_assigned_deal(OLD.deal_id)
     OR NEW.deal_id IS DISTINCT FROM OLD.deal_id THEN
    RAISE EXCEPTION 'R1: shipment is not assigned to the current partner';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['current_stage_code','status','customer_visible_note','updated_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['current_stage_code','status','customer_visible_note','updated_at']) THEN
    RAISE EXCEPTION 'R1: partner cannot modify shipment identity, cargo or route';
  END IF;
  IF NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    v_old_order := public.lourex_stage_order(
      public.lourex_normalized_stage(COALESCE(OLD.current_stage_code, OLD.status, 'factory'))
    );
    v_next_order := public.lourex_stage_order(
      public.lourex_normalized_stage(NEW.current_stage_code)
    );
    IF v_next_order <> v_old_order + 1
       OR (v_role = 'turkish_partner' AND v_next_order NOT BETWEEN 1 AND 6)
       OR (v_role = 'saudi_partner' AND v_next_order NOT BETWEEN 7 AND 11) THEN
      RAISE EXCEPTION 'R1: partner stage update outside assigned workflow';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lourex_r1_guard_partner_shipment_update ON public.shipments;
CREATE TRIGGER lourex_r1_guard_partner_shipment_update
BEFORE UPDATE ON public.shipments FOR EACH ROW
EXECUTE FUNCTION public.lourex_r1_guard_partner_shipment_update();

DROP POLICY IF EXISTS "Lourex R1 assigned shipments update" ON public.shipments;
CREATE POLICY "Lourex R1 assigned shipments update"
ON public.shipments FOR UPDATE TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
);

DROP POLICY IF EXISTS "Internal Lourex roles can view tracking updates" ON public.tracking_updates;
DROP POLICY IF EXISTS "Internal users can view tracking updates" ON public.tracking_updates;
DROP POLICY IF EXISTS "Allowed partners can insert tracking updates" ON public.tracking_updates;
DROP POLICY IF EXISTS "Saudi partner can insert destination tracking updates" ON public.tracking_updates;
DROP POLICY IF EXISTS "Lourex R1 scoped tracking read" ON public.tracking_updates;
CREATE POLICY "Lourex R1 scoped tracking read"
ON public.tracking_updates FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR public.lourex_r1_is_assigned_shipment(shipment_id)
);
DROP POLICY IF EXISTS "Lourex R1 assigned tracking insert" ON public.tracking_updates;
CREATE POLICY "Lourex R1 assigned tracking insert"
ON public.tracking_updates FOR INSERT TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR (
    updated_by = auth.uid()
    AND (
      (public.current_lourex_role() = 'turkish_partner'
        AND public.lourex_stage_order(stage_code) BETWEEN 1 AND 6)
      OR
      (public.current_lourex_role() = 'saudi_partner'
        AND public.lourex_stage_order(stage_code) BETWEEN 7 AND 11)
    )
    AND EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = tracking_updates.shipment_id
        AND s.deal_id IS NOT NULL
        AND (tracking_updates.deal_id IS NULL OR tracking_updates.deal_id = s.deal_id)
        AND public.lourex_r1_is_assigned_deal(s.deal_id)
    )
  )
);

-- Partner audit inserts remain available for genuine activity, but full audit
-- reads are owner/operations only.
DROP POLICY IF EXISTS "Internal Lourex roles can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Lourex R1 owner ops read audit" ON public.audit_logs;
CREATE POLICY "Lourex R1 owner ops read audit"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

-- Remove global Saudi partner ledger visibility introduced in Phase 21.
DROP POLICY IF EXISTS "Saudi Partners can view ledger accounts" ON public.ledger_accounts;
DROP POLICY IF EXISTS "Saudi Partners can view ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Saudi Partners can view ledger lines" ON public.ledger_lines;

-- Ledger visibility stays linked to an assigned Saudi deal only.
DROP POLICY IF EXISTS "Lourex R1 Saudi assigned ledger entries" ON public.ledger_entries;
CREATE POLICY "Lourex R1 Saudi assigned ledger entries"
ON public.ledger_entries FOR SELECT TO authenticated
USING (
  public.current_lourex_role() = 'saudi_partner'
  AND public.lourex_r1_is_assigned_deal(deal_id)
);
DROP POLICY IF EXISTS "Lourex R1 Saudi assigned ledger lines" ON public.ledger_lines;
CREATE POLICY "Lourex R1 Saudi assigned ledger lines"
ON public.ledger_lines FOR SELECT TO authenticated
USING (
  public.current_lourex_role() = 'saudi_partner'
  AND EXISTS (
    SELECT 1 FROM public.ledger_entries e
    WHERE e.id = ledger_lines.entry_id
      AND public.lourex_r1_is_assigned_deal(e.deal_id)
  )
);
DROP POLICY IF EXISTS "Lourex R1 Saudi assigned ledger accounts" ON public.ledger_accounts;
CREATE POLICY "Lourex R1 Saudi assigned ledger accounts"
ON public.ledger_accounts FOR SELECT TO authenticated
USING (
  public.current_lourex_role() = 'saudi_partner'
  AND EXISTS (
    SELECT 1 FROM public.ledger_lines l
    JOIN public.ledger_entries e ON e.id = l.entry_id
    WHERE l.account_id = ledger_accounts.id
      AND public.lourex_r1_is_assigned_deal(e.deal_id)
  )
);

-- No GRANT changes: RLS is NOT a substitute for column grants and RPC review.
-- R1 release gate: verify all policies from pg_policies on staging, including
-- any permissive policies added by older migrations before production use.
