-- LOUREX commercial quotation | Phase 2: private staff-only pricing and terms.
-- Only canonical Smart RFQ draft lines may be priced, all in one transaction.
-- Customer access, delivery/approval and PDF generation remain intentionally disabled.
ALTER TABLE public.commercial_quote_drafts
  ADD COLUMN payment_terms text NOT NULL DEFAULT '' CHECK (length(payment_terms) <= 2000),
  ADD COLUMN delivery_terms text NOT NULL DEFAULT '' CHECK (length(delivery_terms) <= 2000),
  ADD COLUMN incoterm text NOT NULL DEFAULT '' CHECK (length(incoterm) <= 120),
  ADD COLUMN lead_time text NOT NULL DEFAULT '' CHECK (length(lead_time) <= 240),
  ADD COLUMN validity_days integer NOT NULL DEFAULT 30 CHECK (validity_days BETWEEN 1 AND 365),
  ADD COLUMN shipping_cost numeric(18,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  ADD COLUMN discount_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN internal_notes text NOT NULL DEFAULT '' CHECK (length(internal_notes) <= 2000),
  ADD COLUMN last_priced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN last_priced_at timestamptz;

CREATE OR REPLACE FUNCTION public.save_commercial_quote_draft(
  p_quote_id uuid,
  p_currency text,
  p_payment_terms text,
  p_delivery_terms text,
  p_incoterm text,
  p_lead_time text,
  p_validity_days integer,
  p_shipping_cost numeric,
  p_discount_amount numeric,
  p_internal_notes text,
  p_line_prices jsonb
) RETURNS TABLE (quote_id uuid, subtotal numeric, total numeric, fully_priced boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET row_security = off
AS $quote$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_draft record;
  v_expected_count integer;
  v_matched_count integer;
  v_updated_count integer;
  v_unpriced integer;
  v_subtotal numeric;
  v_total numeric;
  v_currency text := upper(btrim(coalesce(p_currency,'')));
BEGIN
  IF v_user IS NULL OR NOT public.is_lourex_role(v_user, ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'Internal quotation pricing access is required' USING ERRCODE='42501';
  END IF;

  IF p_quote_id IS NULL OR v_currency NOT IN ('USD','EUR','TRY','SAR','AED') THEN
    RAISE EXCEPTION 'Invalid quote or currency' USING ERRCODE='22023';
  END IF;
  IF length(coalesce(p_payment_terms,'')) > 2000
     OR length(coalesce(p_delivery_terms,'')) > 2000
     OR length(coalesce(p_incoterm,'')) > 120
     OR length(coalesce(p_lead_time,'')) > 240
     OR length(coalesce(p_internal_notes,'')) > 2000
     OR p_validity_days IS NULL OR p_validity_days NOT BETWEEN 1 AND 365
     OR p_shipping_cost IS NULL OR p_shipping_cost < 0 OR p_shipping_cost > 10000000000
     OR p_discount_amount IS NULL OR p_discount_amount < 0 OR p_discount_amount > 10000000000
  THEN
    RAISE EXCEPTION 'Invalid quotation terms or amounts' USING ERRCODE='22023';
  END IF;

  SELECT q.id,q.status INTO v_draft FROM public.commercial_quote_drafts AS q
  WHERE q.id=p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_draft.status <> 'draft' THEN
    RAISE EXCEPTION 'Editable quotation draft not found' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_line_prices) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Quote line prices must be an array' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_expected_count FROM public.commercial_quote_items i
  WHERE i.quote_id=p_quote_id;
  IF v_expected_count NOT BETWEEN 1 AND 20 OR jsonb_array_length(p_line_prices) <> v_expected_count THEN
    RAISE EXCEPTION 'All existing quote lines must be supplied exactly once' USING ERRCODE='22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_line_prices) AS p(value)
    WHERE jsonb_typeof(p.value) IS DISTINCT FROM 'object'
      OR coalesce(p.value->>'item_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR jsonb_typeof(p.value->'unit_price') NOT IN ('number','null')
      OR (jsonb_typeof(p.value->'unit_price') = 'number'
          AND (p.value->>'unit_price') !~ '^[0-9]{1,10}(\.[0-9]{1,4})?$')
  ) THEN
    RAISE EXCEPTION 'Invalid quotation line ID or unit price' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_line_prices) AS p(value)
    GROUP BY p.value->>'item_id' HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate quote line in pricing payload' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_matched_count
  FROM jsonb_array_elements(p_line_prices) AS p(value)
  INNER JOIN public.commercial_quote_items i
    ON i.id=(p.value->>'item_id')::uuid AND i.quote_id=p_quote_id;
  IF v_matched_count <> v_expected_count THEN
    RAISE EXCEPTION 'Pricing payload contains an unknown or cross-quote line' USING ERRCODE='22023';
  END IF;

  UPDATE public.commercial_quote_items AS i
  SET unit_price = nullif(p.value->>'unit_price','')::numeric
  FROM jsonb_array_elements(p_line_prices) AS p(value)
  WHERE i.id=(p.value->>'item_id')::uuid AND i.quote_id=p_quote_id;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> v_expected_count THEN
    RAISE EXCEPTION 'Partial quote pricing update rolled back';
  END IF;
  SELECT count(*) FILTER (WHERE i.unit_price IS NULL),
         coalesce(sum(i.quantity::numeric * i.unit_price),0)
    INTO v_unpriced,v_subtotal
  FROM public.commercial_quote_items i WHERE i.quote_id=p_quote_id;
  IF v_unpriced=0 THEN
    v_total := round(v_subtotal+p_shipping_cost-p_discount_amount,2);
    IF v_total < 0 THEN
      RAISE EXCEPTION 'Discount exceeds priced subtotal plus shipping' USING ERRCODE='22023';
    END IF;
  ELSE
    v_subtotal := NULL;
    v_total := NULL;
  END IF;

  UPDATE public.commercial_quote_drafts SET
    currency=v_currency,
    payment_terms=btrim(coalesce(p_payment_terms,'')),
    delivery_terms=btrim(coalesce(p_delivery_terms,'')),
    incoterm=btrim(coalesce(p_incoterm,'')),
    lead_time=btrim(coalesce(p_lead_time,'')),
    validity_days=p_validity_days,
    shipping_cost=p_shipping_cost,
    discount_amount=p_discount_amount,
    internal_notes=btrim(coalesce(p_internal_notes,'')),
    last_priced_by=v_user,
    last_priced_at=now(),
    updated_at=now()
  WHERE id=p_quote_id AND status='draft';

  RETURN QUERY SELECT p_quote_id,v_subtotal,v_total,(v_unpriced=0);
END;
$quote$;

REVOKE ALL ON FUNCTION public.save_commercial_quote_draft(
  uuid,text,text,text,text,text,integer,numeric,numeric,text,jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_commercial_quote_draft(
  uuid,text,text,text,text,text,integer,numeric,numeric,text,jsonb
) TO authenticated;

-- Header and line tables retain their SELECT-only staff RLS policies.
-- Pricing is never directly editable through PostgREST or visible to customers.
