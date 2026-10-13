-- R1 interim containment on the *verified existing* LOUREX TRADING schema.
-- STAGING ONLY until all role-session tests pass. Do not run blindly on production.
-- Compatible with the existing tables; intentionally does not create missing ledger,
-- packing, health, event, or transfer-proof domain tables.
-- RESTRICTIVE policies intersect ALL permissive policies, including legacy broad ones.
-- They DO NOT remove the underlying legacy grants: review these before final cutover.
DO $preflight$
BEGIN
  IF to_regclass('public.deals') IS NULL
     OR to_regclass('public.shipments') IS NULL
     OR to_regclass('public.purchase_requests') IS NULL
     OR to_regclass('public.tracking_updates') IS NULL
     OR to_regclass('public.lourex_customers') IS NULL
     OR to_regclass('public.attachments') IS NULL
     OR to_regclass('public.notifications') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regprocedure('public.is_lourex_role(uuid,text[])') IS NULL
     OR to_regprocedure('public.current_lourex_role()') IS NULL
     OR to_regprocedure('public.lourex_stage_order(text)') IS NULL
  THEN
    RAISE EXCEPTION 'R1 current-schema prerequisites missing. Do not apply a partial migration.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_deal(p_deal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE d.id = p_deal_id
      AND p.status = 'active'
      AND (
        (p.role = 'turkish_partner' AND d.assigned_turkish_partner_id = p.id)
        OR (p.role = 'saudi_partner' AND d.assigned_saudi_partner_id = p.id)
      )
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_request(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE (d.source_request_id = p_request_id
      OR d.id = (SELECT pr.converted_deal_id FROM public.purchase_requests pr
                  WHERE pr.id = p_request_id))
      AND public.lourex_r1_is_assigned_deal(d.id)
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.lourex_r1_is_assigned_shipment(p_shipment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = p_shipment_id
      AND s.deal_id IS NOT NULL
      AND public.lourex_r1_is_assigned_deal(s.deal_id)
  ), false);
$function$;

REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_r1_is_assigned_shipment(uuid) TO authenticated;

-- Existing PERMISSIVE policies still grant broad rows to partners. An AS
-- RESTRICTIVE guard intersects rather than ORs; management and customer policy
-- paths remain intact. All partner direct writes still require existing grants.
CREATE POLICY "R1 existing-schema partner deal select guard"
ON public.deals AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(id)
);

CREATE POLICY "R1 existing-schema partner deal update guard"
ON public.deals AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(id)
)
WITH CHECK (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(id)
);

CREATE POLICY "R1 existing-schema partner deal insert guard"
ON public.deals AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner deal delete guard"
ON public.deals AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner shipment select guard"
ON public.shipments AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
);

CREATE POLICY "R1 existing-schema partner shipment update guard"
ON public.shipments AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
)
WITH CHECK (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_deal(deal_id)
);

CREATE POLICY "R1 existing-schema partner shipment insert guard"
ON public.shipments AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner shipment delete guard"
ON public.shipments AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner requests read guard"
ON public.purchase_requests AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_request(id)
);

CREATE POLICY "R1 existing-schema partner requests insert guard"
ON public.purchase_requests AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner requests update guard"
ON public.purchase_requests AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']))
WITH CHECK (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner requests delete guard"
ON public.purchase_requests AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']));

CREATE POLICY "R1 existing-schema partner customer directory read guard"
ON public.lourex_customers AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.customer_id = lourex_customers.id
      AND public.lourex_r1_is_assigned_deal(d.id)
  )
);

CREATE POLICY "R1 existing-schema partner attachment scope guard"
ON public.attachments AS RESTRICTIVE FOR ALL TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR (entity_type = 'deal' AND public.lourex_r1_is_assigned_deal(entity_id))
  OR (entity_type = 'purchase_request' AND public.lourex_r1_is_assigned_request(entity_id))
  OR (entity_type = 'shipment' AND public.lourex_r1_is_assigned_shipment(entity_id))
)
WITH CHECK (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR (
    uploaded_by = auth.uid()
    AND (
      (entity_type = 'deal' AND public.lourex_r1_is_assigned_deal(entity_id))
      OR (entity_type = 'purchase_request' AND public.lourex_r1_is_assigned_request(entity_id))
      OR (entity_type = 'shipment' AND public.lourex_r1_is_assigned_shipment(entity_id))
    )
  )
);

CREATE POLICY "R1 existing-schema partner tracking select guard"
ON public.tracking_updates AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR public.lourex_r1_is_assigned_shipment(shipment_id)
);

CREATE POLICY "R1 existing-schema partner tracking insert guard"
ON public.tracking_updates AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = tracking_updates.shipment_id
        AND s.deal_id IS NOT NULL
        AND (tracking_updates.deal_id IS NULL OR tracking_updates.deal_id = s.deal_id)
        AND public.lourex_r1_is_assigned_deal(s.deal_id)
        AND public.lourex_stage_order(tracking_updates.stage_code)
          = public.lourex_stage_order(COALESCE(s.current_stage_code, 'deal_accepted')) + 1
    )
    AND (
      (public.is_lourex_role(auth.uid(), ARRAY['turkish_partner'])
       AND public.lourex_stage_order(stage_code) BETWEEN 2 AND 6)
      OR (public.is_lourex_role(auth.uid(), ARRAY['saudi_partner'])
       AND public.lourex_stage_order(stage_code) BETWEEN 7 AND 11)
    )
  )
);

CREATE POLICY "R1 existing-schema partner notifications insert guard"
ON public.notifications AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles recipient
    WHERE recipient.id = notifications.user_id AND recipient.status = 'active'
      AND recipient.role IN ('owner','operations_employee')
  )
  OR EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE public.lourex_r1_is_assigned_deal(d.id)
      AND notifications.user_id IN
        (d.assigned_turkish_partner_id, d.assigned_saudi_partner_id)
  )
);

-- Defense against modifying deal assignment/financial data while retaining
-- updates originating from the validated tracking timeline AFTER INSERT trigger.
CREATE OR REPLACE FUNCTION public.lourex_r1_guard_partner_deal_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']) THEN
    RETURN NEW;
  END IF;
  IF NOT public.lourex_r1_is_assigned_deal(OLD.id)
     OR (to_jsonb(NEW) - ARRAY['operational_status','updated_at'])
         IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['operational_status','updated_at'])
     OR pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'R1: partner cannot directly modify deal structure or assignment';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER lourex_r1_guard_partner_deal_update
BEFORE UPDATE ON public.deals FOR EACH ROW
EXECUTE FUNCTION public.lourex_r1_guard_partner_deal_update();

CREATE OR REPLACE FUNCTION public.lourex_r1_guard_partner_shipment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_old_order integer;
  v_new_order integer;
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner']) THEN
    RETURN NEW;
  END IF;
  IF NOT public.lourex_r1_is_assigned_deal(OLD.deal_id)
     OR (to_jsonb(NEW) - ARRAY['current_stage_code','customer_visible_note','updated_at'])
        IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['current_stage_code','customer_visible_note','updated_at'])
     OR pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'R1: partner cannot directly modify shipment ownership, cargo or route';
  END IF;

  IF NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    v_old_order := public.lourex_stage_order(COALESCE(OLD.current_stage_code, 'deal_accepted'));
    v_new_order := public.lourex_stage_order(NEW.current_stage_code);
    IF v_new_order <> v_old_order + 1
       OR (public.is_lourex_role(auth.uid(), ARRAY['turkish_partner']) AND v_new_order NOT BETWEEN 2 AND 6)
       OR (public.is_lourex_role(auth.uid(), ARRAY['saudi_partner']) AND v_new_order NOT BETWEEN 7 AND 11)
    THEN
      RAISE EXCEPTION 'R1: unauthorized partner shipment stage transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER lourex_r1_guard_partner_shipment_update
BEFORE UPDATE ON public.shipments FOR EACH ROW
EXECUTE FUNCTION public.lourex_r1_guard_partner_shipment_update();

-- Next gate: SQL role tests on a disposable isolated PostgreSQL staging DB.
-- This does NOT secure contents of public product-images Storage bucket:
-- deal-attachments must be moved to a PRIVATE bucket before release.
