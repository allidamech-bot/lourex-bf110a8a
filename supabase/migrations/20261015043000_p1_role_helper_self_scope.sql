-- P1: prevent cross-account role enumeration through exposed helper RPCs.
-- Existing RLS policies and protected database operations supply auth.uid().
-- Preserve their self-role checks and trusted service_role maintenance.
-- Do not revoke permissions wholesale: public tracking and RLS depend on
-- separately scoped functions. No rows are read or changed by this migration.

CREATE OR REPLACE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $role$
  SELECT
    _user_id IS NOT NULL
    AND (
      _user_id = (SELECT auth.uid())
      OR (SELECT auth.role()) = 'service_role'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.status = 'active'
        AND p.role = ANY(_roles)
    );
$role$;

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $role$
  SELECT
    p_user_id IS NOT NULL
    AND (
      p_user_id = (SELECT auth.uid())
      OR (SELECT auth.role()) = 'service_role'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_user_id
        AND p.status = 'active'
        AND p.role IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
    );
$role$;

-- Existing use in tracking RLS calls get_profile_role(auth.uid()).
-- Keep its text/NULL result and current-user behaviour without exposing
-- another account's role to any authenticated caller.
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $role$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      _user_id = (SELECT auth.uid())
      OR (SELECT auth.role()) = 'service_role'
    )
  LIMIT 1;
$role$;
