-- 1. Fix shipments: remove overly permissive public SELECT
DROP POLICY IF EXISTS "Anyone can look up shipments by tracking_id" ON public.shipments;

-- 2. Drop deprecated webauthn tables
DROP TABLE IF EXISTS public.webauthn_challenges CASCADE;
DROP TABLE IF EXISTS public.webauthn_credentials CASCADE;

-- 3. Drop deprecated webauthn cleanup function
DROP FUNCTION IF EXISTS public.cleanup_webauthn_challenges() CASCADE;

-- 4. Add authenticated-only shipment policies
CREATE POLICY "Users can view own shipments" ON public.shipments FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all shipments" ON public.shipments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create public tracking RPC (security definer - no direct table exposure)
CREATE OR REPLACE FUNCTION public.lookup_shipment_by_tracking(p_tracking_id text)
RETURNS TABLE(tracking_id text, status text, destination text, weight numeric, pallets integer, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.tracking_id, s.status, s.destination, s.weight, s.pallets, s.updated_at
  FROM public.shipments s WHERE s.tracking_id = p_tracking_id LIMIT 1;
$$;