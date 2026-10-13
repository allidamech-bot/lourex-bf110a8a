-- R1 emergency hardening: authenticated customer identity is controlled by auth.users.
-- Compatible with the current LOUREX schema and the existing RPC argument signature.
-- Do NOT deploy until transactional PostgreSQL tests confirm allowed and denied flows.
CREATE OR REPLACE FUNCTION public.upsert_current_customer_record(
  p_full_name text,
  p_email text,
  p_phone text,
  p_country text,
  p_city text
)
RETURNS TABLE(customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_verified_email text;
  v_email_confirmed boolean;
  v_customer_id uuid;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  -- The p_email parameter is retained only for API compatibility.
  -- Never use client-supplied email to locate or claim an existing customer.
  SELECT NULLIF(lower(btrim(u.email)), ''),
         u.email_confirmed_at IS NOT NULL
    INTO v_verified_email, v_email_confirmed
  FROM auth.users AS u
  WHERE u.id = v_auth_user_id;

  IF v_verified_email IS NULL THEN
    RAISE EXCEPTION 'An authenticated email is required.';
  END IF;

  -- First resolve the customer's authoritative authentication link.
  SELECT c.id INTO v_customer_id
  FROM public.lourex_customers AS c
  WHERE c.auth_user_id = v_auth_user_id
  ORDER BY c.created_at DESC, c.id
  LIMIT 1
  FOR UPDATE;

  -- Claim an unlinked historical customer ONLY after verified email ownership.
  IF v_customer_id IS NULL AND v_email_confirmed THEN
    SELECT c.id INTO v_customer_id
    FROM public.lourex_customers AS c
    WHERE c.auth_user_id IS NULL
      AND lower(btrim(c.email)) = v_verified_email
    ORDER BY c.created_at DESC, c.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.lourex_customers (
      auth_user_id, full_name, email, phone, country, city, created_at, updated_at
    ) VALUES (
      v_auth_user_id,
      nullif(btrim(coalesce(p_full_name, '')), ''),
      v_verified_email,
      nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_country, '')), ''),
      nullif(btrim(coalesce(p_city, '')), ''),
      now(), now()
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.lourex_customers AS c
    SET
      auth_user_id = v_auth_user_id,
      full_name = coalesce(nullif(btrim(coalesce(p_full_name, '')), ''), c.full_name),
      email = v_verified_email,
      phone = coalesce(nullif(btrim(coalesce(p_phone, '')), ''), c.phone),
      country = coalesce(nullif(btrim(coalesce(p_country, '')), ''), c.country),
      city = coalesce(nullif(btrim(coalesce(p_city, '')), ''), c.city),
      updated_at = now()
    WHERE c.id = v_customer_id
      AND (c.auth_user_id IS NULL OR c.auth_user_id = v_auth_user_id)
    RETURNING c.id INTO v_customer_id;

    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'The customer record is not owned by this account.';
    END IF;
  END IF;

  RETURN QUERY SELECT v_customer_id;
END;
$function$;

-- Anonymous users could never successfully call the old authenticated RPC.
-- Remove the unnecessary anonymous execution permission.
REVOKE ALL ON FUNCTION public.upsert_current_customer_record(text,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_current_customer_record(text,text,text,text,text)
  TO authenticated;
