-- 20260503_production_persistence_fix.sql
-- Goal: Restore platform stability by instantiating missing system tables and ensuring schema consistency.

-- 1. Helper Functions (Ensure they exist and are correctly defined)
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

CREATE OR REPLACE FUNCTION public.current_lourex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
  );
$$;

-- 2. Missing System Tables

-- business_rules
CREATE TABLE IF NOT EXISTS public.business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_group text NOT NULL DEFAULT 'general',
  description text NULL,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- security_audit_events
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- system_events
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- system_health_snapshots
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL DEFAULT 'lightweight',
  status text NOT NULL DEFAULT 'ok',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- shipment_events
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage text NULL,
  to_stage text NULL,
  note text NULL,
  actor_user_id uuid NULL,
  is_customer_visible boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tracking_updates (If missing or incomplete)
CREATE TABLE IF NOT EXISTS public.tracking_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  deal_id uuid NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  stage_code text NOT NULL,
  previous_stage_code text NULL,
  note text NULL,
  customer_note text NULL,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_visible')),
  updated_by uuid NULL,
  updated_by_role text NULL,
  occurred_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS and Security

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;

-- Policies for business_rules
DROP POLICY IF EXISTS "Internal roles can view business rules" ON public.business_rules;
CREATE POLICY "Internal roles can view business rules"
ON public.business_rules FOR SELECT TO authenticated
USING (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Owners can manage business rules" ON public.business_rules;
CREATE POLICY "Owners can manage business rules"
ON public.business_rules FOR ALL TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

-- Policies for security_audit_events
DROP POLICY IF EXISTS "Owner and operations can view security audit events" ON public.security_audit_events;
CREATE POLICY "Owner and operations can view security audit events"
ON public.security_audit_events FOR SELECT TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

-- Policies for system_events
DROP POLICY IF EXISTS "Internal roles can view system events" ON public.system_events;
CREATE POLICY "Internal roles can view system events"
ON public.system_events FOR SELECT TO authenticated
USING (public.is_lourex_internal(auth.uid()));

-- Policies for system_health_snapshots
DROP POLICY IF EXISTS "Internal roles can view health snapshots" ON public.system_health_snapshots;
CREATE POLICY "Internal roles can view health snapshots"
ON public.system_health_snapshots FOR SELECT TO authenticated
USING (public.is_lourex_internal(auth.uid()));

-- Policies for shipment_events
DROP POLICY IF EXISTS "Internal roles can view shipment events" ON public.shipment_events;
CREATE POLICY "Internal roles can view shipment events"
ON public.shipment_events FOR SELECT TO authenticated
USING (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Customers can view own shipment events" ON public.shipment_events;
CREATE POLICY "Customers can view own shipment events"
ON public.shipment_events FOR SELECT TO authenticated
USING (
  is_customer_visible AND 
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.deals d ON d.id = s.deal_id
    WHERE s.id = shipment_events.shipment_id AND d.customer_id = auth.uid()
  )
);

-- 4. Financial Entries Consistency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_entries' AND column_name='entry_number') THEN
        ALTER TABLE public.financial_entries ADD COLUMN entry_number text UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_entries' AND column_name='reference_label') THEN
        ALTER TABLE public.financial_entries ADD COLUMN reference_label text;
    END IF;
END $$;

-- 5. RPC Functions (Ensure core functions exist)
CREATE OR REPLACE FUNCTION public.capture_system_health_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.system_health_snapshots (metrics)
  VALUES (
    jsonb_build_object(
      'requests', (SELECT COUNT(*) FROM public.purchase_requests),
      'deals', (SELECT COUNT(*) FROM public.deals),
      'shipments', (SELECT COUNT(*) FROM public.shipments),
      'customers', (SELECT COUNT(*) FROM public.lourex_customers),
      'financial_entries', (SELECT COUNT(*) FROM public.financial_entries),
      'timestamp', now()
    )
  );
END;
$$;

GRANT ALL ON public.business_rules TO authenticated;
GRANT ALL ON public.security_audit_events TO authenticated;
GRANT ALL ON public.system_events TO authenticated;
GRANT ALL ON public.system_health_snapshots TO authenticated;
GRANT ALL ON public.shipment_events TO authenticated;
GRANT ALL ON public.tracking_updates TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_system_health_snapshot() TO authenticated;
