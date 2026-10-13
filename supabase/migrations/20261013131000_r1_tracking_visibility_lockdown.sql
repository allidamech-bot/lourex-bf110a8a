-- R1: remove legacy "public" timeline list access and loose partner INSERTs.
-- /track uses lookup_lourex_tracking or lookup_shipment_by_tracking with a
-- specific tracking reference. It must not rely on bulk SELECT from the
-- underlying tracking_updates table.
--
-- Historical public tracking reads used:
--   FOR SELECT TO anon, authenticated USING (visibility='customer_visible')
-- This exposes all customer-visible updates without a tracking secret.
DROP POLICY IF EXISTS "Public can view customer visible tracking updates"
ON public.tracking_updates;

-- This historical policy permitted ANY active partner to insert tracking
-- updates into unrelated shipments without validating deal assignment.
-- The R1 assigned tracking insert policy enforces both partner and stage scope.
DROP POLICY IF EXISTS "Assigned partners can insert tracking updates"
ON public.tracking_updates;

-- Intentionally retain: "Lourex R1 scoped tracking read",
-- "Lourex R1 assigned tracking insert", and existing customer-specific
-- SELECT policies for the authenticated customer portal.
-- Verify public lookup_lourex_tracking and lookup_shipment_by_tracking
-- separately on staging. Do not re-introduce a global SELECT to fix a
-- restricted tracking-number lookup.
