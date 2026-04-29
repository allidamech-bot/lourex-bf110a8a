-- Phase 13.4 shipment automation safety net.
-- A converted deal may have at most one shipment linked by deal_id.
-- Existing null deal_id rows are left untouched for legacy/public tracking records.

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_unique_deal_id
ON public.shipments(deal_id)
WHERE deal_id IS NOT NULL;
