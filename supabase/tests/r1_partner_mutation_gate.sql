-- Run ONLY against disposable, seeded staging. Transaction is rolled back.
-- Reuse the seeded -v actor/deal UUIDs from r1_assigned_roles_read_gate.sql:
-- psql -v ON_ERROR_STOP=1 -v turkish_uid=<uuid> -v saudi_uid=<uuid> \
--   -v foreign_deal=<uuid> -v foreign_shipment=<uuid> \
--   -f supabase/tests/r1_partner_mutation_gate.sql
--
-- Required fixture: foreign_deal and foreign_shipment must exist and must NOT
-- be assigned to either tested partner. Validate fixture as postgres before
-- running the scripts, because hidden rows cannot verify their own existence.
--
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('lourex.test.foreign_deal', :'foreign_deal', true);
SELECT set_config('lourex.test.foreign_shipment', :'foreign_shipment', true);

-- Ensure UPDATE does not silently affect any foreign deal or shipment.
SELECT set_config('request.jwt.claim.sub', :'turkish_uid', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'turkish_uid')::text, true);

DO $$
DECLARE v_changed bigint;
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'turkish_partner' THEN
    RAISE EXCEPTION 'Invalid Turkish partner test fixture';
  END IF;

  UPDATE public.deals
  SET operational_status = operational_status
  WHERE id = current_setting('lourex.test.foreign_deal')::uuid;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 0 THEN
    RAISE EXCEPTION 'R1 security failure: foreign deal UPDATE was accepted';
  END IF;

  UPDATE public.shipments
  SET customer_visible_note = customer_visible_note
  WHERE id = current_setting('lourex.test.foreign_shipment')::uuid;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 0 THEN
    RAISE EXCEPTION 'R1 security failure: foreign shipment UPDATE was accepted';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', :'saudi_uid', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'saudi_uid')::text, true);
DO $$
DECLARE v_changed bigint;
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'saudi_partner' THEN
    RAISE EXCEPTION 'Invalid Saudi partner test fixture';
  END IF;

  UPDATE public.deals
  SET operational_status = operational_status
  WHERE id = current_setting('lourex.test.foreign_deal')::uuid;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 0 THEN
    RAISE EXCEPTION 'R1 security failure: Saudi partner updated foreign deal';
  END IF;

  UPDATE public.shipments
  SET customer_visible_note = customer_visible_note
  WHERE id = current_setting('lourex.test.foreign_shipment')::uuid;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 0 THEN
    RAISE EXCEPTION 'R1 security failure: Saudi partner updated foreign shipment';
  END IF;
END;
$$;
ROLLBACK;
