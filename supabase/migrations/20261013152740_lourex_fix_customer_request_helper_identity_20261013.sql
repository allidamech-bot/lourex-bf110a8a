-- Applied and verified on LOUREX Supabase gxmqchznfolerliorpkz.
-- Fix original customer ownership helper: purchase_requests.customer_id
-- references lourex_customers.id, not necessarily auth.users.id.
-- Preserve direct-ID legacy cases and require a verified auth.uid().
CREATE OR REPLACE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1
    FROM public.purchase_requests pr
    LEFT JOIN public.lourex_customers c ON c.id = pr.customer_id
    WHERE pr.id = p_request_id
      AND (
        pr.customer_id = auth.uid()
        OR c.auth_user_id = auth.uid()
      )
  ), false);
$$;

-- Avoid exposing a privileged ownership helper to unsigned callers;
-- authenticated users (and secured RLS checks) can still execute it.
REVOKE ALL ON FUNCTION public.customer_can_access_purchase_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_can_access_purchase_request(uuid) TO authenticated;
