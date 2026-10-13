-- R1 emergency profile privilege boundary for the confirmed LOUREX database.
-- No existing rows are changed; legitimate user-editable profile fields remain writable.
-- RLS on profiles_select_own/update_own remains in place.
--
-- Data API requests execute as authenticated; privileged server/trigger code runs
-- under its function owner, so existing trusted administration routines can continue.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'customer'
       OR NEW.partner_type IS NOT NULL
       OR NEW.status IS DISTINCT FROM 'active'
       OR NEW.verification_status IS DISTINCT FROM 'pending'
       OR NEW.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Profile role, account status and verification fields are server-managed.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Profile role, account status and verification fields are server-managed.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_privilege_fields_trigger ON public.profiles;

CREATE TRIGGER guard_profile_privilege_fields_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_privilege_fields();

REVOKE ALL ON FUNCTION public.guard_profile_privilege_fields() FROM PUBLIC, anon, authenticated;
