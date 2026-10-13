-- Read-only *real RLS* smoke matrix for a seeded, disposable Supabase staging
-- clone. Run as a privileged psql operator able to SET ROLE authenticated.
-- All -v IDs MUST refer to real, ACTIVE profiles and actual deals on staging.
-- Use two deals NOT assigned to either other partner; ensure unassigned
-- deal has a shipment to test unauthorized tracking/shipment visibility.
--
-- psql -v ON_ERROR_STOP=1 -v turkish_uid=<uuid> -v saudi_uid=<uuid> \
--   -v owner_uid=<uuid> -v customer_uid=<uuid> \
--   -v turkish_deal=<uuid> -v saudi_deal=<uuid> \
--   -v customer_deal=<uuid> -v foreign_deal=<uuid> \
--   -f supabase/tests/r1_assigned_roles_read_gate.sql
--
-- Do not use production users. RLS catalog + unit tests alone are NOT enough.

BEGIN;
SET LOCAL ROLE authenticated;

-- Active Turkish partner can see the Turkish deal but never the foreign deal.
SELECT set_config('request.jwt.claim.sub', :'turkish_uid', true);
SELECT set_config('lourex.test.own_deal', :'turkish_deal', true);
SELECT set_config('lourex.test.foreign_deal', :'foreign_deal', true);
DO $$
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'turkish_partner' THEN
    RAISE EXCEPTION 'Test fixture role is not turkish_partner';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.own_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Turkish partner cannot read assigned deal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.foreign_deal')::uuid
  ) OR EXISTS (
    SELECT 1 FROM public.shipments
    WHERE deal_id = current_setting('lourex.test.foreign_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Turkish partner can read foreign commercial data';
  END IF;
END;
$$;

-- Saudi partner cannot see the Turkish deal or the foreign deal.
SELECT set_config('request.jwt.claim.sub', :'saudi_uid', true);
SELECT set_config('lourex.test.own_deal', :'saudi_deal', true);
SELECT set_config('lourex.test.foreign_deal', :'foreign_deal', true);
DO $$
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'saudi_partner' THEN
    RAISE EXCEPTION 'Test fixture role is not saudi_partner';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.own_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Saudi partner cannot read assigned deal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.foreign_deal')::uuid
  ) OR EXISTS (
    SELECT 1 FROM public.shipments
    WHERE deal_id = current_setting('lourex.test.foreign_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Saudi partner can read foreign commercial data';
  END IF;
END;
$$;

-- Customer must see their own linked deal, not foreign business data.
SELECT set_config('request.jwt.claim.sub', :'customer_uid', true);
SELECT set_config('lourex.test.own_deal', :'customer_deal', true);
DO $$
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Test fixture role is not customer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.own_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Customer cannot read own linked deal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.foreign_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Customer can read foreign deal';
  END IF;
END;
$$;

-- Company owner retains administrative visibility.
SELECT set_config('request.jwt.claim.sub', :'owner_uid', true);
DO $$
BEGIN
  IF public.current_lourex_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Test fixture role is not owner';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = current_setting('lourex.test.foreign_deal')::uuid
  ) THEN
    RAISE EXCEPTION 'Owner cannot read company deal';
  END IF;
END;
$$;

ROLLBACK;
