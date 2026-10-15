-- LOUREX quotations phase 4: immutable revisions following a customer's change request.
-- Applied only after the phase 1-3 migrations. Old issued snapshots and their audit events remain untouched.
ALTER TABLE public.commercial_quote_drafts
  DROP CONSTRAINT commercial_quote_drafts_source_request_id_key;
ALTER TABLE public.commercial_quote_drafts
  ADD COLUMN version_no integer NOT NULL DEFAULT 1 CHECK (version_no BETWEEN 1 AND 100),
  ADD COLUMN parent_quote_id uuid REFERENCES public.commercial_quote_drafts(id) ON DELETE RESTRICT;
ALTER TABLE public.commercial_quote_drafts
  ADD CONSTRAINT commercial_quote_request_version_uniq UNIQUE (source_request_id,version_no),
  ADD CONSTRAINT commercial_quote_parent_uniq UNIQUE (parent_quote_id),
  ADD CONSTRAINT commercial_quote_initial_parent_chk CHECK (
    (version_no=1 AND parent_quote_id IS NULL) OR (version_no>1 AND parent_quote_id IS NOT NULL)
  );
CREATE INDEX commercial_quote_request_versions_idx
  ON public.commercial_quote_drafts(source_request_id,version_no DESC);
-- Exactly one in-progress quotation per request. Past versions have a final response.
CREATE UNIQUE INDEX commercial_quote_one_active_version_idx
  ON public.commercial_quote_drafts(source_request_id)
  WHERE status IN ('draft','approved','issued');
ALTER TABLE public.commercial_quote_events DROP CONSTRAINT commercial_quote_events_action_check;
ALTER TABLE public.commercial_quote_events ADD CONSTRAINT commercial_quote_events_action_check
  CHECK (action IN ('approved','issued','accepted','changes_requested','declined','revision_created'));

-- Preserve the original creation API for untouched requests, but always return the latest
-- when staff retries on a request with revisions, rather than an arbitrary older quote.
CREATE OR REPLACE FUNCTION public.create_commercial_quote_draft(p_request_id uuid)
RETURNS TABLE(quote_id uuid, quote_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $quote$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_request record;
  v_existing record;
  v_draft_id uuid;
  v_number text;
  v_count integer;
BEGIN
  IF v_actor IS NULL OR NOT public.is_lourex_role(v_actor,ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'Internal product quotation access is required' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Valid request required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_quote:' || p_request_id::text,0));
  SELECT q.id,q.quote_number INTO v_existing FROM public.commercial_quote_drafts q
    WHERE q.source_request_id=p_request_id ORDER BY q.version_no DESC LIMIT 1;
  IF FOUND THEN RETURN QUERY SELECT v_existing.id,v_existing.quote_number; RETURN; END IF;
  SELECT r.id,r.customer_id,r.request_number INTO v_request
    FROM public.purchase_requests r WHERE r.id=p_request_id FOR SHARE;
  IF NOT FOUND OR v_request.request_number NOT LIKE 'RFQ-%' OR v_request.customer_id IS NULL THEN
    RAISE EXCEPTION 'Saved Smart RFQ with customer identity required' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_count FROM public.purchase_request_items WHERE request_id=p_request_id;
  IF v_count NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Smart RFQ requires 1 to 20 saved lines' USING ERRCODE='22023';
  END IF;
  v_draft_id := gen_random_uuid();
  v_number := 'LQ-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' ||
              upper(substr(replace(v_draft_id::text,'-',''),1,12));
  INSERT INTO public.commercial_quote_drafts(id,source_request_id,quote_number,customer_id,created_by)
    VALUES(v_draft_id,p_request_id,v_number,v_request.customer_id,v_actor);
  INSERT INTO public.commercial_quote_items
    (quote_id,source_request_item_id,line_number,product_name,quantity,unit,
     specifications,moq_snapshot,packaging_snapshot,origin_snapshot)
  SELECT v_draft_id,i.id,i.line_number,i.product_name,i.quantity,i.unit,
         i.specifications,i.moq_snapshot,i.packaging_snapshot,i.origin_snapshot
    FROM public.purchase_request_items i WHERE i.request_id=p_request_id ORDER BY i.line_number;
  IF (SELECT count(*) FROM public.commercial_quote_items i WHERE i.quote_id=v_draft_id)<>v_count THEN
    RAISE EXCEPTION 'Incomplete quotation snapshot';
  END IF;
  RETURN QUERY SELECT v_draft_id,v_number;
END;$quote$;
REVOKE ALL ON FUNCTION public.create_commercial_quote_draft(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_commercial_quote_draft(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_commercial_quote_revision(p_previous_quote_id uuid)
RETURNS TABLE(quote_id uuid, quote_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $revision$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_prev public.commercial_quote_drafts%ROWTYPE;
  v_existing record;
  v_new_id uuid;
  v_new_number text;
  v_count integer;
BEGIN
  IF v_actor IS NULL OR NOT public.is_lourex_role(v_actor,ARRAY['owner','operations_employee']) THEN
    RAISE EXCEPTION 'Internal quotation revision access required' USING ERRCODE='42501';
  END IF;
  IF p_previous_quote_id IS NULL THEN
    RAISE EXCEPTION 'Previous quotation ID required' USING ERRCODE='22023';
  END IF;
  -- Serialize repeated clicks against the same previous quotation.
  SELECT * INTO v_prev FROM public.commercial_quote_drafts WHERE id=p_previous_quote_id FOR UPDATE;
  IF NOT FOUND OR v_prev.status <> 'changes_requested' THEN
    RAISE EXCEPTION 'A customer change request is required to create a revision' USING ERRCODE='22023';
  END IF;
  SELECT q.id,q.quote_number INTO v_existing FROM public.commercial_quote_drafts q
    WHERE q.parent_quote_id=p_previous_quote_id;
  IF FOUND THEN RETURN QUERY SELECT v_existing.id,v_existing.quote_number; RETURN; END IF;
  IF v_prev.version_no>=100 OR EXISTS (
    SELECT 1 FROM public.commercial_quote_drafts
      WHERE source_request_id=v_prev.source_request_id AND version_no>v_prev.version_no
  ) THEN RAISE EXCEPTION 'A newer quotation already exists' USING ERRCODE='22023'; END IF;
  v_new_id:=gen_random_uuid();
  v_new_number:=regexp_replace(v_prev.quote_number,'-R[0-9]+$','') || '-R' || (v_prev.version_no+1)::text;
  INSERT INTO public.commercial_quote_drafts
    (id,source_request_id,quote_number,customer_id,created_by,version_no,parent_quote_id,
     currency,payment_terms,delivery_terms,incoterm,lead_time,validity_days,
     shipping_cost,discount_amount)
  VALUES
    (v_new_id,v_prev.source_request_id,v_new_number,v_prev.customer_id,v_actor,
     v_prev.version_no+1,v_prev.id,v_prev.currency,v_prev.payment_terms,
     v_prev.delivery_terms,v_prev.incoterm,v_prev.lead_time,v_prev.validity_days,
     v_prev.shipping_cost,v_prev.discount_amount);
  INSERT INTO public.commercial_quote_items
    (quote_id,source_request_item_id,line_number,product_name,quantity,unit,
     specifications,moq_snapshot,packaging_snapshot,origin_snapshot,unit_price)
  SELECT v_new_id,i.source_request_item_id,i.line_number,i.product_name,i.quantity,
         i.unit,i.specifications,i.moq_snapshot,i.packaging_snapshot,i.origin_snapshot,i.unit_price
  FROM public.commercial_quote_items i WHERE i.quote_id=p_previous_quote_id;
  SELECT count(*) INTO v_count FROM public.commercial_quote_items i WHERE i.quote_id=v_new_id;
  IF v_count NOT BETWEEN 1 AND 20 OR v_count<>(
     SELECT count(*) FROM public.commercial_quote_items i WHERE i.quote_id=p_previous_quote_id
  ) THEN RAISE EXCEPTION 'Revision snapshot incomplete'; END IF;
  -- Repricing and reapproval are required even when prices are inherited for convenience.
  INSERT INTO public.commercial_quote_events(quote_id,actor_id,action,note)
    VALUES(v_new_id,v_actor,'revision_created','Based on ' || v_prev.quote_number);
  RETURN QUERY SELECT v_new_id,v_new_number;
END;$revision$;
REVOKE ALL ON FUNCTION public.create_commercial_quote_revision(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_commercial_quote_revision(uuid) TO authenticated;

-- Safe per-version projection with ownership checked for every request and every quote.
CREATE OR REPLACE FUNCTION public.get_customer_commercial_quote_version(p_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $customer$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_quote public.commercial_quote_drafts%ROWTYPE;
  v_items jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT q.* INTO v_quote FROM public.commercial_quote_drafts q
    JOIN public.lourex_customers c ON c.id=q.customer_id
    WHERE q.id=p_quote_id AND c.auth_user_id=v_actor
      AND q.status IN ('issued','accepted','changes_requested','declined');
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
     'lineNumber',i.line_number,'name',i.product_name,'quantity',i.quantity,
     'unit',i.unit,'specifications',i.specifications,'moq',i.moq_snapshot,
     'packaging',i.packaging_snapshot,'origin',i.origin_snapshot,'unitPrice',i.unit_price
    ) ORDER BY i.line_number),'[]'::jsonb)
  INTO v_items FROM public.commercial_quote_items i WHERE i.quote_id=p_quote_id;
  RETURN jsonb_build_object(
    'id',v_quote.id,'number',v_quote.quote_number,'requestId',v_quote.source_request_id,
    'versionNo',v_quote.version_no,'status',v_quote.status,'currency',v_quote.currency,
    'approvedAt',v_quote.approved_at,'issuedAt',v_quote.issued_at,
    'respondedAt',v_quote.customer_responded_at,'responseNote',v_quote.customer_response_note,
    'paymentTerms',v_quote.payment_terms,'deliveryTerms',v_quote.delivery_terms,
    'incoterm',v_quote.incoterm,'leadTime',v_quote.lead_time,
    'validityDays',v_quote.validity_days,'shippingCost',v_quote.shipping_cost,
    'discountAmount',v_quote.discount_amount,'items',v_items);
END;$customer$;

CREATE OR REPLACE FUNCTION public.get_customer_commercial_quote(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $latest$
DECLARE v_id uuid; v_actor uuid:=(SELECT auth.uid());
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT q.id INTO v_id FROM public.commercial_quote_drafts q
    JOIN public.lourex_customers c ON c.id=q.customer_id
    WHERE q.source_request_id=p_request_id AND c.auth_user_id=v_actor
    AND q.status IN ('issued','accepted','changes_requested','declined')
    ORDER BY q.version_no DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN NULL; END IF;
  RETURN public.get_customer_commercial_quote_version(v_id);
END;$latest$;

CREATE OR REPLACE FUNCTION public.get_customer_commercial_quote_versions(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $history$
DECLARE
  v_actor uuid:=(SELECT auth.uid());
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'number',q.quote_number,'versionNo',q.version_no,
    'status',q.status,'issuedAt',q.issued_at
  ) ORDER BY q.version_no DESC),'[]'::jsonb)
  INTO v_result FROM public.commercial_quote_drafts q
    JOIN public.lourex_customers c ON c.id=q.customer_id
    WHERE q.source_request_id=p_request_id AND c.auth_user_id=v_actor
      AND q.status IN ('issued','accepted','changes_requested','declined');
  RETURN v_result;
END;$history$;

REVOKE ALL ON FUNCTION public.get_customer_commercial_quote_version(uuid),
 public.get_customer_commercial_quote_versions(uuid),public.get_customer_commercial_quote(uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_commercial_quote_version(uuid),
 public.get_customer_commercial_quote_versions(uuid),public.get_customer_commercial_quote(uuid)
 TO authenticated;
