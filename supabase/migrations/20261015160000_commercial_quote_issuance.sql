-- LOUREX commercial quotations phase 3: authorization, customer delivery, response audit.
-- Existing internal pricing and supplier-facing quotes stay unchanged.
ALTER TABLE public.commercial_quote_drafts DROP CONSTRAINT IF EXISTS commercial_quote_drafts_status_check;
ALTER TABLE public.commercial_quote_drafts
  ADD CONSTRAINT commercial_quote_drafts_status_check
  CHECK (status IN ('draft','approved','issued','accepted','changes_requested','declined'));
ALTER TABLE public.commercial_quote_drafts
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN issued_at timestamptz,
  ADD COLUMN customer_responded_at timestamptz,
  ADD COLUMN customer_response_note text NOT NULL DEFAULT '' CHECK (length(customer_response_note)<=2000);

CREATE TABLE public.commercial_quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.commercial_quote_drafts(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved','issued','accepted','changes_requested','declined')),
  note text NOT NULL DEFAULT '' CHECK (length(note)<=2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commercial_quote_events_time_idx ON public.commercial_quote_events(quote_id,created_at);
ALTER TABLE public.commercial_quote_events ENABLE ROW LEVEL SECURITY;

-- Keep raw tables INTERNAL. Their columns include internal-only notes and audit identifiers.
-- Customers receive a minimal, hand-picked projection through a secured RPC.
CREATE POLICY "Authorized staff read quotation events"
  ON public.commercial_quote_events FOR SELECT TO authenticated
  USING (public.is_lourex_role((SELECT auth.uid()),ARRAY['owner','operations_employee']));
REVOKE ALL ON public.commercial_quote_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.commercial_quote_events TO authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_commercial_quote(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $customer_view$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_quote public.commercial_quote_drafts%ROWTYPE;
  v_lines jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  SELECT q.* INTO v_quote
  FROM public.commercial_quote_drafts q
  JOIN public.lourex_customers c ON c.id=q.customer_id
  WHERE q.source_request_id=p_request_id AND c.auth_user_id=v_actor
    AND q.status IN ('issued','accepted','changes_requested','declined');
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'lineNumber',i.line_number,'name',i.product_name,'quantity',i.quantity,
    'unit',i.unit,'specifications',i.specifications,
    'moq',i.moq_snapshot,'packaging',i.packaging_snapshot,
    'origin',i.origin_snapshot,'unitPrice',i.unit_price
  ) ORDER BY i.line_number),'[]'::jsonb)
  INTO v_lines
  FROM public.commercial_quote_items i WHERE i.quote_id=v_quote.id;
  RETURN jsonb_build_object(
    'id',v_quote.id,'number',v_quote.quote_number,'requestId',v_quote.source_request_id,
    'status',v_quote.status,'currency',v_quote.currency,
    'approvedAt',v_quote.approved_at,'issuedAt',v_quote.issued_at,
    'respondedAt',v_quote.customer_responded_at,
    'responseNote',v_quote.customer_response_note,
    'paymentTerms',v_quote.payment_terms,'deliveryTerms',v_quote.delivery_terms,
    'incoterm',v_quote.incoterm,'leadTime',v_quote.lead_time,
    'validityDays',v_quote.validity_days,'shippingCost',v_quote.shipping_cost,
    'discountAmount',v_quote.discount_amount,
    'items',v_lines
  );
END;$customer_view$;

CREATE OR REPLACE FUNCTION public.approve_commercial_quote(p_quote_id uuid)
RETURNS TABLE(quote_id uuid, quote_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $approval$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_quote public.commercial_quote_drafts%ROWTYPE;
  v_count integer;
  v_subtotal numeric;
BEGIN
  IF v_actor IS NULL OR NOT public.is_lourex_role(v_actor,ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only an active LOUREX owner can approve a quotation' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_quote FROM public.commercial_quote_drafts WHERE id=p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status<>'draft' THEN
    RAISE EXCEPTION 'Only a draft can be approved' USING ERRCODE='22023';
  END IF;
  IF btrim(v_quote.payment_terms)='' OR btrim(v_quote.delivery_terms)='' OR
     v_quote.last_priced_at IS NULL OR v_quote.last_priced_by IS NULL THEN
    RAISE EXCEPTION 'Complete and save payment and delivery terms before approval' USING ERRCODE='22023';
  END IF;
  SELECT count(*),coalesce(sum(quantity::numeric * unit_price),0)
    INTO v_count,v_subtotal
  FROM public.commercial_quote_items WHERE commercial_quote_items.quote_id=p_quote_id
    AND unit_price IS NOT NULL;
  IF v_count NOT BETWEEN 1 AND 20 OR v_count <> (
    SELECT count(*) FROM public.commercial_quote_items WHERE commercial_quote_items.quote_id=p_quote_id
  ) OR (v_subtotal+v_quote.shipping_cost-v_quote.discount_amount)<0 THEN
    RAISE EXCEPTION 'All items must be priced before approval' USING ERRCODE='22023';
  END IF;
  UPDATE public.commercial_quote_drafts SET status='approved',approved_by=v_actor,
    approved_at=now(),updated_at=now() WHERE id=p_quote_id;
  INSERT INTO public.commercial_quote_events(quote_id,actor_id,action)
    VALUES(p_quote_id,v_actor,'approved');
  RETURN QUERY SELECT p_quote_id,'approved'::text;
END;$approval$;

CREATE OR REPLACE FUNCTION public.issue_commercial_quote(p_quote_id uuid)
RETURNS TABLE(quote_id uuid, quote_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $issue$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_quote public.commercial_quote_drafts%ROWTYPE;
  v_customer_auth uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_lourex_role(v_actor,ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only an active LOUREX owner can issue quotations' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_quote FROM public.commercial_quote_drafts WHERE id=p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status<>'approved' OR v_quote.approved_by IS NULL THEN
    RAISE EXCEPTION 'Quotation must be approved before issuing' USING ERRCODE='22023';
  END IF;
  UPDATE public.commercial_quote_drafts SET status='issued',
    issued_by=v_actor,issued_at=now(),updated_at=now() WHERE id=p_quote_id;
  INSERT INTO public.commercial_quote_events(quote_id,actor_id,action)
    VALUES(p_quote_id,v_actor,'issued');
  SELECT auth_user_id INTO v_customer_auth FROM public.lourex_customers WHERE id=v_quote.customer_id;
  IF v_customer_auth IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,type,title,message,link)
      VALUES(v_customer_auth,'commercial_quote_issued','New LOUREX quotation',
        'Your commercial quotation ' || v_quote.quote_number || ' is ready for review.',
        '/customer-portal/requests?request=' || v_quote.source_request_id::text);
  END IF;
  RETURN QUERY SELECT p_quote_id,'issued'::text;
END;$issue$;

CREATE OR REPLACE FUNCTION public.respond_commercial_quote(
  p_quote_id uuid, p_action text, p_note text DEFAULT ''
)
RETURNS TABLE(quote_id uuid, quote_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET row_security=off AS $respond$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_quote public.commercial_quote_drafts%ROWTYPE;
  v_note text := btrim(coalesce(p_note,''));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF p_action NOT IN ('accepted','changes_requested','declined') OR length(v_note)>2000 THEN
    RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023';
  END IF;
  IF p_action='changes_requested' AND length(v_note)<5 THEN
    RAISE EXCEPTION 'Describe the requested changes' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_quote FROM public.commercial_quote_drafts WHERE id=p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status<>'issued' THEN
    RAISE EXCEPTION 'No issued quotation is awaiting your response' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lourex_customers c
    WHERE c.id=v_quote.customer_id AND c.auth_user_id=v_actor
  ) THEN
    RAISE EXCEPTION 'This quotation does not belong to your account' USING ERRCODE='42501';
  END IF;
  UPDATE public.commercial_quote_drafts
    SET status=p_action,customer_response_note=v_note,
        customer_responded_at=now(),updated_at=now() WHERE id=p_quote_id;
  INSERT INTO public.commercial_quote_events(quote_id,actor_id,action,note)
    VALUES(p_quote_id,v_actor,p_action,v_note);
  INSERT INTO public.notifications(user_id,type,title,message,link)
    SELECT p.id,'commercial_quote_response','Quotation response received',
      v_quote.quote_number || ' — ' || p_action, '/dashboard/requests'
    FROM public.profiles p
    WHERE p.role='owner' AND p.status='active';
  RETURN QUERY SELECT p_quote_id,p_action;
END;$respond$;

REVOKE ALL ON FUNCTION public.approve_commercial_quote(uuid),
  public.issue_commercial_quote(uuid),public.respond_commercial_quote(uuid,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_commercial_quote(uuid),
  public.issue_commercial_quote(uuid),public.respond_commercial_quote(uuid,text,text)
  TO authenticated;

-- No direct edits or approval/status bypass. All transitions are transactional.

REVOKE ALL ON FUNCTION public.get_customer_commercial_quote(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_commercial_quote(uuid) TO authenticated;
