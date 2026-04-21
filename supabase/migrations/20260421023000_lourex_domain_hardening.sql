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
