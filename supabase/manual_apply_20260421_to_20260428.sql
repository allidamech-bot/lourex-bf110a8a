-- Manual combined migration bundle: 20260421 through 20260428
-- Generated from local supabase/migrations files in strict filename order.
-- Review carefully before manual execution in Lovable Cloud / Supabase SQL editor.


-- ============================================================================
-- Original migration: 20260421023000_lourex_domain_hardening.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lourex_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text NOT NULL UNIQUE,
  country text DEFAULT '',
  city text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lourex_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view Lourex customers"
  ON public.lourex_customers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage Lourex customers"
  ON public.lourex_customers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL UNIQUE,
  source_inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.lourex_customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'intake_submitted' CHECK (
    status IN (
      'intake_submitted',
      'under_review',
      'awaiting_clarification',
      'ready_for_conversion',
      'converted_to_deal'
    )
  ),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text NOT NULL DEFAULT '',
  country text DEFAULT '',
  city text DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  product_description text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  size_dimensions text DEFAULT '',
  color text DEFAULT '',
  material text DEFAULT '',
  technical_specs text DEFAULT '',
  reference_link text DEFAULT '',
  preferred_shipping_method text DEFAULT '',
  delivery_notes text DEFAULT '',
  image_urls text[] NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit purchase requests"
  ON public.purchase_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view purchase requests"
  ON public.purchase_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update purchase requests"
  ON public.purchase_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.lourex_customers(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  scope text NOT NULL CHECK (scope IN ('deal_linked', 'global')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  note text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view financial entries"
  ON public.financial_entries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert financial entries"
  ON public.financial_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update unlocked financial entries"
  ON public.financial_entries
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND NOT locked)
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND NOT locked);

CREATE TABLE IF NOT EXISTS public.financial_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_entry_id uuid REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.lourex_customers(id) ON DELETE SET NULL,
  requested_by_name text NOT NULL DEFAULT '',
  requested_by_email text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view financial edit requests"
  ON public.financial_edit_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert financial edit requests"
  ON public.financial_edit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source_request_id uuid REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.lourex_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipment_id uuid,
  ADD COLUMN IF NOT EXISTS accounting_reference text DEFAULT '',
  ADD COLUMN IF NOT EXISTS operation_title text DEFAULT '';

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_stage_code text DEFAULT 'deal_accepted' CHECK (
    current_stage_code IN (
      'deal_accepted',
      'product_preparation',
      'transfer_to_port',
      'origin_port',
      'origin_customs',
      'departed_origin',
      'in_transit',
      'arrived_destination',
      'destination_customs',
      'transfer_to_warehouse',
      'delivered'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_shipment_id_fkey'
  ) THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_shipment_id_fkey
      FOREIGN KEY (shipment_id)
      REFERENCES public.shipments(id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.shipments
SET current_stage_code = CASE status
  WHEN 'factory' THEN 'product_preparation'
  WHEN 'warehouse' THEN 'transfer_to_warehouse'
  WHEN 'shipping' THEN 'in_transit'
  WHEN 'customs' THEN 'destination_customs'
  WHEN 'delivered' THEN 'delivered'
  ELSE 'deal_accepted'
END
WHERE current_stage_code IS NULL
   OR current_stage_code = 'deal_accepted';

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON public.purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_customer ON public.purchase_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_source_request_id ON public.deals(source_request_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON public.deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_deal_id ON public.shipments(deal_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_deal_id ON public.financial_entries(deal_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_customer_id ON public.financial_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_edit_requests_deal_id ON public.financial_edit_requests(deal_id);

CREATE OR REPLACE FUNCTION public.prevent_locked_financial_entry_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.locked THEN
    RAISE EXCEPTION 'Locked financial entries cannot be edited directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_financial_entry_update ON public.financial_entries;

CREATE TRIGGER prevent_locked_financial_entry_update
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_financial_entry_update();

DROP TRIGGER IF EXISTS update_lourex_customers_updated_at ON public.lourex_customers;
CREATE TRIGGER update_lourex_customers_updated_at
  BEFORE UPDATE ON public.lourex_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_requests_updated_at ON public.purchase_requests;
CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- Original migration: 20260421034500_lourex_domain_backfill.sql
-- ============================================================================

CREATE POLICY "Admins can update financial edit requests"
  ON public.financial_edit_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.extract_legacy_line(source text, label text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  match text[];
BEGIN
  IF source IS NULL OR source = '' THEN
    RETURN '';
  END IF;

  match := regexp_match(source, '(?:^|\n)' || regexp_replace(label, '([.^$|()\\[\\]{}*+?\\\\-])', '\\\1', 'g') || ':\s*([^\n]+)');

  IF match IS NULL OR array_length(match, 1) = 0 THEN
    RETURN '';
  END IF;

  RETURN btrim(match[1]);
END;
$$;

INSERT INTO public.lourex_customers (full_name, phone, email, country, city)
SELECT DISTINCT
  i.name,
  COALESCE(i.phone, ''),
  i.email,
  btrim(split_part(COALESCE(i.company, ''), '-', 1)),
  btrim(split_part(COALESCE(i.company, ''), '-', 2))
FROM public.inquiries i
WHERE i.inquiry_type = 'purchase_request'
  AND COALESCE(i.email, '') <> ''
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone = CASE WHEN COALESCE(EXCLUDED.phone, '') <> '' THEN EXCLUDED.phone ELSE public.lourex_customers.phone END,
  country = CASE WHEN COALESCE(EXCLUDED.country, '') <> '' THEN EXCLUDED.country ELSE public.lourex_customers.country END,
  city = CASE WHEN COALESCE(EXCLUDED.city, '') <> '' THEN EXCLUDED.city ELSE public.lourex_customers.city END;

INSERT INTO public.purchase_requests (
  request_number,
  source_inquiry_id,
  customer_id,
  status,
  full_name,
  phone,
  email,
  country,
  city,
  product_name,
  product_description,
  quantity,
  size_dimensions,
  color,
  material,
  technical_specs,
  reference_link,
  preferred_shipping_method,
  delivery_notes,
  image_urls,
  submitted_at,
  created_at,
  updated_at
)
SELECT
  COALESCE(NULLIF(public.extract_legacy_line(i.message, 'Request Number'), ''), 'PR-' || left(i.id::text, 8)),
  i.id,
  c.id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND (a.record_id = i.id::text OR a.new_values ->> 'request_id' = i.id::text)
    ) THEN 'converted_to_deal'
    ELSE 'under_review'
  END,
  i.name,
  COALESCE(i.phone, ''),
  i.email,
  btrim(split_part(COALESCE(i.company, ''), '-', 1)),
  btrim(split_part(COALESCE(i.company, ''), '-', 2)),
  public.extract_legacy_line(i.message, 'Product'),
  public.extract_legacy_line(i.message, 'Description'),
  GREATEST(COALESCE(NULLIF(public.extract_legacy_line(i.message, 'Quantity'), '')::integer, 1), 1),
  public.extract_legacy_line(i.message, 'Size/Dimensions'),
  public.extract_legacy_line(i.message, 'Color'),
  public.extract_legacy_line(i.message, 'Material'),
  public.extract_legacy_line(i.message, 'Technical Specs'),
  public.extract_legacy_line(i.message, 'Reference Link'),
  public.extract_legacy_line(i.message, 'Preferred Shipping Method'),
  public.extract_legacy_line(i.message, 'Delivery Notes'),
  CASE
    WHEN public.extract_legacy_line(i.message, 'Request Images') = '' OR public.extract_legacy_line(i.message, 'Request Images') = 'N/A' THEN ARRAY[]::text[]
    ELSE string_to_array(replace(public.extract_legacy_line(i.message, 'Request Images'), ', ', ','), ',')
  END,
  i.created_at,
  i.created_at,
  now()
FROM public.inquiries i
LEFT JOIN public.lourex_customers c ON c.email = i.email
WHERE i.inquiry_type = 'purchase_request'
  AND NOT EXISTS (
    SELECT 1 FROM public.purchase_requests pr WHERE pr.source_inquiry_id = i.id
  );

UPDATE public.deals d
SET
  source_request_id = COALESCE(
    d.source_request_id,
    (
      SELECT pr.id
      FROM public.purchase_requests pr
      WHERE pr.id = NULLIF(public.extract_legacy_line(d.notes, 'Source Request Id'), '')::uuid
      LIMIT 1
    ),
    (
      SELECT (a.new_values ->> 'request_id')::uuid
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND (
          a.new_values ->> 'deal_number' = d.deal_number OR
          a.new_values ->> 'deal_id' = d.id::text
        )
      ORDER BY a.created_at DESC
      LIMIT 1
    )
  ),
  customer_id = COALESCE(
    d.customer_id,
    (
      SELECT pr.customer_id
      FROM public.purchase_requests pr
      WHERE pr.id = NULLIF(public.extract_legacy_line(d.notes, 'Source Request Id'), '')::uuid
      LIMIT 1
    ),
    (
      SELECT pr.customer_id
      FROM public.purchase_requests pr
      WHERE pr.id = (
        SELECT (a.new_values ->> 'request_id')::uuid
        FROM public.audit_logs a
        WHERE a.action = 'purchase_request.converted_to_deal'
          AND (
            a.new_values ->> 'deal_number' = d.deal_number OR
            a.new_values ->> 'deal_id' = d.id::text
          )
        ORDER BY a.created_at DESC
        LIMIT 1
      )
      LIMIT 1
    ),
    (
      SELECT c.id
      FROM public.lourex_customers c
      WHERE c.email = public.extract_legacy_line(d.notes, 'Customer Email')
      LIMIT 1
    )
  ),
  operation_title = CASE
    WHEN COALESCE(d.operation_title, '') <> '' THEN d.operation_title
    ELSE COALESCE(
      NULLIF(public.extract_legacy_line(d.notes, 'Product'), ''),
      'طµظپظ‚ط© طھط´ط؛ظٹظ„ظٹط©'
    )
  END,
  accounting_reference = CASE
    WHEN COALESCE(d.accounting_reference, '') <> '' THEN d.accounting_reference
    ELSE 'ACC-' || d.deal_number
  END;

UPDATE public.shipments s
SET
  deal_id = COALESCE(
    s.deal_id,
    (
      SELECT d.id
      FROM public.deals d
      WHERE d.shipment_id = s.id
      LIMIT 1
    ),
    (
      SELECT (a.new_values ->> 'deal_id')::uuid
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND a.new_values ->> 'tracking_id' = s.tracking_id
      ORDER BY a.created_at DESC
      LIMIT 1
    )
  ),
  current_stage_code = CASE
    WHEN COALESCE(s.current_stage_code, '') <> '' THEN s.current_stage_code
    WHEN s.status = 'factory' THEN 'product_preparation'
    WHEN s.status = 'warehouse' THEN 'transfer_to_warehouse'
    WHEN s.status = 'shipping' THEN 'in_transit'
    WHEN s.status = 'customs' THEN 'destination_customs'
    WHEN s.status = 'delivered' THEN 'delivered'
    ELSE 'deal_accepted'
  END;

UPDATE public.deals d
SET shipment_id = COALESCE(d.shipment_id, s.id)
FROM public.shipments s
WHERE s.deal_id = d.id
  AND d.shipment_id IS NULL;

CREATE OR REPLACE FUNCTION public.backfill_lourex_domain()
RETURNS TABLE (
  customers_count bigint,
  purchase_requests_count bigint,
  linked_deals_count bigint,
  linked_shipments_count bigint
)
LANGUAGE sql
AS $$
  SELECT
    (SELECT count(*) FROM public.lourex_customers),
    (SELECT count(*) FROM public.purchase_requests),
    (SELECT count(*) FROM public.deals WHERE source_request_id IS NOT NULL OR customer_id IS NOT NULL),
    (SELECT count(*) FROM public.shipments WHERE deal_id IS NOT NULL);
$$;


-- ============================================================================
-- Original migration: 20260421123000_fix_public_purchase_request_upload_rls.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload purchase request product images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'purchase-requests'
);


-- ============================================================================
-- Original migration: 20260421150000_lourex_auth_rbac_foundation.sql
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS partner_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles p
SET email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

UPDATE public.profiles p
SET role = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = 'admin'::public.app_role
  ) THEN 'owner'
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = 'broker'::public.app_role
  ) THEN 'operations_employee'
  WHEN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role IN ('factory'::public.app_role, 'manufacturer'::public.app_role, 'seller'::public.app_role)
  ) THEN 'turkish_partner'
  ELSE 'customer'
END
WHERE role IS NULL
   OR role = 'customer'
   OR role IN ('admin', 'moderator', 'user', 'buyer', 'factory', 'broker', 'seller', 'manufacturer');

UPDATE public.profiles
SET partner_type = CASE
  WHEN role = 'turkish_partner' THEN 'turkey'
  WHEN role = 'saudi_partner' THEN 'saudi'
  ELSE NULL
END
WHERE partner_type IS NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'turkish_partner', 'saudi_partner', 'operations_employee', 'customer'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_type_check;

ALTER TABLE public.profiles
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT profiles_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN ('turkey', 'saudi'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    'customer',
    NULL,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role = ANY (_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_lourex_role(auth.uid(), ARRAY['owner']) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'You cannot change restricted profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Lourex users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

CREATE POLICY "Lourex users can insert own customer profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'customer'
  AND status = 'active'
);

CREATE POLICY "Lourex users can update own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
)
WITH CHECK (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);

DROP POLICY IF EXISTS "Admins can view Lourex customers" ON public.lourex_customers;
DROP POLICY IF EXISTS "Admins can manage Lourex customers" ON public.lourex_customers;

CREATE POLICY "Internal Lourex roles can view customers"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can manage customers"
ON public.lourex_customers
FOR ALL
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Admins can view purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Admins can update purchase requests" ON public.purchase_requests;

CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Admins can view financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can insert financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can update unlocked financial entries" ON public.financial_entries;

CREATE POLICY "Owner and operations can view financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can insert financial entries"
ON public.financial_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update unlocked financial entries"
ON public.financial_entries
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) AND NOT locked)
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) AND NOT locked);

DROP POLICY IF EXISTS "Admins can view financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can update financial edit requests" ON public.financial_edit_requests;

CREATE POLICY "Owner and operations can view financial edit requests"
ON public.financial_edit_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can insert financial edit requests"
ON public.financial_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update financial edit requests"
ON public.financial_edit_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Internal Lourex roles can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner'])
  AND changed_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;

CREATE POLICY "Internal Lourex roles can view shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can insert shipments"
ON public.shipments
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Internal Lourex roles can update shipments"
ON public.shipments
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner can delete shipments"
ON public.shipments
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

CREATE POLICY "Internal Lourex roles can view deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

CREATE POLICY "Owner and operations can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);


-- ============================================================================
-- Original migration: 20260421193000_lourex_business_completion.sql
-- ============================================================================

ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS internal_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS converted_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS assigned_turkish_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_saudi_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'awaiting_assignment',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_operational_status_check'
  ) THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_operational_status_check
      CHECK (
        operational_status IN (
          'awaiting_assignment',
          'partner_assigned',
          'sourcing',
          'origin_execution',
          'in_transit',
          'destination_execution',
          'delivered',
          'closed'
        )
      );
  END IF;
END $$;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_visible_note text NOT NULL DEFAULT '';

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS relation_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entry_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS counterparty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_label text NOT NULL DEFAULT '';

UPDATE public.financial_entries
SET relation_type = CASE
  WHEN deal_id IS NOT NULL THEN 'deal_linked'
  WHEN customer_id IS NOT NULL THEN 'customer_linked'
  ELSE 'general'
END
WHERE relation_type IS NULL
   OR relation_type = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_entries_relation_type_check'
  ) THEN
    ALTER TABLE public.financial_entries
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT financial_entries_relation_type_check
      CHECK (relation_type IN ('deal_linked', 'customer_linked', 'general'));
  END IF;
END $$;

ALTER TABLE public.financial_edit_requests
  ADD COLUMN IF NOT EXISTS old_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'reference',
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'product-images',
  storage_path text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'internal',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_entity_type_check'
  ) THEN
    ALTER TABLE public.attachments
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT attachments_entity_type_check
      CHECK (entity_type IN ('purchase_request', 'deal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_visibility_check'
  ) THEN
    ALTER TABLE public.attachments
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT attachments_visibility_check
      CHECK (visibility IN ('internal', 'customer_visible'));
  END IF;
END $$;

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can view operational profiles" ON public.profiles;
CREATE POLICY "Internal users can view operational profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner'])
  );

DROP POLICY IF EXISTS "Internal users can view attachments" ON public.attachments;
CREATE POLICY "Internal users can view attachments"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Internal users can manage attachments" ON public.attachments;
CREATE POLICY "Internal users can manage attachments"
  ON public.attachments
  FOR ALL
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']))
  WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Public purchase request attachments can be inserted" ON public.attachments;
CREATE POLICY "Public purchase request attachments can be inserted"
  ON public.attachments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (entity_type = 'purchase_request');

CREATE TABLE IF NOT EXISTS public.tracking_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  stage_code text NOT NULL,
  previous_stage_code text,
  note text NOT NULL DEFAULT '',
  customer_note text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'internal',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_stage_code_check'
  ) THEN
    ALTER TABLE public.tracking_updates
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT tracking_updates_stage_code_check
      CHECK (
        stage_code IN (
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'in_transit',
          'arrived_destination',
          'destination_customs',
          'transfer_to_warehouse',
          'delivered'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_previous_stage_code_check'
  ) THEN
    ALTER TABLE public.tracking_updates
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT tracking_updates_previous_stage_code_check
      CHECK (
        previous_stage_code IS NULL OR previous_stage_code IN (
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'in_transit',
          'arrived_destination',
          'destination_customs',
          'transfer_to_warehouse',
          'delivered'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracking_updates_visibility_check'
  ) THEN
    ALTER TABLE public.tracking_updates
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT tracking_updates_visibility_check
      CHECK (visibility IN ('internal', 'customer_visible'));
  END IF;
END $$;

ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lourex_stage_order(p_stage text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stage
    WHEN 'deal_accepted' THEN 1
    WHEN 'product_preparation' THEN 2
    WHEN 'transfer_to_port' THEN 3
    WHEN 'origin_port' THEN 4
    WHEN 'origin_customs' THEN 5
    WHEN 'departed_origin' THEN 6
    WHEN 'in_transit' THEN 7
    WHEN 'arrived_destination' THEN 8
    WHEN 'destination_customs' THEN 9
    WHEN 'transfer_to_warehouse' THEN 10
    WHEN 'delivered' THEN 11
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.validate_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_stage text;
  current_order integer;
  next_order integer;
BEGIN
  SELECT current_stage_code
  INTO current_stage
  FROM public.shipments
  WHERE id = NEW.shipment_id;

  current_order := public.lourex_stage_order(COALESCE(current_stage, 'deal_accepted'));
  next_order := public.lourex_stage_order(NEW.stage_code);

  IF NEW.previous_stage_code IS NULL THEN
    NEW.previous_stage_code := current_stage;
  END IF;

  IF next_order = 0 THEN
    RAISE EXCEPTION 'Unknown Lourex tracking stage';
  END IF;

  IF next_order < current_order OR next_order > current_order + 1 THEN
    RAISE EXCEPTION 'Tracking updates must follow the official Lourex stage sequence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.shipments
  SET current_stage_code = NEW.stage_code,
      customer_visible_note = CASE
        WHEN COALESCE(NEW.customer_note, '') <> '' THEN NEW.customer_note
        ELSE customer_visible_note
      END,
      updated_at = GREATEST(COALESCE(updated_at, now()), NEW.occurred_at)
  WHERE id = NEW.shipment_id;

  UPDATE public.deals
  SET updated_at = now(),
      operational_status = CASE
        WHEN NEW.stage_code IN ('product_preparation', 'transfer_to_port', 'origin_port', 'origin_customs', 'departed_origin') THEN 'origin_execution'
        WHEN NEW.stage_code IN ('in_transit') THEN 'in_transit'
        WHEN NEW.stage_code IN ('arrived_destination', 'destination_customs', 'transfer_to_warehouse') THEN 'destination_execution'
        WHEN NEW.stage_code = 'delivered' THEN 'delivered'
        ELSE operational_status
      END
  WHERE id = COALESCE(NEW.deal_id, (SELECT deal_id FROM public.shipments WHERE id = NEW.shipment_id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tracking_update ON public.tracking_updates;
CREATE TRIGGER validate_tracking_update
  BEFORE INSERT ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tracking_update();

DROP TRIGGER IF EXISTS apply_tracking_update ON public.tracking_updates;
CREATE TRIGGER apply_tracking_update
  AFTER INSERT ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_tracking_update();

DROP POLICY IF EXISTS "Internal users can view tracking updates" ON public.tracking_updates;
CREATE POLICY "Internal users can view tracking updates"
  ON public.tracking_updates
  FOR SELECT
  TO authenticated
  USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee', 'turkish_partner', 'saudi_partner']));

DROP POLICY IF EXISTS "Allowed partners can insert tracking updates" ON public.tracking_updates;
CREATE POLICY "Allowed partners can insert tracking updates"
  ON public.tracking_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']) OR
    (
      public.get_profile_role(auth.uid()) = 'turkish_partner' AND
      public.lourex_stage_order(stage_code) BETWEEN 1 AND 6
    ) OR
    (
      public.get_profile_role(auth.uid()) = 'saudi_partner' AND
      public.lourex_stage_order(stage_code) BETWEEN 7 AND 11
    )
  );

CREATE OR REPLACE FUNCTION public.log_purchase_request_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, old_values, new_values)
  VALUES (
    'purchase_request.submitted',
    'purchase_requests',
    NEW.id,
    NULL,
    NULL,
    jsonb_build_object(
      'request_id', NEW.id,
      'request_number', NEW.request_number,
      'customer_name', NEW.full_name,
      'customer_email', NEW.email,
      'summary', format('طھظ… ط§ط³طھظ„ط§ظ… ط·ظ„ط¨ ط§ظ„ط´ط±ط§ط، %s', NEW.request_number),
      'actor_label', 'Public Request',
      'entity_label', COALESCE(NULLIF(NEW.product_name, ''), NEW.request_number)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_purchase_request_submission ON public.purchase_requests;
CREATE TRIGGER log_purchase_request_submission
  AFTER INSERT ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_purchase_request_submission();

CREATE INDEX IF NOT EXISTS idx_purchase_requests_converted_deal_id ON public.purchase_requests(converted_deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_turkish_partner_id ON public.deals(assigned_turkish_partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_saudi_partner_id ON public.deals(assigned_saudi_partner_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_relation_type ON public.financial_entries(relation_type);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_shipment_id ON public.tracking_updates(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_deal_id ON public.tracking_updates(deal_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_occurred_at ON public.tracking_updates(occurred_at DESC);


-- ============================================================================
-- Original migration: 20260421213000_lourex_finalization_runtime.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
      AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Internal Lourex users can insert notifications" ON public.notifications;
CREATE POLICY "Internal Lourex users can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lourex_internal(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles recipient
      WHERE recipient.id = notifications.user_id
    )
  );

DROP POLICY IF EXISTS "Internal deal attachments can be uploaded" ON storage.objects;
CREATE POLICY "Internal deal attachments can be uploaded"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'deal-attachments'
    AND public.is_lourex_internal(auth.uid())
  );

DROP POLICY IF EXISTS "Internal deal attachments can be updated" ON storage.objects;
CREATE POLICY "Internal deal attachments can be updated"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'deal-attachments'
    AND public.is_lourex_internal(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'deal-attachments'
    AND public.is_lourex_internal(auth.uid())
  );

DROP POLICY IF EXISTS "Internal deal attachments can be deleted" ON storage.objects;
CREATE POLICY "Internal deal attachments can be deleted"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'deal-attachments'
    AND public.is_lourex_internal(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.lourex_report_summary(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'requests', COALESCE((
      SELECT COUNT(*)
      FROM public.purchase_requests
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'deals', COALESCE((
      SELECT COUNT(*)
      FROM public.deals
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'shipments', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
    ), 0),
    'customers', COALESCE((
      SELECT COUNT(*)
      FROM public.lourex_customers
    ), 0),
    'audits', COALESCE((
      SELECT COUNT(*)
      FROM public.audit_logs
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'linked_entries', COALESCE((
      SELECT COUNT(*)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND relation_type IN ('deal_linked', 'customer_linked')
    ), 0),
    'income', COALESCE((
      SELECT SUM(amount)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND type = 'income'
    ), 0),
    'expense', COALESCE((
      SELECT SUM(amount)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND type = 'expense'
    ), 0),
    'average_operation_value', COALESCE((
      SELECT AVG(COALESCE(total_value, 0))
      FROM public.deals
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'in_transit', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code = 'in_transit'
    ), 0),
    'destination', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code IN ('arrived_destination', 'destination_customs')
    ), 0),
    'delivered', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code = 'delivered'
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.lourex_report_top_customers(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer DEFAULT 4
)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  email text,
  requests_count bigint,
  deals_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    customer.id,
    customer.full_name,
    customer.email,
    COALESCE(request_counts.requests_count, 0) AS requests_count,
    COALESCE(deal_counts.deals_count, 0) AS deals_count
  FROM public.lourex_customers customer
  LEFT JOIN (
    SELECT purchase_requests.customer_id, COUNT(*) AS requests_count
    FROM public.purchase_requests
    WHERE purchase_requests.created_at BETWEEN p_start AND p_end
    GROUP BY purchase_requests.customer_id
  ) AS request_counts ON request_counts.customer_id = customer.id
  LEFT JOIN (
    SELECT deals.customer_id, COUNT(*) AS deals_count
    FROM public.deals
    WHERE deals.created_at BETWEEN p_start AND p_end
    GROUP BY deals.customer_id
  ) AS deal_counts ON deal_counts.customer_id = customer.id
  ORDER BY COALESCE(deal_counts.deals_count, 0) DESC, COALESCE(request_counts.requests_count, 0) DESC, customer.full_name
  LIMIT GREATEST(COALESCE(p_limit, 4), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.lourex_report_top_expense_categories(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer DEFAULT 4
)
RETURNS TABLE (
  category text,
  amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_lourex_internal(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(financial_entries.category, ''), 'ط؛ظٹط± ظ…طµظ†ظپ') AS category,
    COALESCE(SUM(financial_entries.amount), 0) AS amount
  FROM public.financial_entries
  WHERE financial_entries.created_at BETWEEN p_start AND p_end
    AND financial_entries.type = 'expense'
  GROUP BY COALESCE(NULLIF(financial_entries.category, ''), 'ط؛ظٹط± ظ…طµظ†ظپ')
  ORDER BY amount DESC, category
  LIMIT GREATEST(COALESCE(p_limit, 4), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lourex_report_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_report_top_customers(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lourex_report_top_expense_categories(timestamptz, timestamptz, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications(user_id, created_at DESC);


-- ============================================================================
-- Original migration: 20260422110000_lourex_rls_alignment_step7.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'operations_employee', 'saudi_partner')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_lourex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_requests
    WHERE id = p_request_id
      AND customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_deal(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals
    WHERE id = p_deal_id
      AND customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_shipment(p_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.deals d ON d.id = s.deal_id
    WHERE s.id = p_shipment_id
      AND d.customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_tracking_update(p_tracking_update_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tracking_updates tu
    JOIN public.shipments s ON s.id = tu.shipment_id
    JOIN public.deals d ON d.id = s.deal_id
    WHERE tu.id = p_tracking_update_id
      AND tu.visibility = 'customer_visible'
      AND d.customer_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_financial_entry(p_financial_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_entries fe
    LEFT JOIN public.deals d ON d.id = fe.deal_id
    WHERE fe.id = p_financial_entry_id
      AND (
        fe.customer_id = auth.uid()
        OR d.customer_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_attachment(p_attachment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attachments a
    LEFT JOIN public.purchase_requests pr
      ON a.entity_type = 'purchase_request'
     AND pr.id = a.entity_id
    LEFT JOIN public.deals d
      ON a.entity_type = 'deal'
     AND d.id = a.entity_id
    WHERE a.id = p_attachment_id
      AND a.visibility = 'customer_visible'
      AND (
        pr.customer_id = auth.uid()
        OR d.customer_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_lourex_customer_record(
  p_customer_user_id uuid,
  p_email text,
  p_full_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_country text DEFAULT '',
  p_city text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_duplicate public.lourex_customers%ROWTYPE;
BEGIN
  IF p_customer_user_id IS NULL THEN
    RAISE EXCEPTION 'Customer user id is required';
  END IF;

  IF COALESCE(btrim(p_email), '') = '' THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  SELECT id
  INTO v_existing_id
  FROM public.lourex_customers
  WHERE id = p_customer_user_id
  LIMIT 1;

  SELECT *
  INTO v_duplicate
  FROM public.lourex_customers
  WHERE lower(email) = lower(p_email)
    AND id <> p_customer_user_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.lourex_customers (
      id,
      full_name,
      phone,
      email,
      country,
      city
    )
    VALUES (
      p_customer_user_id,
      COALESCE(NULLIF(p_full_name, ''), v_duplicate.full_name, ''),
      COALESCE(NULLIF(p_phone, ''), v_duplicate.phone, ''),
      CASE
        WHEN v_duplicate.id IS NOT NULL THEN format('__migrating__%s', p_customer_user_id)
        ELSE p_email
      END,
      COALESCE(NULLIF(p_country, ''), v_duplicate.country, ''),
      COALESCE(NULLIF(p_city, ''), v_duplicate.city, '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      updated_at = now();
  ELSE
    UPDATE public.lourex_customers
    SET
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
      phone = COALESCE(p_phone, ''),
      email = p_email,
      country = COALESCE(p_country, ''),
      city = COALESCE(p_city, ''),
      updated_at = now()
    WHERE id = p_customer_user_id;
  END IF;

  IF v_duplicate.id IS NOT NULL THEN
    UPDATE public.purchase_requests
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.deals
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.financial_entries
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    UPDATE public.financial_edit_requests
    SET customer_id = p_customer_user_id
    WHERE customer_id = v_duplicate.id;

    DELETE FROM public.lourex_customers
    WHERE id = v_duplicate.id;
  END IF;

  UPDATE public.lourex_customers
  SET
    email = p_email,
    full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
    phone = COALESCE(NULLIF(p_phone, ''), phone),
    country = COALESCE(NULLIF(p_country, ''), country),
    city = COALESCE(NULLIF(p_city, ''), city),
    updated_at = now()
  WHERE id = p_customer_user_id;

  RETURN p_customer_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_lourex_customer_record(uuid, text, text, text, text, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.upsert_current_customer_record(
  p_full_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_country text DEFAULT '',
  p_city text DEFAULT ''
)
RETURNS TABLE (customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.current_lourex_role() IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Only customers can upsert their customer record';
  END IF;

  RETURN QUERY
  SELECT public.upsert_lourex_customer_record(
    auth.uid(),
    p_email,
    p_full_name,
    p_phone,
    p_country,
    p_city
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_current_customer_record(text, text, text, text, text) TO authenticated;

UPDATE public.purchase_requests pr
SET customer_id = p.id
FROM public.profiles p
WHERE p.role = 'customer'
  AND p.status = 'active'
  AND COALESCE(pr.customer_id::text, '') = ''
  AND COALESCE(pr.email, '') <> ''
  AND lower(pr.email) = lower(p.email);

UPDATE public.deals d
SET customer_id = pr.customer_id
FROM public.purchase_requests pr
WHERE d.customer_id IS NULL
  AND d.source_request_id = pr.id
  AND pr.customer_id IS NOT NULL;

UPDATE public.financial_entries fe
SET customer_id = d.customer_id
FROM public.deals d
WHERE fe.customer_id IS NULL
  AND fe.deal_id = d.id
  AND d.customer_id IS NOT NULL;

UPDATE public.financial_edit_requests fer
SET customer_id = COALESCE(fer.customer_id, fe.customer_id, d.customer_id)
FROM public.financial_entries fe
LEFT JOIN public.deals d ON d.id = fe.deal_id
WHERE fer.financial_entry_id = fe.id
  AND COALESCE(fer.customer_id, fe.customer_id, d.customer_id) IS NOT NULL;

DO $$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN
    SELECT id, email, full_name
    FROM public.profiles
    WHERE role = 'customer'
      AND status = 'active'
      AND COALESCE(email, '') <> ''
  LOOP
    PERFORM public.upsert_lourex_customer_record(
      v_profile.id,
      v_profile.email,
      COALESCE(v_profile.full_name, ''),
      '',
      '',
      ''
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.lookup_lourex_tracking(p_tracking_id text)
RETURNS TABLE (
  tracking_id text,
  destination text,
  client_name text,
  current_stage_code text,
  customer_note text,
  last_updated timestamptz,
  deal_number text,
  request_number text,
  operation_title text,
  timeline jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.tracking_id,
    s.destination,
    s.client_name,
    COALESCE(s.current_stage_code, 'deal_accepted') AS current_stage_code,
    COALESCE(
      NULLIF(s.customer_visible_note, ''),
      (
        SELECT tu.customer_note
        FROM public.tracking_updates tu
        WHERE tu.shipment_id = s.id
          AND tu.visibility = 'customer_visible'
        ORDER BY COALESCE(tu.occurred_at, tu.created_at) DESC, tu.created_at DESC
        LIMIT 1
      ),
      ''
    ) AS customer_note,
    s.updated_at AS last_updated,
    d.deal_number,
    pr.request_number,
    COALESCE(NULLIF(d.operation_title, ''), NULLIF(pr.product_name, ''), 'ط¹ظ…ظ„ظٹط© Lourex') AS operation_title,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', tu.id,
            'shipmentId', tu.shipment_id,
            'dealId', tu.deal_id,
            'stageCode', tu.stage_code,
            'previousStageCode', tu.previous_stage_code,
            'note', tu.note,
            'customerNote', tu.customer_note,
            'visibility', tu.visibility,
            'updatedBy', tu.updated_by,
            'updatedByRole', tu.updated_by_role,
            'occurredAt', COALESCE(tu.occurred_at, tu.created_at),
            'createdAt', tu.created_at
          )
          ORDER BY COALESCE(tu.occurred_at, tu.created_at), tu.created_at
        )
        FROM public.tracking_updates tu
        WHERE tu.shipment_id = s.id
          AND tu.visibility = 'customer_visible'
      ),
      '[]'::jsonb
    ) AS timeline
  FROM public.shipments s
  LEFT JOIN public.deals d ON d.id = s.deal_id
  LEFT JOIN public.purchase_requests pr ON pr.id = d.source_request_id
  WHERE upper(s.tracking_id) = upper(p_tracking_id)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_lourex_tracking(text) TO anon, authenticated;

DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles',
    'purchase_requests',
    'lourex_customers',
    'deals',
    'shipments',
    'tracking_updates',
    'financial_entries',
    'financial_edit_requests',
    'attachments',
    'audit_logs',
    'notifications'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_table);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lourex_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lourex users can read allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_internal(auth.uid())
);

CREATE POLICY "Lourex users can insert own customer profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'customer'
  AND status = 'active'
);

CREATE POLICY "Lourex users can update own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
)
WITH CHECK (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);

CREATE POLICY "Internal Lourex roles can view customers"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer record"
ON public.lourex_customers
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Owner and operations can manage customers"
ON public.lourex_customers
FOR ALL
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Internal Lourex roles can insert purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

CREATE POLICY "Owner and operations can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can view shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_shipment(id)
);

CREATE POLICY "Internal Lourex roles can insert shipments"
ON public.shipments
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can update shipments"
ON public.shipments
FOR UPDATE
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Owner can delete shipments"
ON public.shipments
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

CREATE POLICY "Internal Lourex roles can view tracking updates"
ON public.tracking_updates
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer-visible tracking updates"
ON public.tracking_updates
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_tracking_update(id)
);

CREATE POLICY "Owner and operations can insert tracking updates"
ON public.tracking_updates
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Saudi partner can insert destination tracking updates"
ON public.tracking_updates
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'saudi_partner'
  AND public.lourex_stage_order(stage_code) BETWEEN 7 AND 11
);

CREATE POLICY "Owner and operations can update tracking updates"
ON public.tracking_updates
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can view financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Customers can view own financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_financial_entry(id)
);

CREATE POLICY "Owner and operations can insert financial entries"
ON public.financial_entries
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update unlocked financial entries"
ON public.financial_entries
FOR UPDATE
TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  AND NOT locked
)
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
  AND NOT locked
);

CREATE POLICY "Owner and operations can view financial edit requests"
ON public.financial_edit_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can insert financial edit requests"
ON public.financial_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Owner and operations can update financial edit requests"
ON public.financial_edit_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

CREATE POLICY "Internal Lourex roles can view attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can view own customer-visible attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND public.customer_can_access_attachment(id)
);

CREATE POLICY "Internal Lourex roles can manage attachments"
ON public.attachments
FOR ALL
TO authenticated
USING (public.is_lourex_internal(auth.uid()))
WITH CHECK (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Customers can insert own purchase request attachments"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND entity_type = 'purchase_request'
  AND public.customer_can_access_purchase_request(entity_id)
);

CREATE POLICY "Internal Lourex roles can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

CREATE POLICY "Internal Lourex roles can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_internal(auth.uid())
  AND changed_by = auth.uid()
);

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Internal Lourex users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lourex_internal(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles recipient
    WHERE recipient.id = notifications.user_id
  )
);


-- ============================================================================
-- Original migration: 20260424000000_customer_cancellation_fix.sql
-- ============================================================================

-- Fix purchase_requests status check constraint to include 'cancelled'
ALTER TABLE public.purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT purchase_requests_status_check
  CHECK (
    status IN (
      'intake_submitted',
      'under_review',
      'awaiting_clarification',
      'ready_for_conversion',
      'converted_to_deal',
      'cancelled'
    )
  );

-- Remove broad customer UPDATE policy if it exists
DROP POLICY IF EXISTS "Customers can update own purchase requests to cancelled" ON public.purchase_requests;

-- Security definer RPC for safe cancellation
-- This is the ONLY path for customers to cancel their own requests.
CREATE OR REPLACE FUNCTION public.cancel_purchase_request(p_request_id uuid, p_reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal boolean;
  v_user_id uuid;
BEGIN
  -- 1. Validate auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_internal := public.is_lourex_internal(v_user_id);

  -- 2. Perform the update with strict visibility/state checks
  UPDATE public.purchase_requests
  SET 
    status = 'cancelled',
    updated_at = now()
    -- p_reason is ignored for now as no dedicated column exists and 
    -- we MUST NOT write customer-provided reason into internal_notes.
  WHERE id = p_request_id
    AND (
      -- Internal roles can cancel any non-converted request
      (v_is_internal AND status <> 'converted_to_deal')
      OR (
        -- Customers can only cancel their own if in submission/clarification phase
        public.current_lourex_role() = 'customer'
        AND customer_id = v_user_id
        AND status IN ('intake_submitted', 'awaiting_clarification')
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled in its current state';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid, text) TO authenticated;


-- ============================================================================
-- Original migration: 20260425000000_customer_archiving_support.sql
-- ============================================================================

-- Migration to add customer archiving support to purchase_requests
-- This allows customers to "remove" requests from their list without hard-deleting operational data.

ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS customer_hidden_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.purchase_requests.customer_hidden_at IS 'Timestamp when the customer chose to hide this request from their portal view.';

-- Update the load_purchase_requests logic if it's an RPC, 
-- but usually we filter in the application layer or via RLS.
-- For this project, we'll handle the filtering in the application layer 
-- to ensure backward compatibility with existing internal dashboards.


-- ============================================================================
-- Original migration: 20260425160000_transfer_proof_workflow.sql
-- ============================================================================

-- Migration: 20260425160000_transfer_proof_workflow.sql
-- Description: Adds transfer proof fields to purchase_requests.

ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT,
ADD COLUMN IF NOT EXISTS transfer_proof_name TEXT,
ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_proof_status TEXT CHECK (transfer_proof_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS transfer_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_accepted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS transfer_rejection_reason TEXT;


-- ============================================================================
-- Original migration: 20260426090000_harden_write_rls_policies.sql
-- ============================================================================

-- Harden write RLS policies so no effective INSERT/UPDATE/DELETE policy is unrestricted.

DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
CREATE POLICY "Public can submit validated inquiries"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 1 AND 200
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(COALESCE(phone, '')) <= 30
  AND length(COALESCE(company, '')) <= 200
  AND length(COALESCE(message, '')) <= 2000
  AND length(COALESCE(inquiry_type, 'general')) <= 50
  AND length(COALESCE(factory_name, '')) <= 200
);

DROP POLICY IF EXISTS "Anyone can submit factory applications" ON public.factory_applications;
DROP POLICY IF EXISTS "Authenticated users can submit own applications" ON public.factory_applications;
CREATE POLICY "Authenticated users can submit own applications"
ON public.factory_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(btrim(company_name)) > 0
  AND length(btrim(contact_name)) > 0
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(btrim(cr_number)) > 0
  AND length(btrim(tax_id)) > 0
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

DROP POLICY IF EXISTS "Anyone can submit purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can update own purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
)
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_is_owner boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  )
  INTO v_actor_is_owner;

  IF NOT v_actor_is_owner
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    )
  THEN
    RAISE EXCEPTION 'Only active owners can change profile access fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_self_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_self_escalation();

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        lower(btrim(COALESCE(qual, ''))) = 'true'
        OR lower(btrim(COALESCE(with_check, ''))) = 'true'
      )
  LOOP
    RAISE EXCEPTION 'Unsafe write RLS policy remains: %.% policy "%" command %',
      v_policy.schemaname,
      v_policy.tablename,
      v_policy.policyname,
      v_policy.cmd;
  END LOOP;
END $$;


-- ============================================================================
-- Original migration: 20260426100000_restore_customer_rls_flows.sql
-- ============================================================================

-- Restore authenticated customer RLS flows after write-policy hardening.
-- Keep writes ownership/role scoped and keep helper functions out of profile RLS recursion.

CREATE OR REPLACE FUNCTION public.is_lourex_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role = ANY (_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lourex_internal(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_lourex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_lourex_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT auth.uid() = p_profile_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
    )
$$;

CREATE OR REPLACE FUNCTION public.customer_can_access_purchase_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_requests
    WHERE id = p_request_id
      AND customer_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_lourex_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lourex_internal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_lourex_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_lourex_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_can_access_purchase_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND NOT public.is_lourex_role(auth.uid(), ARRAY['owner'])
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    )
  THEN
    RAISE EXCEPTION 'Only active owners can change profile access fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Lourex users can read allowed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Lourex users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Internal users can view operational profiles" ON public.profiles;
CREATE POLICY "Lourex users can read allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_read_lourex_profile(id));

DROP POLICY IF EXISTS "Lourex users can insert own customer profile" ON public.profiles;
CREATE POLICY "Lourex users can insert own customer profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'customer'
  AND status = 'active'
);

DROP POLICY IF EXISTS "Lourex users can update own safe profile fields" ON public.profiles;
CREATE POLICY "Lourex users can update own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
)
WITH CHECK (
  auth.uid() = id
  OR public.is_lourex_role(auth.uid(), ARRAY['owner'])
);

DROP POLICY IF EXISTS "Internal Lourex roles can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Internal Lourex roles can view purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Customers can view own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can view own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DROP POLICY IF EXISTS "Internal Lourex roles can insert purchase requests" ON public.purchase_requests;
CREATE POLICY "Internal Lourex roles can insert purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_internal(auth.uid()));

DROP POLICY IF EXISTS "Customers can insert own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DROP POLICY IF EXISTS "Owner and operations can update purchase requests" ON public.purchase_requests;
CREATE POLICY "Owner and operations can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can update own purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
)
WITH CHECK (
  customer_id = auth.uid()
  AND public.current_lourex_role() = 'customer'
);

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        lower(btrim(COALESCE(qual, ''))) = 'true'
        OR lower(btrim(COALESCE(with_check, ''))) = 'true'
      )
  LOOP
    RAISE EXCEPTION 'Unsafe write RLS policy remains: %.% policy "%" command %',
      v_policy.schemaname,
      v_policy.tablename,
      v_policy.policyname,
      v_policy.cmd;
  END LOOP;
END $$;


-- ============================================================================
-- Original migration: 20260428120000_preserve_profile_privileged_roles.sql
-- ============================================================================

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


-- ============================================================================
-- Original migration: 20260428140000_fix_safe_registration.sql
-- ============================================================================

-- Safe self-registration: ignore requested_role metadata and require admin activation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    'customer',
    NULL,
    'pending'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Original migration: 20260428150000_phase_7b_rls_rpc_hardening.sql
-- ============================================================================

-- Phase 7B: harden customer purchase request mutations behind dedicated RPCs.
-- Customers may no longer directly update arbitrary purchase_requests columns.

DROP POLICY IF EXISTS "Customers can update own purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Customers can update own purchase requests to cancelled" ON public.purchase_requests;

CREATE OR REPLACE FUNCTION public.protect_purchase_requests_customer_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_action text := current_setting('app.lourex_rpc_action', true);
  v_is_trusted_rpc_context boolean := current_user NOT IN ('anon', 'authenticated');
BEGIN
  IF v_user_id IS NULL THEN
    IF current_role IN ('postgres', 'service_role', 'supabase_admin') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.is_lourex_role(v_user_id, ARRAY['owner', 'operations_employee']) THEN
    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'hide_purchase_request' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY['customer_hidden_at'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['customer_hidden_at'])
    THEN
      RAISE EXCEPTION 'Only customer hide updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'submit_transfer_proof' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR OLD.status NOT IN ('ready_for_conversion', 'transfer_proof_rejected')
      OR NEW.status IS DISTINCT FROM 'transfer_proof_pending'
      OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY[
            'status',
            'transfer_proof_url',
            'transfer_proof_name',
            'transfer_proof_uploaded_at',
            'transfer_proof_status',
            'transfer_rejection_reason',
            'updated_at'
          ])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY[
            'status',
            'transfer_proof_url',
            'transfer_proof_name',
            'transfer_proof_uploaded_at',
            'transfer_proof_status',
            'transfer_rejection_reason',
            'updated_at'
          ])
    THEN
      RAISE EXCEPTION 'Only transfer proof submission updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_trusted_rpc_context AND v_action = 'cancel_purchase_request' THEN
    IF OLD.customer_id IS DISTINCT FROM v_user_id
      OR OLD.status NOT IN ('intake_submitted', 'awaiting_clarification')
      OR NEW.status IS DISTINCT FROM 'cancelled'
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR (to_jsonb(NEW) - ARRAY['status', 'updated_at'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['status', 'updated_at'])
    THEN
      RAISE EXCEPTION 'Only eligible customer cancellation updates are allowed for this request';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Direct customer updates to purchase requests are not allowed';
END;
$$;

DROP TRIGGER IF EXISTS protect_purchase_requests_customer_updates ON public.purchase_requests;
CREATE TRIGGER protect_purchase_requests_customer_updates
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_purchase_requests_customer_updates();

CREATE OR REPLACE FUNCTION public.hide_purchase_request_for_customer(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'hide_purchase_request', true);

  UPDATE public.purchase_requests
  SET customer_hidden_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or you do not have permission to hide it';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_transfer_proof_for_purchase_request(
  request_id uuid,
  proof_url text,
  proof_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  p_proof_url ALIAS FOR $2;
  p_proof_path ALIAS FOR $3;
  v_user_id uuid := auth.uid();
  v_storage_value text;
  v_file_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_storage_value := COALESCE(NULLIF(trim(p_proof_path), ''), NULLIF(trim(p_proof_url), ''));
  IF v_storage_value IS NULL THEN
    RAISE EXCEPTION 'Transfer proof path is required';
  END IF;

  v_file_name := NULLIF(regexp_replace(v_storage_value, '^.*/', ''), '');

  PERFORM set_config('app.lourex_rpc_action', 'submit_transfer_proof', true);

  -- "Awaiting payment" is represented by ready_for_conversion in the current schema.
  -- transfer_proof_rejected remains valid so customers can resubmit corrected proof.
  UPDATE public.purchase_requests
  SET
    transfer_proof_url = v_storage_value,
    transfer_proof_name = COALESCE(v_file_name, 'transfer-proof'),
    transfer_proof_uploaded_at = now(),
    transfer_proof_status = 'pending',
    transfer_rejection_reason = NULL,
    status = 'transfer_proof_pending',
    updated_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer'
    AND status IN ('ready_for_conversion', 'transfer_proof_rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer proof can only be uploaded for requests awaiting payment proof';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_purchase_request(p_request_id uuid, p_reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_internal := public.is_lourex_internal(v_user_id);

  IF NOT v_is_internal THEN
    PERFORM set_config('app.lourex_rpc_action', 'cancel_purchase_request', true);
  END IF;

  UPDATE public.purchase_requests
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id
    AND status NOT IN ('completed', 'cancelled')
    AND (
      v_is_internal
      OR (
        public.current_lourex_role() = 'customer'
        AND customer_id = v_user_id
        AND status IN ('intake_submitted', 'awaiting_clarification')
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled in its current state';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_purchase_request_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase_request(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hide_purchase_request_for_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can upload purchase request product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload purchase request product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload purchase request product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'purchase-requests'
);

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
      AND pr.status IN ('ready_for_conversion', 'transfer_proof_rejected')
  )
);

DROP POLICY IF EXISTS "Customers can read own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can read own transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can read transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.is_lourex_internal(auth.uid())
);


-- ============================================================================
-- Original migration: 20260428160000_phase_7c_storage_audit_hardening.sql
-- ============================================================================

-- Phase 7C: add security audit logging and tighten storage ownership policies.

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view security audit events" ON public.security_audit_events;
CREATE POLICY "Owner and operations can view security audit events"
ON public.security_audit_events
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.security_audit_events FROM PUBLIC;
REVOKE ALL ON public.security_audit_events FROM anon;
REVOKE ALL ON public.security_audit_events FROM authenticated;
GRANT SELECT ON public.security_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.security_audit_events (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    auth.uid(),
    public.current_lourex_role(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.hide_purchase_request_for_customer(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'hide_purchase_request', true);

  UPDATE public.purchase_requests
  SET customer_hidden_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or you do not have permission to hide it';
  END IF;

  PERFORM public.log_security_audit_event(
    'purchase_request_hidden_by_customer',
    'purchase_request',
    p_request_id,
    '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_transfer_proof_for_purchase_request(
  request_id uuid,
  proof_url text,
  proof_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_request_id ALIAS FOR $1;
  p_proof_url ALIAS FOR $2;
  p_proof_path ALIAS FOR $3;
  v_user_id uuid := auth.uid();
  v_storage_value text;
  v_file_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_storage_value := COALESCE(NULLIF(trim(p_proof_path), ''), NULLIF(trim(p_proof_url), ''));
  IF v_storage_value IS NULL THEN
    RAISE EXCEPTION 'Transfer proof path is required';
  END IF;

  v_file_name := NULLIF(regexp_replace(v_storage_value, '^.*/', ''), '');

  PERFORM set_config('app.lourex_rpc_action', 'submit_transfer_proof', true);

  UPDATE public.purchase_requests
  SET
    transfer_proof_url = v_storage_value,
    transfer_proof_name = COALESCE(v_file_name, 'transfer-proof'),
    transfer_proof_uploaded_at = now(),
    transfer_proof_status = 'pending',
    transfer_rejection_reason = NULL,
    status = 'transfer_proof_pending',
    updated_at = now()
  WHERE id = p_request_id
    AND customer_id = v_user_id
    AND public.current_lourex_role() = 'customer'
    AND status IN ('ready_for_conversion', 'transfer_proof_rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer proof can only be uploaded for requests awaiting payment proof';
  END IF;

  PERFORM public.log_security_audit_event(
    'transfer_proof_submitted',
    'purchase_request',
    p_request_id,
    jsonb_build_object(
      'proof_path', v_storage_value,
      'proof_file_name', COALESCE(v_file_name, 'transfer-proof')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_purchase_request(p_request_id uuid, p_reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_internal := public.is_lourex_internal(v_user_id);

  IF NOT v_is_internal THEN
    PERFORM set_config('app.lourex_rpc_action', 'cancel_purchase_request', true);
  END IF;

  UPDATE public.purchase_requests
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id
    AND status NOT IN ('completed', 'cancelled')
    AND (
      v_is_internal
      OR (
        public.current_lourex_role() = 'customer'
        AND customer_id = v_user_id
        AND status IN ('intake_submitted', 'awaiting_clarification')
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled in its current state';
  END IF;

  PERFORM public.log_security_audit_event(
    'purchase_request_cancelled',
    'purchase_request',
    p_request_id,
    jsonb_build_object(
      'reason', COALESCE(p_reason, ''),
      'is_internal', v_is_internal
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hide_purchase_request_for_customer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase_request(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hide_purchase_request_for_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_transfer_proof_for_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_request(uuid, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can upload purchase request product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload purchase request product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload purchase request product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'purchase-requests'
);

-- Product request images are uploaded before a purchase request id always exists,
-- so this remains authenticated-only rather than ownership-scoped by request id.

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
      AND pr.status IN ('ready_for_conversion', 'transfer_proof_rejected')
  )
);

DROP POLICY IF EXISTS "Customers can read own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can read own transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[2]
      AND pr.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can read transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'transfer-proofs'
  AND public.is_lourex_internal(auth.uid())
);


-- ============================================================================
-- Original migration: 20260428170000_align_purchase_request_status_constraint.sql
-- ============================================================================

-- Align purchase_requests.status with the frontend canonical status list.
-- converted_to_deal was a legacy status; the frontend now uses in_progress after conversion/payment approval.
-- transfer_proof_status remains separate and continues to use pending / accepted / rejected.

UPDATE public.purchase_requests
SET status = 'in_progress'
WHERE status = 'converted_to_deal';

ALTER TABLE public.purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT purchase_requests_status_check
  CHECK (
    status IN (
      'intake_submitted',
      'under_review',
      'awaiting_clarification',
      'ready_for_conversion',
      'transfer_proof_pending',
      'transfer_proof_rejected',
      'in_progress',
      'completed',
      'cancelled'
    )
  );


-- ============================================================================
-- Original migration: 20260428180000_phase_8_financial_integrity_hardening.sql
-- ============================================================================

-- Phase 8: financial integrity hardening.
-- Financial entries are append-only; approved edits create correction entries.

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  actor_role text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.security_audit_events (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    auth.uid(),
    public.current_lourex_role(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_audit_event(text, text, uuid, jsonb) TO authenticated;

ALTER TABLE public.financial_edit_requests
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.financial_edit_requests
SET
  requested_by = COALESCE(requested_by, created_by),
  request_reason = COALESCE(NULLIF(request_reason, ''), reason, ''),
  proposed_changes = CASE
    WHEN proposed_changes = '{}'::jsonb THEN COALESCE(proposed_value, '{}'::jsonb)
    ELSE proposed_changes
  END,
  reviewed_by = COALESCE(reviewed_by, reviewer_id),
  updated_at = COALESCE(reviewed_at, created_at, now())
WHERE requested_by IS NULL
   OR request_reason = ''
   OR proposed_changes = '{}'::jsonb
   OR reviewed_by IS NULL
   OR updated_at IS NULL;

DROP POLICY IF EXISTS "Owner and operations can update unlocked financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can update unlocked financial entries" ON public.financial_entries;

DROP POLICY IF EXISTS "Owner and operations can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Owner and operations can update financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can insert financial edit requests" ON public.financial_edit_requests;
DROP POLICY IF EXISTS "Admins can update financial edit requests" ON public.financial_edit_requests;

DROP POLICY IF EXISTS "Financial edit requesters can view own requests" ON public.financial_edit_requests;
CREATE POLICY "Financial edit requesters can view own requests"
ON public.financial_edit_requests
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR created_by = auth.uid()
  OR public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee'])
);

CREATE OR REPLACE FUNCTION public.prevent_financial_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text := current_setting('app.lourex_rpc_action', true);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial entries are append-only and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_action = 'financial_correction_workflow' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Financial entries are append-only and cannot be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_financial_entry_update ON public.financial_entries;
DROP TRIGGER IF EXISTS prevent_financial_entry_mutation ON public.financial_entries;
CREATE TRIGGER prevent_financial_entry_mutation
  BEFORE UPDATE OR DELETE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_financial_entry_mutation();

CREATE OR REPLACE FUNCTION public.request_financial_entry_edit(
  p_financial_entry_id uuid,
  p_reason text,
  p_proposed_changes jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry public.financial_entries%ROWTYPE;
  v_request_id uuid;
  v_reason text := trim(COALESCE(p_reason, ''));
  v_allowed_changes jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_lourex_internal(v_user_id) THEN
    RAISE EXCEPTION 'Only internal Lourex roles can request financial edits';
  END IF;

  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'A clear financial edit reason is required';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_financial_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial entry not found';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO v_allowed_changes
  FROM jsonb_each(COALESCE(p_proposed_changes, '{}'::jsonb))
  WHERE key IN ('amount', 'method', 'counterparty', 'category', 'note', 'referenceLabel', 'reference_label', 'currency', 'entryDate', 'entry_date');

  IF v_allowed_changes = '{}'::jsonb THEN
    RAISE EXCEPTION 'Financial edit request must include allowed proposed changes';
  END IF;

  INSERT INTO public.financial_edit_requests (
    financial_entry_id,
    deal_id,
    customer_id,
    requested_by,
    requested_by_name,
    requested_by_email,
    request_reason,
    reason,
    old_value,
    proposed_changes,
    proposed_value,
    status,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    v_entry.id,
    v_entry.deal_id,
    v_entry.customer_id,
    v_user_id,
    COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), ''),
    COALESCE((SELECT email FROM public.profiles WHERE id = v_user_id), ''),
    v_reason,
    v_reason,
    jsonb_build_object(
      'amount', v_entry.amount,
      'method', v_entry.method,
      'counterparty', v_entry.counterparty,
      'category', v_entry.category,
      'note', v_entry.note,
      'reference_label', v_entry.reference_label,
      'currency', v_entry.currency,
      'entry_date', v_entry.entry_date
    ),
    v_allowed_changes,
    v_allowed_changes,
    'pending',
    v_user_id,
    now(),
    now()
  )
  RETURNING id INTO v_request_id;

  PERFORM public.log_security_audit_event(
    'financial_edit_requested',
    'financial_edit_request',
    v_request_id,
    jsonb_build_object(
      'financial_entry_id', v_entry.id,
      'proposed_changes', v_allowed_changes
    )
  );

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_financial_entry_edit_request(
  p_request_id uuid,
  p_status text,
  p_review_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.financial_edit_requests%ROWTYPE;
  v_entry public.financial_entries%ROWTYPE;
  v_status text := lower(trim(COALESCE(p_status, '')));
  v_changes jsonb;
  v_original_amount numeric;
  v_target_amount numeric;
  v_delta numeric;
  v_correction_type text;
  v_correction_amount numeric;
  v_correction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_lourex_role(v_user_id, ARRAY['owner', 'operations_employee']) THEN
    RAISE EXCEPTION 'Only owner or operations can review financial edit requests';
  END IF;

  IF v_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Financial edit review status must be approved or rejected';
  END IF;

  SELECT *
  INTO v_request
  FROM public.financial_edit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial edit request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending financial edit requests can be reviewed';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.financial_entries
  WHERE id = v_request.financial_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original financial entry not found';
  END IF;

  v_changes := CASE
    WHEN v_request.proposed_changes IS NOT NULL AND v_request.proposed_changes <> '{}'::jsonb THEN v_request.proposed_changes
    ELSE COALESCE(v_request.proposed_value, '{}'::jsonb)
  END;

  IF v_status = 'rejected' THEN
    UPDATE public.financial_edit_requests
    SET
      status = 'rejected',
      reviewed_by = v_user_id,
      reviewer_id = v_user_id,
      reviewed_at = now(),
      review_note = COALESCE(p_review_note, ''),
      updated_at = now()
    WHERE id = p_request_id;

    PERFORM public.log_security_audit_event(
      'financial_edit_rejected',
      'financial_edit_request',
      p_request_id,
      jsonb_build_object('financial_entry_id', v_entry.id, 'review_note', COALESCE(p_review_note, ''))
    );

    RETURN NULL;
  END IF;

  v_original_amount := COALESCE(v_entry.amount, 0);
  v_target_amount := COALESCE(NULLIF(v_changes ->> 'amount', '')::numeric, v_original_amount);
  v_delta := v_target_amount - v_original_amount;

  IF v_delta = 0 THEN
    UPDATE public.financial_edit_requests
    SET
      status = 'approved',
      reviewed_by = v_user_id,
      reviewer_id = v_user_id,
      reviewed_at = now(),
      review_note = COALESCE(p_review_note, ''),
      updated_at = now()
    WHERE id = p_request_id;

    PERFORM public.log_security_audit_event(
      'financial_edit_approved_no_amount_change',
      'financial_edit_request',
      p_request_id,
      jsonb_build_object(
        'financial_entry_id', v_entry.id,
        'proposed_changes', v_changes
      )
    );

    RETURN NULL;
  END IF;

  IF v_delta < 0 THEN
    v_correction_type := CASE WHEN v_entry.type = 'income' THEN 'expense' ELSE 'income' END;
    v_correction_amount := abs(v_delta);
  ELSE
    v_correction_type := v_entry.type;
    v_correction_amount := v_delta;
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'financial_correction_workflow', true);

  INSERT INTO public.financial_entries (
    entry_number,
    deal_id,
    customer_id,
    type,
    scope,
    relation_type,
    amount,
    currency,
    note,
    entry_date,
    method,
    counterparty,
    category,
    reference_label,
    created_by,
    locked
  )
  VALUES (
    'FE-CORR-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    v_entry.deal_id,
    v_entry.customer_id,
    v_correction_type,
    v_entry.scope,
    v_entry.relation_type,
    v_correction_amount,
    COALESCE(NULLIF(v_changes ->> 'currency', ''), v_entry.currency),
    'Correction for ' || v_entry.entry_number || ': ' || COALESCE(p_review_note, v_request.request_reason, v_request.reason, ''),
    COALESCE(NULLIF(v_changes ->> 'entryDate', '')::date, NULLIF(v_changes ->> 'entry_date', '')::date, v_entry.entry_date),
    COALESCE(NULLIF(v_changes ->> 'method', ''), v_entry.method),
    COALESCE(NULLIF(v_changes ->> 'counterparty', ''), v_entry.counterparty),
    COALESCE(NULLIF(v_changes ->> 'category', ''), v_entry.category),
    COALESCE(NULLIF(v_changes ->> 'referenceLabel', ''), NULLIF(v_changes ->> 'reference_label', ''), v_entry.reference_label),
    v_user_id,
    true
  )
  RETURNING id INTO v_correction_id;

  UPDATE public.financial_edit_requests
  SET
    status = 'approved',
    reviewed_by = v_user_id,
    reviewer_id = v_user_id,
    reviewed_at = now(),
    review_note = COALESCE(p_review_note, ''),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_security_audit_event(
    'financial_edit_approved',
    'financial_edit_request',
    p_request_id,
    jsonb_build_object('financial_entry_id', v_entry.id, 'correction_entry_id', v_correction_id)
  );

  PERFORM public.log_security_audit_event(
    'financial_correction_entry_created',
    'financial_entry',
    v_correction_id,
    jsonb_build_object(
      'original_financial_entry_id', v_entry.id,
      'financial_edit_request_id', p_request_id,
      'proposed_changes', v_changes,
      'delta_amount', v_delta
    )
  );

  RETURN v_correction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_financial_entry_edit_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_financial_entry_edit(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_financial_entry_edit_request(uuid, text, text) TO authenticated;


-- ============================================================================
-- Original migration: 20260428190000_phase_9_system_consistency_engine.sql
-- ============================================================================

-- Phase 9: database-level Lourex business consistency checks.
-- Targeted rules only; avoids inventing columns or blocking known active flows.

CREATE OR REPLACE FUNCTION public.validate_lourex_business_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text := current_setting('app.lourex_rpc_action', true);
  v_is_owner_ops boolean := COALESCE(public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']), false);
  v_request public.purchase_requests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_latest_tracking_at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'purchase_requests' THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.status = 'cancelled'
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NOT (v_is_owner_ops AND v_action = 'restore_cancelled_purchase_request')
      THEN
        RAISE EXCEPTION 'Cancelled purchase requests cannot be restored without an approved owner/operations workflow';
      END IF;

      IF OLD.status = 'completed'
        AND public.current_lourex_role() = 'customer'
        AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)
      THEN
        RAISE EXCEPTION 'Completed purchase requests cannot be edited by customers';
      END IF;
    END IF;

    IF NEW.status = 'transfer_proof_pending'
      AND (
        NEW.transfer_proof_url IS NULL
        OR trim(NEW.transfer_proof_url) = ''
        OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      )
    THEN
      RAISE EXCEPTION 'Transfer proof pending requests require a proof URL and pending proof status';
    END IF;

    IF NEW.status = 'transfer_proof_rejected'
      AND (
        NEW.transfer_proof_status IS DISTINCT FROM 'rejected'
        OR trim(COALESCE(NEW.transfer_rejection_reason, '')) = ''
      )
    THEN
      RAISE EXCEPTION 'Rejected transfer proofs require rejected proof status and a rejection reason';
    END IF;

    IF NEW.status = 'ready_for_conversion'
      AND NEW.transfer_proof_status = 'accepted'
    THEN
      RAISE EXCEPTION 'Ready-for-conversion requests cannot already have accepted transfer proof status';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'deals' THEN
    IF NEW.source_request_id IS NOT NULL THEN
      SELECT *
      INTO v_request
      FROM public.purchase_requests
      WHERE id = NEW.source_request_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Deal source purchase request does not exist';
      END IF;

      IF v_request.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot create or update a deal from a cancelled purchase request';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_request.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_request.customer_id
      THEN
        RAISE EXCEPTION 'Deal customer must match source purchase request customer';
      END IF;
    END IF;

    IF NEW.status = 'completed'
      AND (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.deal_id = NEW.id
          AND (s.status = 'delivered' OR s.current_stage_code = 'delivered')
      )
    THEN
      RAISE EXCEPTION 'Completed deals require at least one delivered shipment';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'shipments' THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Shipment linked deal does not exist';
      END IF;

      IF (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled deals';
      END IF;

      IF (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.source_request_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.purchase_requests pr
          WHERE pr.id = v_deal.source_request_id
            AND pr.status = 'cancelled'
        )
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled source requests';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'tracking_updates' THEN
    IF NEW.deal_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.id = NEW.shipment_id
          AND s.deal_id = NEW.deal_id
      )
    THEN
      RAISE EXCEPTION 'Tracking update deal must match shipment deal';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = NEW.shipment_id) THEN
      RAISE EXCEPTION 'Tracking update shipment does not exist';
    END IF;

    SELECT max(tu.occurred_at)
    INTO v_latest_tracking_at
    FROM public.tracking_updates tu
    WHERE tu.shipment_id = NEW.shipment_id
      AND (TG_OP = 'INSERT' OR tu.id <> NEW.id);

    IF NEW.occurred_at IS NOT NULL
      AND v_latest_tracking_at IS NOT NULL
      AND NEW.occurred_at < v_latest_tracking_at
    THEN
      RAISE EXCEPTION 'Tracking update chronology cannot move backwards';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'financial_entries' THEN
    IF NEW.amount < 0 THEN
      RAISE EXCEPTION 'Financial entry amount must be non-negative';
    END IF;

    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Financial entry linked deal does not exist';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_deal.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_deal.customer_id
      THEN
        RAISE EXCEPTION 'Financial entry customer must match linked deal customer';
      END IF;
    END IF;

    IF NEW.entry_number LIKE 'FE-CORR-%'
      AND NEW.locked IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'Financial correction entries must be locked';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_purchase_requests_consistency ON public.purchase_requests;
CREATE TRIGGER validate_purchase_requests_consistency
  BEFORE INSERT OR UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_deals_consistency ON public.deals;
CREATE TRIGGER validate_deals_consistency
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_shipments_consistency ON public.shipments;
CREATE TRIGGER validate_shipments_consistency
  BEFORE INSERT OR UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_tracking_updates_consistency ON public.tracking_updates;
CREATE TRIGGER validate_tracking_updates_consistency
  BEFORE INSERT OR UPDATE ON public.tracking_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();

DROP TRIGGER IF EXISTS validate_financial_entries_consistency ON public.financial_entries;
CREATE TRIGGER validate_financial_entries_consistency
  BEFORE INSERT OR UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lourex_business_consistency();


-- ============================================================================
-- Original migration: 20260428200000_phase_10_business_rules_engine.sql
-- ============================================================================

-- Phase 10: configurable Lourex business rules.

CREATE TABLE IF NOT EXISTS public.business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_group text NOT NULL,
  description text NULL,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'error',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT business_rules_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view business rules" ON public.business_rules;
CREATE POLICY "Owner and operations can view business rules"
ON public.business_rules
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

DROP POLICY IF EXISTS "Owner can insert business rules" ON public.business_rules;
CREATE POLICY "Owner can insert business rules"
ON public.business_rules
FOR INSERT
TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Owner can update business rules" ON public.business_rules;
CREATE POLICY "Owner can update business rules"
ON public.business_rules
FOR UPDATE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']))
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Owner can delete business rules" ON public.business_rules;
CREATE POLICY "Owner can delete business rules"
ON public.business_rules
FOR DELETE
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner']));

INSERT INTO public.business_rules (rule_key, rule_group, description, enabled, severity, config)
VALUES
  ('purchase_request.restore_cancelled_requires_owner_ops', 'purchase_requests', 'Cancelled purchase requests require an owner/operations workflow before restoration.', true, 'critical', '{}'::jsonb),
  ('purchase_request.transfer_proof_pending_requires_url', 'purchase_requests', 'Transfer proof pending requests must include a proof URL and pending proof status.', true, 'error', '{}'::jsonb),
  ('purchase_request.transfer_proof_rejected_requires_reason', 'purchase_requests', 'Rejected transfer proofs must include rejected proof status and a rejection reason.', true, 'error', '{}'::jsonb),
  ('deal.prevent_cancelled_request_conversion', 'deals', 'Deals cannot be created or updated from cancelled purchase requests.', true, 'critical', '{}'::jsonb),
  ('deal.completed_requires_delivered_shipment', 'deals', 'Completed deals should have at least one delivered shipment.', true, 'warning', '{"enforcement":"soft"}'::jsonb),
  ('shipment.prevent_delivered_for_cancelled_deal', 'shipments', 'Delivered shipments cannot belong to cancelled deals or source requests.', true, 'critical', '{}'::jsonb),
  ('tracking.prevent_backdated_updates', 'tracking', 'Tracking updates should not move chronology backwards.', true, 'warning', '{}'::jsonb),
  ('finance.prevent_negative_amount', 'financial_entries', 'Financial entry amounts must be non-negative.', true, 'critical', '{}'::jsonb),
  ('finance.require_locked_corrections', 'financial_entries', 'Financial correction entries must remain locked.', true, 'critical', '{}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_business_rule_enabled(p_rule_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.business_rules WHERE rule_key = p_rule_key),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_business_rule_config(p_rule_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT config FROM public.business_rules WHERE rule_key = p_rule_key),
    '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_rule_enabled(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_rule_config(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_rule_enabled(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_rule_config(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_business_rules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_business_rules_updated_at ON public.business_rules;
CREATE TRIGGER touch_business_rules_updated_at
  BEFORE UPDATE ON public.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_business_rules_updated_at();

CREATE OR REPLACE FUNCTION public.validate_lourex_business_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text := current_setting('app.lourex_rpc_action', true);
  v_is_owner_ops boolean := COALESCE(public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']), false);
  v_request public.purchase_requests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_latest_tracking_at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'purchase_requests' THEN
    IF TG_OP = 'UPDATE' THEN
      IF public.is_business_rule_enabled('purchase_request.restore_cancelled_requires_owner_ops')
        AND OLD.status = 'cancelled'
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NOT (v_is_owner_ops AND v_action = 'restore_cancelled_purchase_request')
      THEN
        RAISE EXCEPTION 'Cancelled purchase requests cannot be restored without an approved owner/operations workflow';
      END IF;

      IF OLD.status = 'completed'
        AND public.current_lourex_role() = 'customer'
        AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)
      THEN
        RAISE EXCEPTION 'Completed purchase requests cannot be edited by customers';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('purchase_request.transfer_proof_pending_requires_url')
      AND NEW.status = 'transfer_proof_pending'
      AND (
        NEW.transfer_proof_url IS NULL
        OR trim(NEW.transfer_proof_url) = ''
        OR NEW.transfer_proof_status IS DISTINCT FROM 'pending'
      )
    THEN
      RAISE EXCEPTION 'Transfer proof pending requests require a proof URL and pending proof status';
    END IF;

    IF public.is_business_rule_enabled('purchase_request.transfer_proof_rejected_requires_reason')
      AND NEW.status = 'transfer_proof_rejected'
      AND (
        NEW.transfer_proof_status IS DISTINCT FROM 'rejected'
        OR trim(COALESCE(NEW.transfer_rejection_reason, '')) = ''
      )
    THEN
      RAISE EXCEPTION 'Rejected transfer proofs require rejected proof status and a rejection reason';
    END IF;

    IF NEW.status = 'ready_for_conversion'
      AND NEW.transfer_proof_status = 'accepted'
    THEN
      RAISE EXCEPTION 'Ready-for-conversion requests cannot already have accepted transfer proof status';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'deals' THEN
    IF NEW.source_request_id IS NOT NULL THEN
      SELECT *
      INTO v_request
      FROM public.purchase_requests
      WHERE id = NEW.source_request_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Deal source purchase request does not exist';
      END IF;

      IF public.is_business_rule_enabled('deal.prevent_cancelled_request_conversion')
        AND v_request.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Cannot create or update a deal from a cancelled purchase request';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_request.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_request.customer_id
      THEN
        RAISE EXCEPTION 'Deal customer must match source purchase request customer';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('deal.completed_requires_delivered_shipment')
      AND COALESCE(public.get_business_rule_config('deal.completed_requires_delivered_shipment') ->> 'enforcement', 'hard') <> 'soft'
      AND NEW.status = 'completed'
      AND (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.deal_id = NEW.id
          AND (s.status = 'delivered' OR s.current_stage_code = 'delivered')
      )
    THEN
      RAISE EXCEPTION 'Completed deals require at least one delivered shipment';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'shipments' THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Shipment linked deal does not exist';
      END IF;

      IF public.is_business_rule_enabled('shipment.prevent_delivered_for_cancelled_deal')
        AND (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.status = 'cancelled'
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled deals';
      END IF;

      IF public.is_business_rule_enabled('shipment.prevent_delivered_for_cancelled_deal')
        AND (NEW.status = 'delivered' OR NEW.current_stage_code = 'delivered')
        AND v_deal.source_request_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.purchase_requests pr
          WHERE pr.id = v_deal.source_request_id
            AND pr.status = 'cancelled'
        )
      THEN
        RAISE EXCEPTION 'Delivered shipments cannot belong to cancelled source requests';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'tracking_updates' THEN
    IF NEW.deal_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.shipments s
        WHERE s.id = NEW.shipment_id
          AND s.deal_id = NEW.deal_id
      )
    THEN
      RAISE EXCEPTION 'Tracking update deal must match shipment deal';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = NEW.shipment_id) THEN
      RAISE EXCEPTION 'Tracking update shipment does not exist';
    END IF;

    SELECT max(tu.occurred_at)
    INTO v_latest_tracking_at
    FROM public.tracking_updates tu
    WHERE tu.shipment_id = NEW.shipment_id
      AND (TG_OP = 'INSERT' OR tu.id <> NEW.id);

    IF public.is_business_rule_enabled('tracking.prevent_backdated_updates')
      AND COALESCE(public.get_business_rule_config('tracking.prevent_backdated_updates') ->> 'enforcement', 'hard') <> 'soft'
      AND NEW.occurred_at IS NOT NULL
      AND v_latest_tracking_at IS NOT NULL
      AND NEW.occurred_at < v_latest_tracking_at
    THEN
      RAISE EXCEPTION 'Tracking update chronology cannot move backwards';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'financial_entries' THEN
    IF public.is_business_rule_enabled('finance.prevent_negative_amount')
      AND NEW.amount < 0
    THEN
      RAISE EXCEPTION 'Financial entry amount must be non-negative';
    END IF;

    IF NEW.deal_id IS NOT NULL THEN
      SELECT *
      INTO v_deal
      FROM public.deals
      WHERE id = NEW.deal_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Financial entry linked deal does not exist';
      END IF;

      IF NEW.customer_id IS NOT NULL
        AND v_deal.customer_id IS NOT NULL
        AND NEW.customer_id IS DISTINCT FROM v_deal.customer_id
      THEN
        RAISE EXCEPTION 'Financial entry customer must match linked deal customer';
      END IF;
    END IF;

    IF public.is_business_rule_enabled('finance.require_locked_corrections')
      AND NEW.entry_number LIKE 'FE-CORR-%'
      AND NEW.locked IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'Financial correction entries must be locked';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Original migration: 20260428210000_phase_11_observability_system.sql
-- ============================================================================

-- Phase 11: observability and system health.

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view system events" ON public.system_events;
CREATE POLICY "Owner and operations can view system events"
ON public.system_events
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.system_events FROM PUBLIC;
REVOKE ALL ON public.system_events FROM anon;
REVOKE ALL ON public.system_events FROM authenticated;
GRANT SELECT ON public.system_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  status text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and operations can view system health snapshots" ON public.system_health_snapshots;
CREATE POLICY "Owner and operations can view system health snapshots"
ON public.system_health_snapshots
FOR SELECT
TO authenticated
USING (public.is_lourex_role(auth.uid(), ARRAY['owner', 'operations_employee']));

REVOKE ALL ON public.system_health_snapshots FROM PUBLIC;
REVOKE ALL ON public.system_health_snapshots FROM anon;
REVOKE ALL ON public.system_health_snapshots FROM authenticated;
GRANT SELECT ON public.system_health_snapshots TO authenticated;

CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type text,
  p_severity text,
  p_source text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_message text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_severity text := lower(trim(COALESCE(p_severity, 'info')));
BEGIN
  IF v_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE EXCEPTION 'Invalid system event severity: %', p_severity;
  END IF;

  IF trim(COALESCE(p_event_type, '')) = '' THEN
    RAISE EXCEPTION 'System event type is required';
  END IF;

  IF trim(COALESCE(p_source, '')) = '' THEN
    RAISE EXCEPTION 'System event source is required';
  END IF;

  IF trim(COALESCE(p_message, '')) = '' THEN
    RAISE EXCEPTION 'System event message is required';
  END IF;

  INSERT INTO public.system_events (
    event_type,
    severity,
    source,
    entity_type,
    entity_id,
    message,
    metadata
  )
  VALUES (
    trim(p_event_type),
    v_severity,
    trim(p_source),
    NULLIF(trim(COALESCE(p_entity_type, '')), ''),
    p_entity_id,
    trim(p_message),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_system_event(text, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_system_event(text, text, text, text, uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_system_health_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'purchase_requests', (SELECT count(*) FROM public.purchase_requests),
    'deals', (SELECT count(*) FROM public.deals),
    'shipments', (SELECT count(*) FROM public.shipments),
    'financial_entries', (SELECT count(*) FROM public.financial_entries),
    'pending_financial_edit_requests', (
      SELECT count(*)
      FROM public.financial_edit_requests
      WHERE status = 'pending'
    )
  )
  INTO v_metrics;

  INSERT INTO public.system_health_snapshots (
    snapshot_type,
    status,
    metrics
  )
  VALUES (
    'auto',
    'ok',
    v_metrics
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_system_health_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_system_health_snapshot() TO authenticated;


-- ============================================================================
-- Original migration: 20260428220000_dashboard_purchase_requests_alignment.sql
-- ============================================================================

-- Dashboard purchase request workflow alignment.
-- This migration only restores the schema and RLS surface used by the owner/operations/partner
-- purchase request dashboard and the Phase 13.3 minimal deal automation.

ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS converted_deal_id uuid,
  ADD COLUMN IF NOT EXISTS customer_hidden_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS internal_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS transfer_proof_url text,
  ADD COLUMN IF NOT EXISTS transfer_proof_name text,
  ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_proof_status text,
  ADD COLUMN IF NOT EXISTS transfer_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_accepted_by uuid,
  ADD COLUMN IF NOT EXISTS transfer_rejection_reason text;

DO $$
BEGIN
  IF to_regclass('public.deals') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'purchase_requests_converted_deal_id_fkey'
        AND conrelid = 'public.purchase_requests'::regclass
    )
  THEN
    ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT purchase_requests_converted_deal_id_fkey
      FOREIGN KEY (converted_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_reviewed_by_fkey'
      AND conrelid = 'public.purchase_requests'::regclass
  )
  THEN
    ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT purchase_requests_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_transfer_accepted_by_fkey'
      AND conrelid = 'public.purchase_requests'::regclass
  )
  THEN
    ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT purchase_requests_transfer_accepted_by_fkey
      FOREIGN KEY (transfer_accepted_by) REFERENCES auth.users(id);
  END IF;
END $$;

UPDATE public.purchase_requests
SET status = 'in_progress',
    updated_at = now()
WHERE status = 'converted_to_deal';

ALTER TABLE public.purchase_requests
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

ALTER TABLE public.purchase_requests
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT purchase_requests_status_check
  CHECK (
    status IN (
      'intake_submitted',
      'under_review',
      'awaiting_clarification',
      'ready_for_conversion',
      'transfer_proof_pending',
      'transfer_proof_rejected',
      'in_progress',
      'completed',
      'cancelled'
    )
  );

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source_request_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS operation_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'awaiting_assignment',
  ADD COLUMN IF NOT EXISTS shipment_id uuid,
  ADD COLUMN IF NOT EXISTS accounting_reference text DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_turkish_partner_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_saudi_partner_id uuid;

DO $$
BEGIN
  IF to_regclass('public.purchase_requests') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_source_request_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_source_request_id_fkey
      FOREIGN KEY (source_request_id) REFERENCES public.purchase_requests(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.lourex_customers') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_customer_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.lourex_customers(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_assigned_turkish_partner_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_assigned_turkish_partner_id_fkey
      FOREIGN KEY (assigned_turkish_partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'deals_assigned_saudi_partner_id_fkey'
        AND conrelid = 'public.deals'::regclass
    )
  THEN
    ALTER TABLE public.deals
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
      ADD CONSTRAINT deals_assigned_saudi_partner_id_fkey
      FOREIGN KEY (assigned_saudi_partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard internal can select purchase requests" ON public.purchase_requests;
CREATE POLICY "Dashboard internal can select purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can update purchase requests" ON public.purchase_requests;
CREATE POLICY "Dashboard internal can update purchase requests"
ON public.purchase_requests
FOR UPDATE
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
)
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Customers can select own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can select own purchase requests"
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Customers can insert own purchase requests" ON public.purchase_requests;
CREATE POLICY "Customers can insert own purchase requests"
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Dashboard internal can select deals" ON public.deals;
CREATE POLICY "Dashboard internal can select deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert deals" ON public.deals;
CREATE POLICY "Dashboard internal can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Customers can select own deals" ON public.deals;
CREATE POLICY "Customers can select own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() = 'customer'
  AND customer_id = auth.uid()
);

DROP POLICY IF EXISTS "Dashboard internal can select notifications" ON public.notifications;
CREATE POLICY "Dashboard internal can select notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert notifications" ON public.notifications;
CREATE POLICY "Dashboard internal can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
CREATE POLICY "Users can select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Dashboard internal can select audit logs" ON public.audit_logs;
CREATE POLICY "Dashboard internal can select audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

DROP POLICY IF EXISTS "Dashboard internal can insert audit logs" ON public.audit_logs;
CREATE POLICY "Dashboard internal can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);


-- ============================================================================
-- Original migration: 20260428230000_phase_13_4_unique_shipment_per_deal.sql
-- ============================================================================

-- Phase 13.4 shipment automation safety net.
-- A converted deal may have at most one shipment linked by deal_id.
-- Existing null deal_id rows are left untouched for legacy/public tracking records.

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_unique_deal_id
ON public.shipments(deal_id)
WHERE deal_id IS NOT NULL;


-- ============================================================================
-- Original migration: 20260428233000_phase_13_5_shipment_stage_engine.sql
-- ============================================================================

-- Phase 13.5: align shipment tracking constraints with the Lourex 11-stage engine.
-- Legacy stage codes are normalized in-place before the stricter CHECK constraints are recreated.

CREATE OR REPLACE FUNCTION public.lourex_normalized_stage(p_stage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_stage
    WHEN 'deal_accepted' THEN 'factory'
    WHEN 'product_preparation' THEN 'factory'
    WHEN 'moving_to_origin_port' THEN 'preparing_export'
    WHEN 'transfer_to_port' THEN 'preparing_export'
    WHEN 'at_origin_port' THEN 'preparing_export'
    WHEN 'origin_port' THEN 'preparing_export'
    WHEN 'origin_customs' THEN 'preparing_export'
    WHEN 'left_origin_country' THEN 'departed_turkey'
    WHEN 'departed_origin' THEN 'departed_turkey'
    WHEN 'transit_to_destination' THEN 'in_transit'
    WHEN 'destination_customs' THEN 'customs_clearance'
    WHEN 'moving_to_warehouse' THEN 'out_for_delivery'
    WHEN 'transfer_to_warehouse' THEN 'out_for_delivery'
    ELSE COALESCE(p_stage, 'factory')
  END;
$$;

UPDATE public.shipments
SET current_stage_code = public.lourex_normalized_stage(current_stage_code)
WHERE current_stage_code IS NOT NULL
  AND current_stage_code IS DISTINCT FROM public.lourex_normalized_stage(current_stage_code);

UPDATE public.tracking_updates
SET stage_code = public.lourex_normalized_stage(stage_code),
    previous_stage_code = CASE
      WHEN previous_stage_code IS NULL THEN NULL
      ELSE public.lourex_normalized_stage(previous_stage_code)
    END
WHERE stage_code IS DISTINCT FROM public.lourex_normalized_stage(stage_code)
   OR (
      previous_stage_code IS NOT NULL
      AND previous_stage_code IS DISTINCT FROM public.lourex_normalized_stage(previous_stage_code)
   );

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_current_stage_code_check;

ALTER TABLE public.shipments
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT shipments_current_stage_code_check
  CHECK (
    current_stage_code IS NULL
    OR current_stage_code IN (
      'factory',
      'received_turkey',
      'in_turkey_warehouse',
      'preparing_export',
      'departed_turkey',
      'in_transit',
      'arrived_destination',
      'customs_clearance',
      'out_for_delivery',
      'delivered',
      'closed'
    )
  );

ALTER TABLE public.tracking_updates
  DROP CONSTRAINT IF EXISTS tracking_updates_stage_code_check;

ALTER TABLE public.tracking_updates
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT tracking_updates_stage_code_check
  CHECK (
    stage_code IN (
      'factory',
      'received_turkey',
      'in_turkey_warehouse',
      'preparing_export',
      'departed_turkey',
      'in_transit',
      'arrived_destination',
      'customs_clearance',
      'out_for_delivery',
      'delivered',
      'closed'
    )
  );

ALTER TABLE public.tracking_updates
  DROP CONSTRAINT IF EXISTS tracking_updates_previous_stage_code_check;

ALTER TABLE public.tracking_updates
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT tracking_updates_previous_stage_code_check
  CHECK (
    previous_stage_code IS NULL
    OR previous_stage_code IN (
      'factory',
      'received_turkey',
      'in_turkey_warehouse',
      'preparing_export',
      'departed_turkey',
      'in_transit',
      'arrived_destination',
      'customs_clearance',
      'out_for_delivery',
      'delivered',
      'closed'
    )
  );

CREATE OR REPLACE FUNCTION public.lourex_stage_order(p_stage text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE public.lourex_normalized_stage(p_stage)
    WHEN 'factory' THEN 1
    WHEN 'received_turkey' THEN 2
    WHEN 'in_turkey_warehouse' THEN 3
    WHEN 'preparing_export' THEN 4
    WHEN 'departed_turkey' THEN 5
    WHEN 'in_transit' THEN 6
    WHEN 'arrived_destination' THEN 7
    WHEN 'customs_clearance' THEN 8
    WHEN 'out_for_delivery' THEN 9
    WHEN 'delivered' THEN 10
    WHEN 'closed' THEN 11
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.validate_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_stage text;
  current_order integer;
  next_order integer;
BEGIN
  NEW.stage_code := public.lourex_normalized_stage(NEW.stage_code);
  IF NEW.previous_stage_code IS NOT NULL THEN
    NEW.previous_stage_code := public.lourex_normalized_stage(NEW.previous_stage_code);
  END IF;

  SELECT current_stage_code
  INTO current_stage
  FROM public.shipments
  WHERE id = NEW.shipment_id;

  current_stage := public.lourex_normalized_stage(COALESCE(current_stage, 'factory'));
  current_order := public.lourex_stage_order(current_stage);
  next_order := public.lourex_stage_order(NEW.stage_code);

  IF NEW.previous_stage_code IS NULL THEN
    NEW.previous_stage_code := current_stage;
  END IF;

  IF next_order = 0 THEN
    RAISE EXCEPTION 'Unknown Lourex tracking stage';
  END IF;

  IF current_stage = 'closed' THEN
    RAISE EXCEPTION 'Closed shipments cannot be advanced';
  END IF;

  IF current_stage = 'delivered' AND NEW.stage_code <> 'closed' THEN
    RAISE EXCEPTION 'Delivered shipments can only move to closed';
  END IF;

  IF next_order < current_order OR next_order > current_order + 1 THEN
    RAISE EXCEPTION 'Tracking updates must follow the official Lourex stage sequence';
  END IF;

  UPDATE public.shipments
  SET current_stage_code = NEW.stage_code,
      status = CASE
        WHEN NEW.stage_code IN ('factory', 'received_turkey', 'in_turkey_warehouse', 'preparing_export') THEN 'factory'
        WHEN NEW.stage_code IN ('departed_turkey', 'in_transit', 'arrived_destination') THEN 'shipping'
        WHEN NEW.stage_code = 'customs_clearance' THEN 'customs'
        WHEN NEW.stage_code IN ('out_for_delivery', 'delivered', 'closed') THEN 'delivered'
        ELSE status
      END,
      customer_visible_note = CASE
        WHEN COALESCE(NEW.customer_note, '') <> '' THEN NEW.customer_note
        ELSE customer_visible_note
      END,
      updated_at = GREATEST(COALESCE(updated_at, now()), NEW.occurred_at)
  WHERE id = NEW.shipment_id;

  UPDATE public.deals
  SET updated_at = now(),
      operational_status = CASE
        WHEN NEW.stage_code IN ('factory', 'received_turkey', 'in_turkey_warehouse', 'preparing_export', 'departed_turkey') THEN 'origin_execution'
        WHEN NEW.stage_code = 'in_transit' THEN 'in_transit'
        WHEN NEW.stage_code IN ('arrived_destination', 'customs_clearance', 'out_for_delivery') THEN 'destination_execution'
        WHEN NEW.stage_code = 'delivered' THEN 'delivered'
        WHEN NEW.stage_code = 'closed' THEN 'closed'
        ELSE operational_status
      END
  WHERE id = COALESCE(NEW.deal_id, (SELECT deal_id FROM public.shipments WHERE id = NEW.shipment_id));

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Original migration: 20260428234000_phase_13_6_shipment_events.sql
-- ============================================================================

-- Phase 13.6: Shipment timeline and audit events.
-- Shipment events are append-only timeline records for shipment creation,
-- stage changes, notes, and future safe operational milestones.

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage text NULL,
  to_stage text NULL,
  note text NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_customer_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id
  ON public.shipment_events(shipment_id);

CREATE INDEX IF NOT EXISTS idx_shipment_events_created_at
  ON public.shipment_events(created_at DESC);

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipment_events_internal_full_access" ON public.shipment_events;
CREATE POLICY "shipment_events_internal_full_access"
ON public.shipment_events
FOR ALL
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
)
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
);

DROP POLICY IF EXISTS "shipment_events_customers_read_visible_own" ON public.shipment_events;
CREATE POLICY "shipment_events_customers_read_visible_own"
ON public.shipment_events
FOR SELECT
USING (
  is_customer_visible = true
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.shipments s
    LEFT JOIN public.deals d ON d.id = s.deal_id
    LEFT JOIN public.purchase_requests pr ON pr.id = d.source_request_id
    WHERE s.id = shipment_events.shipment_id
      AND (
        s.user_id = auth.uid()
        OR d.customer_id = auth.uid()
        OR d.client_id = auth.uid()
        OR pr.customer_id = auth.uid()
      )
  )
);

CREATE OR REPLACE FUNCTION public.log_shipment_event(
  p_shipment_id uuid,
  p_event_type text,
  p_from_stage text DEFAULT NULL,
  p_to_stage text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_is_customer_visible boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(public.current_lourex_role(), '') NOT IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Only internal Lourex users can log shipment events';
  END IF;

  INSERT INTO public.shipment_events (
    shipment_id,
    event_type,
    from_stage,
    to_stage,
    note,
    actor_user_id,
    is_customer_visible
  )
  VALUES (
    p_shipment_id,
    p_event_type,
    p_from_stage,
    p_to_stage,
    p_note,
    COALESCE(p_actor_user_id, auth.uid()),
    COALESCE(p_is_customer_visible, false)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_shipment_event(uuid, text, text, text, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_shipment_event(uuid, text, text, text, text, uuid, boolean)
TO authenticated;

CREATE OR REPLACE FUNCTION public.record_shipment_timeline_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.shipment_events (
      shipment_id,
      event_type,
      from_stage,
      to_stage,
      note,
      actor_user_id,
      is_customer_visible
    )
    VALUES (
      NEW.id,
      'system_created',
      NULL,
      COALESCE(NEW.current_stage_code, 'factory'),
      COALESCE(NULLIF(NEW.customer_visible_note, ''), 'Shipment timeline started.'),
      auth.uid(),
      true
    );
  ELSIF TG_OP = 'UPDATE'
    AND NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    INSERT INTO public.shipment_events (
      shipment_id,
      event_type,
      from_stage,
      to_stage,
      note,
      actor_user_id,
      is_customer_visible
    )
    VALUES (
      NEW.id,
      'stage_changed',
      OLD.current_stage_code,
      NEW.current_stage_code,
      NULLIF(NEW.customer_visible_note, ''),
      auth.uid(),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_shipment_timeline_event ON public.shipments;
CREATE TRIGGER record_shipment_timeline_event
AFTER INSERT OR UPDATE OF current_stage_code ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.record_shipment_timeline_event();


-- ============================================================================
-- Original migration: 20260428235000_phase_13_8_14_shipment_production_hardening.sql
-- ============================================================================

-- Phase 13.8-13.14: shipment production hardening.
-- current_stage_code is the source of truth. shipments.status mirrors it.

UPDATE public.shipments
SET current_stage_code = public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'))
WHERE current_stage_code IS NULL
   OR current_stage_code IS DISTINCT FROM public.lourex_normalized_stage(current_stage_code);

UPDATE public.shipments
SET status = public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'))
WHERE status IS DISTINCT FROM public.lourex_normalized_stage(COALESCE(current_stage_code, status, 'factory'));

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE public.shipments
-- WARNING: Manual replay note: the following ADD CONSTRAINT may fail if the constraint already exists.
  ADD CONSTRAINT shipments_status_check
  CHECK (
    status IN (
      'factory',
      'received_turkey',
      'in_turkey_warehouse',
      'preparing_export',
      'departed_turkey',
      'in_transit',
      'arrived_destination',
      'customs_clearance',
      'out_for_delivery',
      'delivered',
      'closed'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_tracking_id_unique
  ON public.shipments(tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_and_sync_shipment_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_stage text;
  new_stage text;
  old_order integer;
  new_order integer;
BEGIN
  new_stage := public.lourex_normalized_stage(COALESCE(NEW.current_stage_code, NEW.status, 'factory'));
  NEW.current_stage_code := new_stage;
  NEW.status := new_stage;

  IF TG_OP = 'UPDATE' AND NEW.current_stage_code IS DISTINCT FROM OLD.current_stage_code THEN
    old_stage := public.lourex_normalized_stage(COALESCE(OLD.current_stage_code, OLD.status, 'factory'));
    old_order := public.lourex_stage_order(old_stage);
    new_order := public.lourex_stage_order(new_stage);

    IF old_stage = 'closed' THEN
      RAISE EXCEPTION 'Closed shipments cannot be advanced';
    END IF;

    IF old_stage = 'delivered' AND new_stage <> 'closed' THEN
      RAISE EXCEPTION 'Delivered shipments can only move to closed';
    END IF;

    IF new_order <= old_order OR new_order > old_order + 1 THEN
      RAISE EXCEPTION 'Shipment stages must move forward one stage at a time';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_and_sync_shipment_stage ON public.shipments;
CREATE TRIGGER validate_and_sync_shipment_stage
BEFORE INSERT OR UPDATE OF current_stage_code, status ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_sync_shipment_stage();

CREATE OR REPLACE FUNCTION public.validate_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_stage text;
  current_order integer;
  next_order integer;
BEGIN
  NEW.stage_code := public.lourex_normalized_stage(NEW.stage_code);
  IF NEW.previous_stage_code IS NOT NULL THEN
    NEW.previous_stage_code := public.lourex_normalized_stage(NEW.previous_stage_code);
  END IF;

  SELECT current_stage_code
  INTO current_stage
  FROM public.shipments
  WHERE id = NEW.shipment_id;

  current_stage := public.lourex_normalized_stage(COALESCE(current_stage, 'factory'));
  current_order := public.lourex_stage_order(current_stage);
  next_order := public.lourex_stage_order(NEW.stage_code);

  IF NEW.previous_stage_code IS NULL THEN
    NEW.previous_stage_code := current_stage;
  END IF;

  IF next_order = 0 THEN
    RAISE EXCEPTION 'Unknown Lourex tracking stage';
  END IF;

  IF current_stage = 'closed' THEN
    RAISE EXCEPTION 'Closed shipments cannot be advanced';
  END IF;

  IF current_stage = 'delivered' AND NEW.stage_code <> 'closed' THEN
    RAISE EXCEPTION 'Delivered shipments can only move to closed';
  END IF;

  IF next_order < current_order OR next_order > current_order + 1 THEN
    RAISE EXCEPTION 'Tracking updates must follow the official Lourex stage sequence';
  END IF;

  UPDATE public.shipments
  SET current_stage_code = NEW.stage_code,
      status = NEW.stage_code,
      customer_visible_note = CASE
        WHEN COALESCE(NEW.customer_note, '') <> '' THEN NEW.customer_note
        ELSE customer_visible_note
      END,
      updated_at = GREATEST(COALESCE(updated_at, now()), NEW.occurred_at)
  WHERE id = NEW.shipment_id;

  UPDATE public.deals
  SET updated_at = now(),
      operational_status = CASE
        WHEN NEW.stage_code IN ('factory', 'received_turkey', 'in_turkey_warehouse', 'preparing_export', 'departed_turkey') THEN 'origin_execution'
        WHEN NEW.stage_code = 'in_transit' THEN 'in_transit'
        WHEN NEW.stage_code IN ('arrived_destination', 'customs_clearance', 'out_for_delivery') THEN 'destination_execution'
        WHEN NEW.stage_code = 'delivered' THEN 'delivered'
        WHEN NEW.stage_code = 'closed' THEN 'closed'
        ELSE operational_status
      END
  WHERE id = COALESCE(NEW.deal_id, (SELECT deal_id FROM public.shipments WHERE id = NEW.shipment_id));

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Original migration: 20260428240000_phase_14_partner_accounting_settlements.sql
-- ============================================================================

-- Phase 14: Partner accounting and settlement system.
-- Additive settlement model. Existing financial entries remain append-only/locked.

CREATE TABLE IF NOT EXISTS public.partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  partner_role text NOT NULL CHECK (partner_role IN ('turkish_partner', 'saudi_partner')),
  settlement_period text NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  partner_commission numeric NOT NULL DEFAULT 0 CHECK (partner_commission >= 0),
  expenses numeric NOT NULL DEFAULT 0 CHECK (expenses >= 0),
  net_due numeric NOT NULL DEFAULT 0 CHECK (net_due >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'paid', 'disputed')),
  approved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  paid_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_settlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.partner_settlements(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status text NULL,
  new_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner_id
  ON public.partner_settlements(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_status
  ON public.partner_settlements(status);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_period
  ON public.partner_settlements(settlement_period);

CREATE INDEX IF NOT EXISTS idx_partner_settlement_events_settlement_id
  ON public.partner_settlement_events(settlement_id, created_at DESC);

ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner operations can manage partner settlements" ON public.partner_settlements;
CREATE POLICY "Owner operations can manage partner settlements"
ON public.partner_settlements
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Partners can view own settlements" ON public.partner_settlements;
CREATE POLICY "Partners can view own settlements"
ON public.partner_settlements
FOR SELECT
USING (
  partner_id = auth.uid()
  AND public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
);

DROP POLICY IF EXISTS "Owner operations can view settlement events" ON public.partner_settlement_events;
CREATE POLICY "Owner operations can view settlement events"
ON public.partner_settlement_events
FOR SELECT
USING (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Partners can view own settlement events" ON public.partner_settlement_events;
CREATE POLICY "Partners can view own settlement events"
ON public.partner_settlement_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.partner_settlements ps
    WHERE ps.id = partner_settlement_events.settlement_id
      AND ps.partner_id = auth.uid()
      AND public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
  )
);

CREATE OR REPLACE FUNCTION public.touch_partner_settlement_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_partner_settlement_updated_at ON public.partner_settlements;
CREATE TRIGGER touch_partner_settlement_updated_at
BEFORE UPDATE ON public.partner_settlements
FOR EACH ROW
EXECUTE FUNCTION public.touch_partner_settlement_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_final_partner_settlement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Partner settlements cannot be deleted';
  END IF;

  IF OLD.status IN ('approved', 'paid') AND current_setting('app.lourex_rpc_action', true) IS DISTINCT FROM 'partner_settlement_workflow' THEN
    RAISE EXCEPTION 'Approved or paid partner settlements cannot be edited directly';
  END IF;

  IF OLD.status = 'paid' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Paid partner settlements are terminal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_final_partner_settlement_mutation ON public.partner_settlements;
CREATE TRIGGER prevent_final_partner_settlement_mutation
BEFORE UPDATE OR DELETE ON public.partner_settlements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_final_partner_settlement_mutation();

CREATE OR REPLACE FUNCTION public.log_partner_settlement_event(
  p_settlement_id uuid,
  p_action text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_settlement_events (
    settlement_id,
    action,
    actor_user_id,
    old_status,
    new_status,
    metadata
  )
  VALUES (
    p_settlement_id,
    p_action,
    auth.uid(),
    p_old_status,
    p_new_status,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_partner_settlement(
  p_partner_id uuid,
  p_partner_role text,
  p_settlement_period text,
  p_gross_amount numeric DEFAULT 0,
  p_partner_commission numeric DEFAULT 0,
  p_expenses numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement_id uuid;
  v_net_due numeric := GREATEST(COALESCE(p_partner_commission, 0) + COALESCE(p_expenses, 0), 0);
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can create partner settlements';
  END IF;

  IF p_partner_role NOT IN ('turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Invalid partner role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_partner_id AND role = p_partner_role AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active partner profile not found';
  END IF;

  INSERT INTO public.partner_settlements (
    partner_id,
    partner_role,
    settlement_period,
    gross_amount,
    partner_commission,
    expenses,
    net_due,
    status,
    created_by,
    updated_by
  )
  VALUES (
    p_partner_id,
    p_partner_role,
    p_settlement_period,
    COALESCE(p_gross_amount, 0),
    COALESCE(p_partner_commission, 0),
    COALESCE(p_expenses, 0),
    v_net_due,
    'draft',
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_settlement_id;

  PERFORM public.log_partner_settlement_event(
    v_settlement_id,
    'created',
    NULL,
    'draft',
    jsonb_build_object(
      'gross_amount', COALESCE(p_gross_amount, 0),
      'partner_commission', COALESCE(p_partner_commission, 0),
      'expenses', COALESCE(p_expenses, 0),
      'net_due', v_net_due
    )
  );

  RETURN v_settlement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_partner_settlement(
  p_settlement_id uuid,
  p_gross_amount numeric,
  p_partner_commission numeric,
  p_expenses numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_status text;
  v_net_due numeric := GREATEST(COALESCE(p_partner_commission, 0) + COALESCE(p_expenses, 0), 0);
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can recalculate partner settlements';
  END IF;

  SELECT status INTO v_status
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_status NOT IN ('draft', 'pending_review', 'disputed') THEN
    RAISE EXCEPTION 'Only draft, pending review, or disputed settlements can be recalculated';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET gross_amount = COALESCE(p_gross_amount, 0),
      partner_commission = COALESCE(p_partner_commission, 0),
      expenses = COALESCE(p_expenses, 0),
      net_due = v_net_due,
      status = CASE WHEN status = 'draft' THEN 'draft' ELSE 'pending_review' END
  WHERE id = p_settlement_id;

  PERFORM public.log_partner_settlement_event(
    p_settlement_id,
    'recalculated',
    v_status,
    (SELECT status FROM public.partner_settlements WHERE id = p_settlement_id),
    jsonb_build_object('net_due', v_net_due)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_partner_settlement(p_settlement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can approve partner settlements';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_settlement.status NOT IN ('draft', 'pending_review', 'disputed') THEN
    RAISE EXCEPTION 'Only draft, pending review, or disputed settlements can be approved';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_settlement_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED'
  ) THEN
    INSERT INTO public.financial_entries (
      entry_number,
      type,
      scope,
      relation_type,
      amount,
      currency,
      note,
      entry_date,
      method,
      counterparty,
      category,
      reference_label,
      created_by,
      locked
    )
    VALUES (
      'FE-SET-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      'expense',
      'global',
      'general',
      v_settlement.net_due,
      'SAR',
      'Approved partner settlement for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement',
      v_settlement.partner_role,
      'partner_settlement_accrual',
      'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED',
      auth.uid(),
      true
    );
  END IF;

  PERFORM public.log_partner_settlement_event(p_settlement_id, 'approved', v_settlement.status, 'approved', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_partner_settlement_paid(p_settlement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can mark partner settlements paid';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_settlement.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved settlements can be marked paid';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'paid',
      paid_at = now()
  WHERE id = p_settlement_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-PAID'
  ) THEN
    INSERT INTO public.financial_entries (
      entry_number,
      type,
      scope,
      relation_type,
      amount,
      currency,
      note,
      entry_date,
      method,
      counterparty,
      category,
      reference_label,
      created_by,
      locked
    )
    VALUES (
      'FE-PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      'expense',
      'global',
      'general',
      v_settlement.net_due,
      'SAR',
      'Paid partner settlement for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement_payment',
      v_settlement.partner_role,
      'partner_settlement_payment',
      'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-PAID',
      auth.uid(),
      true
    );
  END IF;

  PERFORM public.log_partner_settlement_event(p_settlement_id, 'marked_paid', v_settlement.status, 'paid', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.dispute_partner_settlement(
  p_settlement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner') THEN
    RAISE EXCEPTION 'Only internal users can dispute partner settlements';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Partner settlement not found';
  END IF;

  IF v_role IN ('turkish_partner', 'saudi_partner') AND v_settlement.partner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Partners can only dispute their own settlements';
  END IF;

  IF v_settlement.status = 'paid' THEN
    RAISE EXCEPTION 'Paid settlements are terminal';
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'disputed'
  WHERE id = p_settlement_id;

  PERFORM public.log_partner_settlement_event(
    p_settlement_id,
    'disputed',
    v_settlement.status,
    'disputed',
    jsonb_build_object('reason', COALESCE(p_reason, ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_partner_settlement_event(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_partner_settlement(uuid, text, text, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_partner_settlement(uuid, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_partner_settlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_partner_settlement_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispute_partner_settlement(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_partner_settlement(uuid, text, text, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_partner_settlement(uuid, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_partner_settlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_partner_settlement_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispute_partner_settlement(uuid, text) TO authenticated;


-- ============================================================================
-- Original migration: 20260428250000_phase_15_payment_tracking_reconciliation.sql
-- ============================================================================

-- Phase 15: Payment tracking and financial reconciliation.
-- Adds payment trail, allocations, audit events, and settlement payment linkage.

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  payer_type text NOT NULL CHECK (payer_type IN ('customer', 'saudi_partner', 'turkish_partner', 'internal')),
  payer_id uuid NULL,
  related_deal_id uuid NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  related_settlement_id uuid NULL REFERENCES public.partner_settlements(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  received_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  financial_entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  allocated_amount numeric NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, financial_entry_id)
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status text NULL,
  new_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_type, payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_deal ON public.payments(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_settlement ON public.payments(related_settlement_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_entry ON public.payment_allocations(financial_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON public.payment_events(payment_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can manage payments" ON public.payments;
CREATE POLICY "Internal users can manage payments"
ON public.payments
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments"
ON public.payments
FOR SELECT
USING (
  public.current_lourex_role() = 'customer'
  AND (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = payments.related_deal_id
        AND (d.customer_id = auth.uid() OR d.client_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Partners can view related payments" ON public.payments;
CREATE POLICY "Partners can view related payments"
ON public.payments
FOR SELECT
USING (
  public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
  AND (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.partner_settlements ps
      WHERE ps.id = payments.related_settlement_id
        AND ps.partner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Internal users can manage payment allocations" ON public.payment_allocations;
CREATE POLICY "Internal users can manage payment allocations"
ON public.payment_allocations
FOR ALL
USING (public.current_lourex_role() IN ('owner', 'operations_employee'))
WITH CHECK (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Visible payment allocations can be read" ON public.payment_allocations;
CREATE POLICY "Visible payment allocations can be read"
ON public.payment_allocations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
  )
);

DROP POLICY IF EXISTS "Internal users can view payment events" ON public.payment_events;
CREATE POLICY "Internal users can view payment events"
ON public.payment_events
FOR SELECT
USING (public.current_lourex_role() IN ('owner', 'operations_employee'));

DROP POLICY IF EXISTS "Visible payment events can be read" ON public.payment_events;
CREATE POLICY "Visible payment events can be read"
ON public.payment_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_events.payment_id
  )
);

CREATE OR REPLACE FUNCTION public.touch_payment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_payment_updated_at ON public.payments;
CREATE TRIGGER touch_payment_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.touch_payment_updated_at();

CREATE OR REPLACE FUNCTION public.validate_payment_allocation_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payment_amount numeric;
  v_payment_status text;
  v_entry_amount numeric;
  v_payment_allocated numeric;
  v_entry_allocated numeric;
BEGIN
  SELECT amount, payment_status INTO v_payment_amount, v_payment_status
  FROM public.payments
  WHERE id = NEW.payment_id;

  IF v_payment_status IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be allocated';
  END IF;

  SELECT amount INTO v_entry_amount
  FROM public.financial_entries
  WHERE id = NEW.financial_entry_id;

  IF v_entry_amount IS NULL THEN
    RAISE EXCEPTION 'Financial entry not found';
  END IF;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_payment_allocated
  FROM public.payment_allocations
  WHERE payment_id = NEW.payment_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_entry_allocated
  FROM public.payment_allocations
  WHERE financial_entry_id = NEW.financial_entry_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_payment_allocated + NEW.allocated_amount > v_payment_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds confirmed payment amount';
  END IF;

  IF v_entry_allocated + NEW.allocated_amount > v_entry_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds financial entry amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_allocation_limits ON public.payment_allocations;
CREATE TRIGGER validate_payment_allocation_limits
BEFORE INSERT OR UPDATE ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_allocation_limits();

CREATE OR REPLACE FUNCTION public.log_payment_event(
  p_payment_id uuid,
  p_action text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_events(payment_id, action, actor_user_id, old_status, new_status, metadata)
  VALUES (p_payment_id, p_action, auth.uid(), p_old_status, p_new_status, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment(
  p_payer_type text,
  p_payer_id uuid,
  p_related_deal_id uuid,
  p_related_settlement_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'SAR',
  p_payment_method text DEFAULT 'bank_transfer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment_id uuid;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can create payments';
  END IF;

  IF p_payer_type NOT IN ('customer', 'saudi_partner', 'turkish_partner', 'internal') THEN
    RAISE EXCEPTION 'Invalid payer type';
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  v_reference := 'PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.payments(
    reference_number,
    payer_type,
    payer_id,
    related_deal_id,
    related_settlement_id,
    amount,
    currency,
    payment_method,
    payment_status
  )
  VALUES (
    v_reference,
    p_payer_type,
    p_payer_id,
    p_related_deal_id,
    p_related_settlement_id,
    p_amount,
    COALESCE(NULLIF(p_currency, ''), 'SAR'),
    COALESCE(NULLIF(p_payment_method, ''), 'bank_transfer'),
    'pending'
  )
  RETURNING id INTO v_payment_id;

  PERFORM public.log_payment_event(v_payment_id, 'created', NULL, 'pending', jsonb_build_object('reference_number', v_reference));
  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment public.payments%ROWTYPE;
  v_entry_id uuid;
  v_entry_type text;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can confirm payments';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending payments can be confirmed';
  END IF;

  UPDATE public.payments
  SET payment_status = 'confirmed',
      received_at = COALESCE(received_at, now())
  WHERE id = p_payment_id;

  v_entry_type := CASE WHEN v_payment.payer_type = 'internal' THEN 'expense' ELSE 'income' END;
  v_reference := 'PAYMENT-' || p_payment_id::text || '-CONFIRMED';

  IF NOT EXISTS (SELECT 1 FROM public.financial_entries WHERE reference_label = v_reference) THEN
    INSERT INTO public.financial_entries(
      entry_number,
      deal_id,
      type,
      scope,
      relation_type,
      amount,
      currency,
      note,
      entry_date,
      method,
      counterparty,
      category,
      reference_label,
      created_by,
      locked
    )
    VALUES (
      'FE-PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      v_payment.related_deal_id,
      v_entry_type,
      CASE WHEN v_payment.related_deal_id IS NULL THEN 'global' ELSE 'deal_linked' END,
      CASE WHEN v_payment.related_deal_id IS NULL THEN 'general' ELSE 'deal_linked' END,
      v_payment.amount,
      v_payment.currency,
      'Confirmed payment ' || v_payment.reference_number,
      now()::date,
      v_payment.payment_method,
      v_payment.payer_type,
      'payment',
      v_reference,
      auth.uid(),
      true
    )
    RETURNING id INTO v_entry_id;
  ELSE
    SELECT id INTO v_entry_id FROM public.financial_entries WHERE reference_label = v_reference LIMIT 1;
  END IF;

  PERFORM public.log_payment_event(p_payment_id, 'confirmed', 'pending', 'confirmed', jsonb_build_object('financial_entry_id', v_entry_id));
  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can reject payments';
  END IF;

  SELECT payment_status INTO v_status FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Only pending payments can be rejected'; END IF;

  UPDATE public.payments SET payment_status = 'rejected' WHERE id = p_payment_id;
  PERFORM public.log_payment_event(p_payment_id, 'rejected', v_status, 'rejected', jsonb_build_object('reason', COALESCE(p_reason, '')));
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_payment(
  p_payment_id uuid,
  p_financial_entry_id uuid,
  p_allocated_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_payment_amount numeric;
  v_payment_status text;
  v_existing_payment_allocated numeric;
  v_existing_entry_allocated numeric;
  v_entry_amount numeric;
  v_allocation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can allocate payments';
  END IF;

  IF COALESCE(p_allocated_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Allocation amount must be positive';
  END IF;

  SELECT amount, payment_status INTO v_payment_amount, v_payment_status
  FROM public.payments
  WHERE id = p_payment_id;

  IF v_payment_status IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment_status <> 'confirmed' THEN RAISE EXCEPTION 'Only confirmed payments can be allocated'; END IF;

  SELECT amount INTO v_entry_amount FROM public.financial_entries WHERE id = p_financial_entry_id;
  IF v_entry_amount IS NULL THEN RAISE EXCEPTION 'Financial entry not found'; END IF;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_payment_allocated
  FROM public.payment_allocations
  WHERE payment_id = p_payment_id;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_entry_allocated
  FROM public.payment_allocations
  WHERE financial_entry_id = p_financial_entry_id;

  IF v_existing_payment_allocated + p_allocated_amount > v_payment_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds confirmed payment amount';
  END IF;

  IF v_existing_entry_allocated + p_allocated_amount > v_entry_amount THEN
    RAISE EXCEPTION 'Payment allocation exceeds financial entry amount';
  END IF;

  INSERT INTO public.payment_allocations(payment_id, financial_entry_id, allocated_amount)
  VALUES (p_payment_id, p_financial_entry_id, p_allocated_amount)
  RETURNING id INTO v_allocation_id;

  PERFORM public.log_payment_event(
    p_payment_id,
    'allocated',
    'confirmed',
    'confirmed',
    jsonb_build_object('financial_entry_id', p_financial_entry_id, 'allocated_amount', p_allocated_amount)
  );

  RETURN v_allocation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_outstanding_balance(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS TABLE(expected_amount numeric, paid_amount numeric, outstanding_amount numeric, reconciliation_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH relevant_entries AS (
    SELECT id, amount
    FROM public.financial_entries
    WHERE (
      (type = 'income' AND p_entity_type = 'deal' AND deal_id = p_entity_id)
      OR (type = 'income' AND p_entity_type = 'customer' AND customer_id = p_entity_id)
      OR (p_entity_type = 'settlement' AND reference_label = 'PARTNER-SETTLEMENT-' || p_entity_id::text || '-APPROVED')
    )
  ),
  totals AS (
    SELECT
      COALESCE((SELECT SUM(amount) FROM relevant_entries), 0) AS expected_amount,
      COALESCE((
        SELECT SUM(pa.allocated_amount)
        FROM public.payment_allocations pa
        WHERE pa.financial_entry_id IN (SELECT id FROM relevant_entries)
      ), 0) AS paid_amount
  )
  SELECT
    expected_amount,
    paid_amount,
    GREATEST(expected_amount - paid_amount, 0) AS outstanding_amount,
    CASE
      WHEN expected_amount = 0 THEN 'unpaid'
      WHEN paid_amount >= expected_amount THEN 'fully_paid'
      WHEN paid_amount > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END AS reconciliation_status
  FROM totals;
$$;

CREATE OR REPLACE FUNCTION public.mark_partner_settlement_paid(p_settlement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_lourex_role();
  v_settlement public.partner_settlements%ROWTYPE;
  v_payment_id uuid;
  v_payment_reference text;
  v_entry_id uuid;
  v_approval_entry_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('owner', 'operations_employee') THEN
    RAISE EXCEPTION 'Only owner or operations can mark partner settlements paid';
  END IF;

  SELECT * INTO v_settlement
  FROM public.partner_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN RAISE EXCEPTION 'Partner settlement not found'; END IF;
  IF v_settlement.status <> 'approved' THEN RAISE EXCEPTION 'Only approved settlements can be marked paid'; END IF;

  v_payment_reference := 'SET-PAY-' || p_settlement_id::text;

  SELECT id INTO v_payment_id FROM public.payments WHERE reference_number = v_payment_reference LIMIT 1;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments(
      reference_number,
      payer_type,
      payer_id,
      related_settlement_id,
      amount,
      currency,
      payment_method,
      payment_status,
      received_at
    )
    VALUES (
      v_payment_reference,
      'internal',
      auth.uid(),
      p_settlement_id,
      v_settlement.net_due,
      'SAR',
      'settlement_payment',
      'confirmed',
      now()
    )
    RETURNING id INTO v_payment_id;

    PERFORM public.log_payment_event(v_payment_id, 'created', NULL, 'confirmed', jsonb_build_object('related_settlement_id', p_settlement_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE reference_label = 'PAYMENT-' || v_payment_id::text || '-CONFIRMED'
  ) THEN
    INSERT INTO public.financial_entries(
      entry_number,
      type,
      scope,
      relation_type,
      amount,
      currency,
      note,
      entry_date,
      method,
      counterparty,
      category,
      reference_label,
      created_by,
      locked
    )
    VALUES (
      'FE-PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      'expense',
      'global',
      'general',
      v_settlement.net_due,
      'SAR',
      'Settlement payment for ' || v_settlement.partner_role || ' period ' || v_settlement.settlement_period,
      now()::date,
      'settlement_payment',
      v_settlement.partner_role,
      'partner_settlement_payment',
      'PAYMENT-' || v_payment_id::text || '-CONFIRMED',
      auth.uid(),
      true
    )
    RETURNING id INTO v_entry_id;
  ELSE
    SELECT id INTO v_entry_id
    FROM public.financial_entries
    WHERE reference_label = 'PAYMENT-' || v_payment_id::text || '-CONFIRMED'
    LIMIT 1;
  END IF;

  SELECT id INTO v_approval_entry_id
  FROM public.financial_entries
  WHERE reference_label = 'PARTNER-SETTLEMENT-' || p_settlement_id::text || '-APPROVED'
  LIMIT 1;

  IF v_approval_entry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.payment_allocations
    WHERE payment_id = v_payment_id AND financial_entry_id = v_approval_entry_id
  ) THEN
    INSERT INTO public.payment_allocations(payment_id, financial_entry_id, allocated_amount)
    VALUES (v_payment_id, v_approval_entry_id, v_settlement.net_due);
  END IF;

  PERFORM set_config('app.lourex_rpc_action', 'partner_settlement_workflow', true);

  UPDATE public.partner_settlements
  SET status = 'paid',
      paid_at = now()
  WHERE id = p_settlement_id;

  PERFORM public.log_payment_event(v_payment_id, 'allocated', 'confirmed', 'confirmed', jsonb_build_object('related_settlement_id', p_settlement_id));
  PERFORM public.log_partner_settlement_event(p_settlement_id, 'marked_paid', v_settlement.status, 'paid', jsonb_build_object('payment_id', v_payment_id, 'financial_entry_id', v_entry_id));
END;
$$;

REVOKE ALL ON FUNCTION public.log_payment_event(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment(text, uuid, uuid, uuid, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_payment(uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_outstanding_balance(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_payment(text, uuid, uuid, uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_payment(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outstanding_balance(text, uuid) TO authenticated;


-- ============================================================================
-- Original migration: 20260428260000_fix_transfer_proof_documents_storage.sql
-- ============================================================================

-- Ensure private transfer proof storage exists and is scoped to the owning customer request.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS "Customers can upload own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can upload own transfer proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'customer-portal'
  AND (storage.foldername(name))[2] = 'requests'
  AND (storage.foldername(name))[3] IS NOT NULL
  AND (storage.foldername(name))[4] = 'transfer-proof'
  AND public.current_lourex_role() = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.purchase_requests pr
    WHERE pr.id::text = (storage.foldername(name))[3]
      AND pr.customer_id = auth.uid()
      AND pr.status IN ('ready_for_conversion', 'transfer_proof_rejected')
  )
);

DROP POLICY IF EXISTS "Customers can read own transfer proofs" ON storage.objects;
CREATE POLICY "Customers can read own transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[3] IS NOT NULL
      AND (storage.foldername(name))[4] = 'transfer-proof'
      AND EXISTS (
        SELECT 1
        FROM public.purchase_requests pr
        WHERE pr.id::text = (storage.foldername(name))[3]
          AND pr.customer_id = auth.uid()
      )
    )
    OR (
      (storage.foldername(name))[1] = 'transfer-proofs'
      AND (storage.foldername(name))[2] IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.purchase_requests pr
        WHERE pr.id::text = (storage.foldername(name))[2]
          AND pr.customer_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Internal users can read transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can read transfer proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
);

DROP POLICY IF EXISTS "Internal users can manage transfer proofs" ON storage.objects;
CREATE POLICY "Internal users can manage transfer proofs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_lourex_internal(auth.uid())
  AND (
    (
      (storage.foldername(name))[1] = 'customer-portal'
      AND (storage.foldername(name))[2] = 'requests'
      AND (storage.foldername(name))[4] = 'transfer-proof'
    )
    OR (storage.foldername(name))[1] = 'transfer-proofs'
  )
);

