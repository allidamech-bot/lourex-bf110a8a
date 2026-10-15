-- Disposable PostgreSQL 17 integration test. Never run this fixture on production.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
GRANT USAGE ON SCHEMA public TO authenticated,anon;

CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL, status text NOT NULL);
CREATE TABLE public.lourex_customers (id uuid PRIMARY KEY, auth_user_id uuid REFERENCES auth.users(id));
CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 type text NOT NULL, title text NOT NULL, message text NOT NULL,
 is_read boolean NOT NULL DEFAULT false, link text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
CREATE TABLE public.purchase_requests (
 id uuid PRIMARY KEY,
 request_number text NOT NULL,
 customer_id uuid REFERENCES public.lourex_customers(id)
);
CREATE TABLE public.purchase_request_items (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES public.purchase_requests(id),
 line_number integer NOT NULL, product_name text NOT NULL, quantity integer NOT NULL,
 unit text NOT NULL DEFAULT '', specifications text NOT NULL DEFAULT '',
 moq_snapshot text NOT NULL DEFAULT '', packaging_snapshot text NOT NULL DEFAULT '',
 origin_snapshot text NOT NULL DEFAULT ''
);

-- Local role helper mirrors production's caller-scoped, active staff lookup.
CREATE FUNCTION public.is_lourex_role(who uuid, allowed text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT who IS NOT NULL AND who=(SELECT auth.uid())
 AND EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id=who AND p.role=ANY(allowed) AND p.status='active')
$$;
GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid,text[]) TO authenticated;

INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
INSERT INTO public.profiles VALUES
 ('00000000-0000-4000-8000-000000000001','owner','active'),
 ('00000000-0000-4000-8000-000000000002','customer','active'),
 ('00000000-0000-4000-8000-000000000003','operations_employee','active');
INSERT INTO public.lourex_customers VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002');
INSERT INTO public.purchase_requests VALUES
 ('00000000-0000-4000-8000-000000000100','RFQ-2026-ABC','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000101','REQ-2026-DEF','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000102','RFQ-2026-EMPTY','00000000-0000-4000-8000-000000000010');
INSERT INTO public.purchase_request_items
(id,request_id,line_number,product_name,quantity,unit,specifications,moq_snapshot,packaging_snapshot,origin_snapshot)
VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000100',1,'Sunflower Oil',100,'cartons','1L bottles','100 cartons','24 x 1L','Turkey'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000100',2,'Custom biscuits',50,'boxes','Private label','','','');

\ir ../migrations/20261015113000_commercial_quote_drafts.sql
\ir ../migrations/20261015143000_commercial_quote_pricing_terms.sql
\ir ../migrations/20261015160000_commercial_quote_issuance.sql
\ir ../migrations/20261015180000_commercial_quote_revisions.sql

DO $check$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_quote_drafts'::regclass)
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_quote_items'::regclass)
 THEN RAISE EXCEPTION 'Quote RLS not enabled'; END IF;
 IF has_function_privilege('anon','public.create_commercial_quote_draft(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous actors may create commercial quote drafts';
 END IF;
 IF NOT has_function_privilege('authenticated','public.create_commercial_quote_draft(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Authenticated staff missing quote RPC grant';
 END IF;
 IF has_table_privilege('authenticated','public.commercial_quote_drafts','INSERT')
 OR has_table_privilege('authenticated','public.commercial_quote_drafts','UPDATE')
 OR has_table_privilege('authenticated','public.commercial_quote_items','INSERT')
 OR has_table_privilege('authenticated','public.commercial_quote_items','UPDATE')
 THEN RAISE EXCEPTION 'Direct quote mutation must be denied'; END IF;
END $check$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

DO $check$
DECLARE first_id uuid; repeated_id uuid; number text;
BEGIN
 SELECT quote_id,quote_number INTO first_id,number
 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
 IF first_id IS NULL OR number NOT LIKE 'LQ-%' THEN
   RAISE EXCEPTION 'Quote receipt not saved';
 END IF;
 IF (SELECT count(*) FROM public.commercial_quote_items WHERE quote_id=first_id)<>2 THEN
   RAISE EXCEPTION 'Incomplete quote snapshot';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.commercial_quote_items
  WHERE quote_id=first_id AND line_number=1 AND product_name='Sunflower Oil'
  AND quantity=100 AND unit='cartons' AND specifications='1L bottles'
  AND moq_snapshot='100 cartons' AND origin_snapshot='Turkey'
  AND unit_price IS NULL
 ) THEN RAISE EXCEPTION 'First quote line snapshots/pricing incorrect'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.commercial_quote_items
  WHERE quote_id=first_id AND line_number=2 AND product_name='Custom biscuits'
    AND quantity=50 AND specifications='Private label' AND unit_price IS NULL
 ) THEN RAISE EXCEPTION 'Second quote line snapshots/pricing incorrect'; END IF;
 SELECT quote_id INTO repeated_id
 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
 IF repeated_id IS DISTINCT FROM first_id OR
   (SELECT count(*) FROM public.commercial_quote_drafts)<>1 OR
   (SELECT count(*) FROM public.commercial_quote_items)<>2
 THEN RAISE EXCEPTION 'Retry created duplicate quote/lines'; END IF;

 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000101');
  RAISE EXCEPTION 'LEGACY REQUEST ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='LEGACY REQUEST ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000102');
  RAISE EXCEPTION 'EMPTY SMART RFQ ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='EMPTY SMART RFQ ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000999');
  RAISE EXCEPTION 'MISSING REQUEST ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='MISSING REQUEST ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
END $check$;

-- Pricing is all-or-nothing; snapshots and contact associations must not change.
DO $pricing$
DECLARE
  q uuid;
  l1 uuid;
  l2 uuid;
  returned_id uuid;
  sub numeric;
  grand numeric;
  complete boolean;
BEGIN
  SELECT id INTO q FROM public.commercial_quote_drafts LIMIT 1;
  SELECT id INTO l1 FROM public.commercial_quote_items WHERE quote_id=q AND line_number=1;
  SELECT id INTO l2 FROM public.commercial_quote_items WHERE quote_id=q AND line_number=2;
  IF has_function_privilege('anon',
     'public.save_commercial_quote_draft(uuid,text,text,text,text,text,integer,numeric,numeric,text,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'Anonymous quote pricing RPC exposure'; END IF;
  IF has_table_privilege('authenticated','public.commercial_quote_items','UPDATE')
     OR has_table_privilege('authenticated','public.commercial_quote_drafts','UPDATE')
  THEN RAISE EXCEPTION 'Direct pricing write exposure'; END IF;

  SELECT quote_id,subtotal,total,fully_priced INTO returned_id,sub,grand,complete
  FROM public.save_commercial_quote_draft(q,'EUR','50% advance, 50% before delivery',
       'CIF customer port','CIF','4-6 weeks',30,50,12.50,'Internal review only',
       jsonb_build_array(
         jsonb_build_object('item_id',l1,'unit_price',12.5),
         jsonb_build_object('item_id',l2,'unit_price',3.25)));
  IF returned_id IS DISTINCT FROM q OR sub<>1412.50 OR grand<>1450.00 OR complete IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Commercial quotation totals were not calculated correctly';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_quote_drafts
    WHERE id=q AND currency='EUR' AND payment_terms='50% advance, 50% before delivery'
    AND shipping_cost=50 AND discount_amount=12.50 AND validity_days=30
    AND last_priced_by='00000000-0000-4000-8000-000000000001'::uuid
  ) THEN RAISE EXCEPTION 'Commercial terms were not persisted'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_quote_items
    WHERE id=l1 AND product_name='Sunflower Oil' AND quantity=100
      AND moq_snapshot='100 cartons' AND unit_price=12.5
  ) THEN RAISE EXCEPTION 'Original line snapshot modified during pricing'; END IF;

  -- Partial pricing must NOT fabricate a grand total.
  SELECT quote_id,subtotal,total,fully_priced INTO returned_id,sub,grand,complete
  FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,0,'',
       jsonb_build_array(
         jsonb_build_object('item_id',l1,'unit_price',null),
         jsonb_build_object('item_id',l2,'unit_price',3)));
  IF complete IS DISTINCT FROM false OR sub IS NOT NULL OR grand IS NOT NULL THEN
    RAISE EXCEPTION 'Partial price produced misleading totals';
  END IF;

  -- Return to complete quote; the following failure cases must preserve it.
  PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','Net 30','FOB origin',
     'FOB','1 week',15,0,0,'Reviewed',
     jsonb_build_array(
       jsonb_build_object('item_id',l1,'unit_price',10),
       jsonb_build_object('item_id',l2,'unit_price',2)));
  BEGIN
    PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,0,'',
      jsonb_build_array(
        jsonb_build_object('item_id',l1,'unit_price',11),
        jsonb_build_object('item_id',l1,'unit_price',12)));
    RAISE EXCEPTION 'DUPLICATE LINE ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='DUPLICATE LINE ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,0,'',
      jsonb_build_array(
        jsonb_build_object('item_id',l1,'unit_price',11),
        jsonb_build_object('item_id','00000000-0000-4000-8000-000000009999','unit_price',12)));
    RAISE EXCEPTION 'UNKNOWN LINE ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='UNKNOWN LINE ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,0,'',
      jsonb_build_array(
        jsonb_build_object('item_id',l1,'unit_price',-4),
        jsonb_build_object('item_id',l2,'unit_price',2)));
    RAISE EXCEPTION 'NEGATIVE PRICE ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='NEGATIVE PRICE ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,5000,'',
      jsonb_build_array(
        jsonb_build_object('item_id',l1,'unit_price',10),
        jsonb_build_object('item_id',l2,'unit_price',2)));
    RAISE EXCEPTION 'EXCESS DISCOUNT ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='EXCESS DISCOUNT ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_quote_items WHERE id=l1 AND unit_price=10
  ) OR NOT EXISTS (
    SELECT 1 FROM public.commercial_quote_drafts WHERE id=q AND currency='USD' AND payment_terms='Net 30'
  ) THEN RAISE EXCEPTION 'Invalid pricing changed saved quote data'; END IF;
END $pricing$;

-- Customer with known RFQ UUID cannot enumerate or create quote drafts.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $check$
BEGIN
 IF EXISTS (SELECT 1 FROM public.commercial_quote_drafts)
    OR EXISTS (SELECT 1 FROM public.commercial_quote_items) THEN
   RAISE EXCEPTION 'Quote draft contents leaked to a customer';
 END IF;
 BEGIN
  BEGIN
    PERFORM 1 FROM public.save_commercial_quote_draft(
      (SELECT id FROM public.commercial_quote_drafts LIMIT 1),
      'USD','','','','',30,0,0,'','[]'::jsonb);
    RAISE EXCEPTION 'CUSTOMER PRICED QUOTE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='CUSTOMER PRICED QUOTE' OR SQLSTATE<>'42501' THEN RAISE; END IF;
  END;
  PERFORM 1 FROM public.create_commercial_quote_draft('00000000-0000-4000-8000-000000000100');
  RAISE EXCEPTION 'CUSTOMER CREATED INTERNAL QUOTE';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='CUSTOMER CREATED INTERNAL QUOTE' OR SQLSTATE<>'42501' THEN RAISE; END IF;
 END;
END $check$;

-- An active staff member can read but not directly modify quote snapshots.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.commercial_quote_drafts)<>1
 OR (SELECT count(*) FROM public.commercial_quote_items)<>2 THEN
   RAISE EXCEPTION 'Active operations staff cannot review draft';
 END IF;
END $check$;
RESET ROLE;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.commercial_quote_drafts)<>1
 OR (SELECT count(*) FROM public.commercial_quote_items)<>2 THEN
   RAISE EXCEPTION 'Rejected operations left partial quote records';
 END IF;
END $check$;
-- Persist fixture UUID for deliberate RLS checks from the customer role.
SELECT set_config('quote.fixture.id',(SELECT id::text FROM public.commercial_quote_drafts LIMIT 1),true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
-- No customer can see private draft rows even with a known request id.
DO $approval$
DECLARE q uuid; owner_attempt jsonb; sub numeric; grand numeric; complete boolean;
BEGIN
 q := current_setting('quote.fixture.id')::uuid;
 IF (SELECT public.get_customer_commercial_quote('00000000-0000-4000-8000-000000000100')) IS NOT NULL
 THEN RAISE EXCEPTION 'Unissued quotation leaked to customer'; END IF;
 BEGIN
   PERFORM 1 FROM public.approve_commercial_quote(q);
   RAISE EXCEPTION 'CUSTOMER APPROVED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='CUSTOMER APPROVED' OR SQLSTATE<>'42501' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM 1 FROM public.issue_commercial_quote(q);
   RAISE EXCEPTION 'CUSTOMER ISSUED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='CUSTOMER ISSUED' OR SQLSTATE<>'42501' THEN RAISE; END IF;
 END;
END $approval$;
-- Approvals require an active owner (operations employees can still price).
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
DO $approvals$
DECLARE q uuid;
BEGIN
 q := current_setting('quote.fixture.id')::uuid;
 BEGIN
   PERFORM 1 FROM public.approve_commercial_quote(q);
   RAISE EXCEPTION 'OPERATIONS APPROVED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='OPERATIONS APPROVED' OR SQLSTATE<>'42501' THEN RAISE; END IF;
 END;
END $approvals$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $approvals$
DECLARE q uuid; l1 uuid; l2 uuid; subtotal numeric; total numeric; complete boolean;
BEGIN
 q := current_setting('quote.fixture.id')::uuid;
 SELECT id INTO l1 FROM public.commercial_quote_items WHERE quote_id=q AND line_number=1;
 SELECT id INTO l2 FROM public.commercial_quote_items WHERE quote_id=q AND line_number=2;
 -- Incomplete pricing cannot be approved.
 PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','30 days','CIF','CIF','2 weeks',30,10,0,'',
   jsonb_build_array(jsonb_build_object('item_id',l1,'unit_price',null),jsonb_build_object('item_id',l2,'unit_price',2)));
 BEGIN
   PERFORM 1 FROM public.approve_commercial_quote(q);
   RAISE EXCEPTION 'INCOMPLETE APPROVED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='INCOMPLETE APPROVED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 -- Valid commercial terms and full pricing.
 PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','Net 30','CIF Jeddah','CIF','2 weeks',30,50,0,'Internal secret',
   jsonb_build_array(jsonb_build_object('item_id',l1,'unit_price',10),jsonb_build_object('item_id',l2,'unit_price',2)));
 PERFORM 1 FROM public.approve_commercial_quote(q);
 IF (SELECT status FROM public.commercial_quote_drafts WHERE id=q)<>'approved'
 THEN RAISE EXCEPTION 'Approved state not persisted'; END IF;
 BEGIN
   PERFORM 1 FROM public.save_commercial_quote_draft(q,'USD','','','','',30,0,0,'',
     jsonb_build_array(jsonb_build_object('item_id',l1,'unit_price',12),jsonb_build_object('item_id',l2,'unit_price',5)));
   RAISE EXCEPTION 'APPROVED QUOTE REPRICED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='APPROVED QUOTE REPRICED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
 PERFORM 1 FROM public.issue_commercial_quote(q);
 IF (SELECT status FROM public.commercial_quote_drafts WHERE id=q)<>'issued'
 OR (SELECT count(*) FROM public.commercial_quote_events WHERE quote_id=q)<>2
 OR (SELECT count(*) FROM public.notifications WHERE user_id='00000000-0000-4000-8000-000000000002'::uuid)<>1
 THEN RAISE EXCEPTION 'Issuance notification/audit not persisted'; END IF;
 BEGIN
   PERFORM 1 FROM public.issue_commercial_quote(q);
   RAISE EXCEPTION 'DUPLICATE ISSUANCE ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='DUPLICATE ISSUANCE ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
END $approvals$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $customer$
DECLARE q uuid; safe jsonb;
BEGIN
 q := current_setting('quote.fixture.id')::uuid;
 -- Raw internal tables remain inaccessible.
 IF EXISTS(SELECT 1 FROM public.commercial_quote_drafts) OR
    EXISTS(SELECT 1 FROM public.commercial_quote_items) OR
    EXISTS(SELECT 1 FROM public.commercial_quote_events)
 THEN RAISE EXCEPTION 'Internal quotation tables leaked'; END IF;
 safe:=public.get_customer_commercial_quote('00000000-0000-4000-8000-000000000100');
 IF safe->>'status'<>'issued' OR jsonb_array_length(safe->'items')<>2 OR
    (safe ? 'internalNotes') OR (safe ? 'lastPricedBy') OR (safe ? 'createdBy')
 THEN RAISE EXCEPTION 'Customer-safe projection incomplete or contains secrets'; END IF;
 PERFORM 1 FROM public.respond_commercial_quote(q,'changes_requested','Please change delivery terms.');
 IF (SELECT status FROM public.commercial_quote_drafts WHERE id=q)<>'changes_requested'
 THEN RAISE EXCEPTION 'Customer response not persisted'; END IF;
 BEGIN
   PERFORM 1 FROM public.respond_commercial_quote(q,'accepted','');
   RAISE EXCEPTION 'DUPLICATE RESPONSE ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='DUPLICATE RESPONSE ACCEPTED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
 END;
END $customer$;

-- Revision permissions, retry idempotency, immutable old quote, and customer-safe history.
-- Previous test left one changes_requested quote and a logged-in customer.
DO $revision_security$
DECLARE old_quote uuid:=current_setting('quote.fixture.id')::uuid;
BEGIN
  BEGIN
    PERFORM 1 FROM public.create_commercial_quote_revision(old_quote);
    RAISE EXCEPTION 'CUSTOMER CREATED REVISION';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='CUSTOMER CREATED REVISION' OR SQLSTATE<>'42501' THEN RAISE; END IF;
  END;
  IF jsonb_array_length(public.get_customer_commercial_quote_versions('00000000-0000-4000-8000-000000000100'))<>1
  THEN RAISE EXCEPTION 'Customer history before revision invalid'; END IF;
  IF public.get_customer_commercial_quote_version('00000000-0000-4000-8000-000000000999'::uuid) IS NOT NULL
  THEN RAISE EXCEPTION 'Unrelated quote ID revealed'; END IF;
END;$revision_security$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $revisions$
DECLARE
  original uuid:=current_setting('quote.fixture.id')::uuid;
  created uuid;
  retry uuid;
  current_quote uuid;
  first_snapshot numeric;
  second_snapshot numeric;
  lines jsonb;
BEGIN
  SELECT unit_price INTO first_snapshot
    FROM public.commercial_quote_items WHERE quote_id=original AND line_number=1;
  SELECT quote_id INTO created FROM public.create_commercial_quote_revision(original);
  SELECT quote_id INTO retry FROM public.create_commercial_quote_revision(original);
  IF created IS NULL OR retry<>created OR created=original THEN
    RAISE EXCEPTION 'Revision retry created duplicate'; END IF;
  SELECT id INTO current_quote FROM public.commercial_quote_drafts
    WHERE source_request_id='00000000-0000-4000-8000-000000000100'
    ORDER BY version_no DESC LIMIT 1;
  IF current_quote<>created OR
    (SELECT count(*) FROM public.commercial_quote_drafts)<>2 OR
    (SELECT count(*) FROM public.commercial_quote_items WHERE quote_id=created)<>2 OR
    (SELECT version_no FROM public.commercial_quote_drafts WHERE id=created)<>2 OR
    (SELECT status FROM public.commercial_quote_drafts WHERE id=created)<>'draft' OR
    (SELECT status FROM public.commercial_quote_drafts WHERE id=original)<>'changes_requested'
  THEN RAISE EXCEPTION 'Revision chain or immutable previous quote incorrect'; END IF;
  IF (SELECT unit_price FROM public.commercial_quote_items
      WHERE quote_id=created AND line_number=1) IS DISTINCT FROM first_snapshot
  THEN RAISE EXCEPTION 'Prior unit price not inherited for review'; END IF;
  -- A revision needs fresh pricing confirmation even if prior amounts are copied.
  BEGIN
    PERFORM 1 FROM public.approve_commercial_quote(created);
    RAISE EXCEPTION 'UNPRICED REVISION APPROVED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='UNPRICED REVISION APPROVED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  SELECT jsonb_agg(jsonb_build_object('item_id',id,'unit_price',
             CASE WHEN line_number=1 THEN 25 ELSE 7 END) ORDER BY line_number)
    INTO lines FROM public.commercial_quote_items WHERE quote_id=created;
  PERFORM 1 FROM public.save_commercial_quote_draft(
    created,'EUR','Prepaid','CIF new destination','CIF','3 weeks',14,20,0,'internal rev note',lines);
  PERFORM 1 FROM public.approve_commercial_quote(created);
  PERFORM 1 FROM public.issue_commercial_quote(created);
  IF (SELECT unit_price FROM public.commercial_quote_items
      WHERE quote_id=original AND line_number=1) IS DISTINCT FROM first_snapshot
  THEN RAISE EXCEPTION 'Original quotation was mutated by revision pricing'; END IF;
  IF (SELECT count(*) FROM public.commercial_quote_events
      WHERE quote_id=created AND action IN ('revision_created','approved','issued'))<>3
  THEN RAISE EXCEPTION 'Revision audit incomplete'; END IF;
  PERFORM set_config('quote.revised.id',created::text,true);
END;$revisions$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $history$
DECLARE older uuid:=current_setting('quote.fixture.id')::uuid;
        newer uuid:=current_setting('quote.revised.id')::uuid;
        latest jsonb;
        olddoc jsonb;
        history jsonb;
BEGIN
  latest:=public.get_customer_commercial_quote('00000000-0000-4000-8000-000000000100');
  olddoc:=public.get_customer_commercial_quote_version(older);
  history:=public.get_customer_commercial_quote_versions('00000000-0000-4000-8000-000000000100');
  IF latest->>'id'<>newer::text OR (latest->>'versionNo')::integer<>2 OR
     olddoc->>'id'<>older::text OR (olddoc->>'versionNo')::integer<>1 OR
     jsonb_array_length(history)<>2
  THEN RAISE EXCEPTION 'Customer safe version history incorrect'; END IF;
  IF latest ? 'internalNotes' OR olddoc ? 'internalNotes' OR
     latest ? 'lastPricedBy' OR olddoc ? 'createdBy'
  THEN RAISE EXCEPTION 'Internal notes leaked in customer version history'; END IF;
  BEGIN
    PERFORM 1 FROM public.respond_commercial_quote(older,'accepted','');
    RAISE EXCEPTION 'SUPERSEDED QUOTE REPLIED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='SUPERSEDED QUOTE REPLIED' OR SQLSTATE<>'22023' THEN RAISE; END IF;
  END;
  PERFORM 1 FROM public.respond_commercial_quote(newer,'accepted','');
  IF (SELECT status FROM public.commercial_quote_drafts WHERE id=newer)<>'accepted'
  THEN RAISE EXCEPTION 'New version response failed'; END IF;
END;$history$;

ROLLBACK;
