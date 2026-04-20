
-- Add 'broker' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'broker';

-- Companies table (for brokers and extended factory data)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'factory' CHECK (type IN ('factory', 'broker', 'trading')),
  owner_id uuid NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'gold_verified')),
  country text DEFAULT '',
  logo_url text DEFAULT '',
  description text DEFAULT '',
  website text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_number text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  supplier_id uuid,
  broker_id uuid,
  factory_id uuid REFERENCES public.factories(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rfq_sent', 'quoted', 'negotiation', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
  total_value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  origin_country text DEFAULT '',
  destination_country text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RFQ (Request for Quotation) table
CREATE TABLE IF NOT EXISTS public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number text NOT NULL UNIQUE,
  deal_id uuid REFERENCES public.deals(id),
  requester_id uuid NOT NULL,
  supplier_id uuid,
  factory_id uuid REFERENCES public.factories(id),
  product_id uuid REFERENCES public.products(id),
  product_name text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  target_price numeric,
  offered_price numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'counter', 'accepted', 'rejected', 'expired')),
  message text DEFAULT '',
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deal messages (negotiation chat)
CREATE TABLE IF NOT EXISTS public.deal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'offer', 'counter_offer', 'system')),
  offer_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

-- Companies RLS
CREATE POLICY "Anyone can view verified companies" ON public.companies FOR SELECT TO public USING (verification_status IN ('verified', 'gold_verified'));
CREATE POLICY "Owners can manage own company" ON public.companies FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can manage all companies" ON public.companies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Deals RLS
CREATE POLICY "Clients can view own deals" ON public.deals FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "Clients can create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Suppliers can view assigned deals" ON public.deals FOR SELECT TO authenticated USING (supplier_id = auth.uid());
CREATE POLICY "Brokers can view assigned deals" ON public.deals FOR SELECT TO authenticated USING (broker_id = auth.uid());
CREATE POLICY "Admins can manage all deals" ON public.deals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Deal participants can update" ON public.deals FOR UPDATE TO authenticated USING (client_id = auth.uid() OR supplier_id = auth.uid() OR broker_id = auth.uid());

-- RFQs RLS
CREATE POLICY "Requesters can manage own rfqs" ON public.rfqs FOR ALL TO authenticated USING (requester_id = auth.uid()) WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Suppliers can view received rfqs" ON public.rfqs FOR SELECT TO authenticated USING (supplier_id = auth.uid());
CREATE POLICY "Suppliers can update rfq quotes" ON public.rfqs FOR UPDATE TO authenticated USING (supplier_id = auth.uid());
CREATE POLICY "Admins can manage all rfqs" ON public.rfqs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Deal messages RLS
CREATE POLICY "Deal participants can view messages" ON public.deal_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_messages.deal_id AND (d.client_id = auth.uid() OR d.supplier_id = auth.uid() OR d.broker_id = auth.uid()))
);
CREATE POLICY "Deal participants can send messages" ON public.deal_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_messages.deal_id AND (d.client_id = auth.uid() OR d.supplier_id = auth.uid() OR d.broker_id = auth.uid()))
);
CREATE POLICY "Admins can manage deal messages" ON public.deal_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime for deal messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_client ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_supplier ON public.deals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_requester ON public.rfqs(requester_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier ON public.rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs(status);
CREATE INDEX IF NOT EXISTS idx_deal_messages_deal ON public.deal_messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_verification ON public.companies(verification_status);

-- Update trigger for deals
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
