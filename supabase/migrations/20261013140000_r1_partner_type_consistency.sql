-- R1: align the database CHECK constraint with the current application,
-- login mapper, owner/member settings and handle_new_user() trigger.
-- The original foundation migration required 'turkey', but subsequent code
-- and the privileged signup trigger consistently write 'turkish'.
--
-- Use 'turkish' as the canonical stored partner type. Keep the distinct
-- authorization role 'turkish_partner' unchanged.
--
-- Staging gate: verify no downstream integration requires the legacy value
-- before promoting to production.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_type_check;

-- Normalize historical values without touching user roles or identities.
UPDATE public.profiles
SET partner_type = CASE
  WHEN role = 'turkish_partner' THEN 'turkish'
  WHEN role = 'saudi_partner' THEN 'saudi'
  ELSE NULL
END
WHERE partner_type IS DISTINCT FROM CASE
  WHEN role = 'turkish_partner' THEN 'turkish'
  WHEN role = 'saudi_partner' THEN 'saudi'
  ELSE NULL
END;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN ('turkish', 'saudi'));

-- Role membership remains governed by active server-managed profiles and
-- privilege-escalation triggers; changing partner_type does not grant a role.
