-- Prevent client requests from enumerating arbitrary users' historical roles.
-- Existing RLS policies pass auth.uid() as _user_id.
-- Keep service_role inspection available to trusted server integrations.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $role$
  SELECT
    (
      _user_id IS NOT NULL
      AND (
        _user_id = (SELECT auth.uid())
        OR (SELECT auth.role()) = 'service_role'
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
      )
    );
$role$;

-- This helper is not referenced in the current RLS policy set or other
-- database functions, and anonymous callers always receive false.
-- Remove the unnecessary anonymous RPC exposure without affecting internal calls.
REVOKE EXECUTE ON FUNCTION public.can_read_lourex_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_lourex_profile(uuid) TO authenticated, service_role;
