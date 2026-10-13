-- R1: prevent customers from forging payment approval, reviews or operational state
-- through generic PostgREST PATCH requests. Staff retains current privileges;
-- SECURITY DEFINER workflows own their privileged updates.
CREATE OR REPLACE FUNCTION public.lourex_r1_guard_customer_request_updates()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=''
AS $function$
BEGIN
  -- PostgREST performs client mutations as 'authenticated'. Trusted
  -- SECURITY DEFINER workflows execute their UPDATE as their function owner.
  IF current_user <> 'authenticated'
     OR public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  THEN
    RETURN NEW;
  END IF;

  -- Explicit customer-writable fields. Everything else, including all
  -- future columns, is denied to unprivileged direct authenticated updates.
  IF (to_jsonb(NEW) - ARRAY[
      'full_name','phone','email','country','city',
      'product_name','product_description','quantity','size_dimensions',
      'color','material','technical_specs','reference_link',
      'preferred_shipping_method','delivery_notes','image_urls',
      'weight','manufacturing_country','brand','quality_level',
      'is_ready_made','has_previous_sample','expected_supply_date',
      'destination','delivery_address','is_full_sourcing',
      'customer_hidden_at','updated_at'
    ]::text[]) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY[
      'full_name','phone','email','country','city',
      'product_name','product_description','quantity','size_dimensions',
      'color','material','technical_specs','reference_link',
      'preferred_shipping_method','delivery_notes','image_urls',
      'weight','manufacturing_country','brand','quality_level',
      'is_ready_made','has_previous_sample','expected_supply_date',
      'destination','delivery_address','is_full_sourcing',
      'customer_hidden_at','updated_at'
    ]::text[])
  THEN
    RAISE EXCEPTION
      'CUSTOMER_FIELD_PROTECTED: payment, ownership and workflow fields cannot be edited directly'
      USING ERRCODE='42501';
  END IF;

  RETURN NEW;
END;
$function$;


-- Customer-created requests may retain an intake tracking reference for the
-- existing customer form, but cannot set payment/review/approval fields.
-- Customer-created requests must start unapproved. RLS checked their customer
-- ID but previously allowed any status and forged payment approval on INSERT.
CREATE OR REPLACE FUNCTION public.lourex_r1_guard_customer_request_inserts()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=''
AS $function$
BEGIN
  IF current_user='authenticated'
     AND NOT public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  THEN
    IF NEW.status IS DISTINCT FROM 'intake_submitted'
       OR NEW.converted_deal_id IS NOT NULL
       OR NEW.reviewed_by IS NOT NULL
       OR NEW.last_reviewed_at IS NOT NULL
       OR NEW.transfer_proof_status IS NOT NULL
       OR NEW.transfer_proof_url IS NOT NULL
       OR NEW.transfer_proof_name IS NOT NULL
       OR NEW.transfer_proof_uploaded_at IS NOT NULL
       OR NEW.transfer_accepted_at IS NOT NULL
       OR NEW.transfer_accepted_by IS NOT NULL
       OR NEW.transfer_rejection_reason IS NOT NULL
       OR btrim(COALESCE(NEW.internal_notes,'')) <> ''
    THEN
      RAISE EXCEPTION
        'CUSTOMER_INSERT_PROTECTED: new request cannot start with approved or managed fields'
        USING ERRCODE='42501';
    END IF;
    -- New customer requests receive authoritative server timestamps.
    NEW.created_at := now();
    NEW.submitted_at := now();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS lourex_r1_guard_customer_request_inserts ON public.purchase_requests;
CREATE TRIGGER lourex_r1_guard_customer_request_inserts
BEFORE INSERT ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.lourex_r1_guard_customer_request_inserts();
REVOKE ALL ON FUNCTION public.lourex_r1_guard_customer_request_inserts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lourex_r1_guard_customer_request_updates ON public.purchase_requests;
CREATE TRIGGER lourex_r1_guard_customer_request_updates
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.lourex_r1_guard_customer_request_updates();

REVOKE ALL ON FUNCTION public.lourex_r1_guard_customer_request_updates() FROM PUBLIC, anon, authenticated;

-- Customer clarification must change status and append the reply together.
-- A trusted, narrow RPC performs it; untrusted callers cannot replace internal notes.
CREATE OR REPLACE FUNCTION public.submit_purchase_request_clarification_reply(
 p_request_id uuid,
 p_message text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=''
SET row_security='off'
AS $function$
DECLARE
 v_actor uuid := auth.uid();
 v_reply text := btrim(COALESCE(p_message,''));
 v_request public.purchase_requests%rowtype;
 v_author text;
 v_block text;
BEGIN
 IF v_actor IS NULL OR NOT public.is_lourex_role(v_actor,ARRAY['customer']) THEN
   RAISE EXCEPTION 'Only an active customer may reply to clarification'
     USING ERRCODE='42501';
 END IF;
 IF length(v_reply)=0 OR length(v_reply)>4000 THEN
   RAISE EXCEPTION 'Clarification reply must contain 1 to 4000 characters'
     USING ERRCODE='22023';
 END IF;

 SELECT * INTO v_request
 FROM public.purchase_requests
 WHERE id=p_request_id FOR UPDATE;

 IF NOT FOUND OR v_request.status <> 'awaiting_clarification' THEN
   RAISE EXCEPTION 'Request not found or not waiting for clarification'
     USING ERRCODE='23514';
 END IF;

 SELECT COALESCE(NULLIF(btrim(c.full_name),''),'Customer') INTO v_author
 FROM public.lourex_customers c
 WHERE c.id=v_request.customer_id AND c.auth_user_id=v_actor;

 IF v_author IS NULL THEN
   RAISE EXCEPTION 'Request is not owned by the authenticated customer'
     USING ERRCODE='42501';
 END IF;

 v_block := '['||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
   ||'] Customer clarification reply - '||v_author|| E'\n'||v_reply;

 UPDATE public.purchase_requests
 SET status='under_review',
     internal_notes=concat_ws(E'\n\n---\n\n',
       NULLIF(btrim(COALESCE(v_request.internal_notes,'')),''),
       v_block),
     updated_at=now()
 WHERE id=p_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_purchase_request_clarification_reply(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_purchase_request_clarification_reply(uuid,text) TO authenticated;


-- Old cancel_purchase_request SECURITY DEFINER treated every partner as
-- "internal", allowing unassigned partners to cancel any customer request.
-- Only active owner/operations staff, or the verified owning customer, may
-- cancel. An arbitrary matching contact email does not confer ownership.
CREATE OR REPLACE FUNCTION public.cancel_purchase_request(
 p_request_id uuid,
 p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=''
SET row_security='off'
AS $function$
DECLARE
 v_actor uuid := auth.uid();
 v_is_staff boolean;
 v_is_customer boolean;
 v_request public.purchase_requests%rowtype;
BEGIN
 IF v_actor IS NULL THEN
   RAISE EXCEPTION 'Sign in before cancelling a request' USING ERRCODE='42501';
 END IF;
 v_is_staff := public.is_lourex_role(v_actor,ARRAY['owner','operations_employee']);
 v_is_customer := public.is_lourex_role(v_actor,ARRAY['customer']);
 IF NOT (v_is_staff OR v_is_customer) THEN
   RAISE EXCEPTION 'Role cannot cancel purchase requests' USING ERRCODE='42501';
 END IF;

 SELECT * INTO v_request FROM public.purchase_requests
 WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Purchase request was not found' USING ERRCODE='P0002';
 END IF;

 IF v_is_customer THEN
   IF v_request.status NOT IN ('intake_submitted','awaiting_clarification')
     OR NOT EXISTS (
       SELECT 1 FROM public.lourex_customers c
       WHERE c.id=v_request.customer_id AND c.auth_user_id=v_actor
     )
   THEN
     RAISE EXCEPTION 'Customer is not authorized to cancel this request'
       USING ERRCODE='42501';
   END IF;
 ELSIF v_request.status IN ('converted_to_deal','cancelled') THEN
   RAISE EXCEPTION 'This request cannot be cancelled in its current state'
     USING ERRCODE='23514';
 END IF;

 UPDATE public.purchase_requests
 SET status='cancelled',updated_at=now()
 WHERE id=p_request_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_purchase_request(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid,text) TO authenticated;
