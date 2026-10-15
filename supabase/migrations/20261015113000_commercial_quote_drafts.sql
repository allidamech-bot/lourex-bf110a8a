-- LOUREX commercial quotations | Phase 1: internal drafts from canonical Smart RFQ requests.
-- These are company-to-customer quote DRAFTS, not the supplier-facing public.quotes table.
-- No public prices, customer visibility, editing, approval, sending or PDF in this phase.

CREATE TABLE public.commercial_quote_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_request_id uuid NOT NULL UNIQUE REFERENCES public.purchase_requests(id) ON DELETE RESTRICT,
  quote_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','EUR','TRY','SAR','AED')),
  customer_id uuid NOT NULL REFERENCES public.lourex_customers(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commercial_quote_drafts_customer_idx ON public.commercial_quote_drafts(customer_id);
CREATE TABLE public.commercial_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.commercial_quote_drafts(id) ON DELETE CASCADE,
  source_request_item_id uuid NOT NULL REFERENCES public.purchase_request_items(id) ON DELETE RESTRICT,
  line_number integer NOT NULL CHECK (line_number BETWEEN 1 AND 20),
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT '',
  specifications text NOT NULL DEFAULT '',
  moq_snapshot text NOT NULL DEFAULT '',
  packaging_snapshot text NOT NULL DEFAULT '',
  origin_snapshot text NOT NULL DEFAULT '',
  unit_price numeric(18,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id,line_number),
  UNIQUE (quote_id,source_request_item_id),
  CHECK (unit_price IS NULL OR unit_price >= 0)
);
CREATE INDEX commercial_quote_items_quote_idx ON public.commercial_quote_items(quote_id);

-- Quote drafts are INTERNAL by design. Customers must not see unapproved prices
-- or incomplete documents; only the owner and active operations employees can read.
ALTER TABLE public.commercial_quote_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal team can read commercial draft headers"
  ON public.commercial_quote_drafts FOR SELECT TO authenticated
  USING (public.is_lourex_role((SELECT auth.uid()), ARRAY['owner','operations_employee']));
CREATE POLICY "Internal team can read commercial draft lines"
  ON public.commercial_quote_items FOR SELECT TO authenticated
  USING (public.is_lourex_role((SELECT auth.uid()), ARRAY['owner','operations_employee']));

REVOKE ALL ON TABLE public.commercial_quote_drafts, public.commercial_quote_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.commercial_quote_drafts, public.commercial_quote_items TO authenticated;

CREATE OR REPLACE FUNCTION public.create_commercial_quote_draft(p_request_id uuid)
RETURNS TABLE(quote_id uuid, quote_number text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' SET row_security = off
AS $quote$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_request record;
  v_existing record;
  v_draft_id uuid;
  v_draft_number text;
  v_item_count integer;
BEGIN
  IF v_user IS NULL OR NOT public.is_lourex_role(v_user, ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'Internal product quotation access is required' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'A valid Smart RFQ is required' USING ERRCODE='22023';
  END IF;

  -- Lock request-specific creation to prevent duplicate quote drafts on retries.
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_quote:' || p_request_id::text, 0));
  SELECT q.id,q.quote_number INTO v_existing
    FROM public.commercial_quote_drafts AS q WHERE q.source_request_id=p_request_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id,v_existing.quote_number;
    RETURN;
  END IF;

  SELECT r.id,r.customer_id,r.request_number INTO v_request
  FROM public.purchase_requests AS r
  WHERE r.id=p_request_id FOR SHARE;
  IF NOT FOUND OR v_request.request_number NOT LIKE 'RFQ-%' OR v_request.customer_id IS NULL THEN
    RAISE EXCEPTION 'A saved Smart RFQ with customer identity is required' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_item_count FROM public.purchase_request_items i WHERE i.request_id=p_request_id;
  IF v_item_count < 1 OR v_item_count > 20 THEN
    RAISE EXCEPTION 'Smart RFQ item snapshots must contain 1 to 20 items' USING ERRCODE='22023';
  END IF;

  v_draft_id := gen_random_uuid();
  v_draft_number := 'LQ-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' ||
                    upper(substr(replace(v_draft_id::text,'-',''),1,12));
  INSERT INTO public.commercial_quote_drafts
    (id,source_request_id,quote_number,customer_id,created_by)
  VALUES (v_draft_id,p_request_id,v_draft_number,v_request.customer_id,v_user);

  INSERT INTO public.commercial_quote_items (
    quote_id,source_request_item_id,line_number,product_name,quantity,unit,
    specifications,moq_snapshot,packaging_snapshot,origin_snapshot
  )
  SELECT v_draft_id,i.id,i.line_number,i.product_name,i.quantity,i.unit,
    i.specifications,i.moq_snapshot,i.packaging_snapshot,i.origin_snapshot
  FROM public.purchase_request_items i
  WHERE i.request_id=p_request_id ORDER BY i.line_number;

  IF (SELECT count(*) FROM public.commercial_quote_items WHERE quote_id=v_draft_id) <> v_item_count THEN
    RAISE EXCEPTION 'Incomplete quote lines, transaction rolled back';
  END IF;
  RETURN QUERY SELECT v_draft_id,v_draft_number;
END;
$quote$;

REVOKE ALL ON FUNCTION public.create_commercial_quote_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_commercial_quote_draft(uuid) TO authenticated;
