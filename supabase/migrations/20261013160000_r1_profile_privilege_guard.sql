-- R1: authoritative role and account-status boundary.
-- Existing profile rows remain unchanged.
-- OAuth/registered clients may edit nonprivileged fields on their own profile.
-- Active owners may administer account access, except disabling the final owner.
-- Nonuser service-side mutations (no auth.uid) retain trusted backend access.

-- Preserve legacy partner_type='turkey' while accepting the current
-- application canonical 'turkish'. No existing profile rows are rewritten.
-- Restrict this to the confirmed historical check constraint name.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_partner_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN ('turkey', 'turkish', 'saudi'))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_partner_type_check;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner boolean := false;
  v_active_other_owners integer;
BEGIN
  -- Even a service-privileged delete (e.g. auth.users ON DELETE CASCADE)
  -- must not remove the final active owner.
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' AND OLD.status = 'active' THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(62180, 20261013);
      SELECT count(*) INTO v_active_other_owners
      FROM public.profiles p
      WHERE p.role = 'owner' AND p.status = 'active' AND p.id <> OLD.id;

      IF v_active_other_owners < 1 THEN
        RAISE EXCEPTION 'Cannot delete the final active owner.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- Server-side signup and trusted maintenance may run without user JWT context.
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  v_owner := public.is_lourex_role(v_actor, ARRAY['owner']);

  IF TG_OP = 'INSERT' THEN
    IF NOT v_owner AND (
      NEW.role IS DISTINCT FROM 'customer'
      OR NEW.partner_type IS NOT NULL
      OR NEW.status IS DISTINCT FROM 'active'
      OR NEW.verification_status IS DISTINCT FROM 'pending'
      OR NEW.verified_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Profile role, status and verification are server-managed.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_owner AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    ) THEN
      RAISE EXCEPTION 'Profile role, status and verification are server-managed.'
        USING ERRCODE = '42501';
    END IF;

    -- Serialize active-owner removal/downgrade so concurrent updates cannot
    -- each observe another owner and collectively leave no active owner.
    IF OLD.role = 'owner'
      AND OLD.status = 'active'
      AND (NEW.role IS DISTINCT FROM 'owner' OR NEW.status IS DISTINCT FROM 'active')
    THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(62180, 20261013);
      SELECT count(*) INTO v_active_other_owners
      FROM public.profiles p
      WHERE p.role = 'owner' AND p.status = 'active' AND p.id <> OLD.id;

      IF v_active_other_owners < 1 THEN
        RAISE EXCEPTION 'Cannot disable or downgrade the final active owner.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_privilege_fields_trigger ON public.profiles;
CREATE TRIGGER guard_profile_privilege_fields_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_fields();

-- The owner must be able to view and update other account rows in order for
-- the existing Admin UI to function. Self-scoped policies remain unchanged.
DROP POLICY IF EXISTS "Active owner can view profiles" ON public.profiles;
CREATE POLICY "Active owner can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Active owner can manage profile access" ON public.profiles;
CREATE POLICY "Active owner can manage profile access" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner']))
  WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

-- Trigger functions are never general-purpose client RPC endpoints.
REVOKE ALL ON FUNCTION public.guard_profile_privilege_fields() FROM PUBLIC, anon, authenticated;
