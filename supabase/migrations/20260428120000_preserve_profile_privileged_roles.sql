-- Harden auth profile bootstrap so metadata/default roles are used only for brand-new profiles.
-- Existing access roles must not be overwritten by auth user_metadata such as requested_role=customer.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role text;
  v_partner_type text;
BEGIN
  v_requested_role := lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'customer'));

  IF v_requested_role NOT IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner', 'partner', 'customer') THEN
    v_requested_role := 'customer';
  END IF;

  v_partner_type := CASE
    WHEN v_requested_role = 'turkish_partner' THEN 'turkish'
    WHEN v_requested_role IN ('saudi_partner', 'partner') THEN 'saudi'
    ELSE NULL
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    partner_type,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    v_requested_role,
    v_partner_type,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    role = CASE
      WHEN NULLIF(public.profiles.role, '') IS NULL THEN EXCLUDED.role
      ELSE public.profiles.role
    END,
    partner_type = CASE
      WHEN NULLIF(public.profiles.partner_type, '') IS NULL
        AND NULLIF(public.profiles.role, '') IS NULL
      THEN EXCLUDED.partner_type
      ELSE public.profiles.partner_type
    END,
    status = COALESCE(public.profiles.status, EXCLUDED.status);

  RETURN NEW;
END;
$$;
