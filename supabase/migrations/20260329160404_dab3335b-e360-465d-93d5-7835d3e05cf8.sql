
-- 1. Extend app_role enum with buyer and factory roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'factory';

-- 2. Factories table
CREATE TABLE public.factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  description text DEFAULT '',
  logo_url text DEFAULT '',
  is_verified boolean NOT NULL DEFAULT false,
  reliability_score numeric DEFAULT 0,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

-- Public can browse factories
CREATE POLICY "Anyone can view factories" ON public.factories FOR SELECT USING (true);
-- Admins manage factories
CREATE POLICY "Admins can insert factories" ON public.factories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update factories" ON public.factories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete factories" ON public.factories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Factory owners can update their own
CREATE POLICY "Factory owners can update own factory" ON public.factories FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());

-- 3. Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text DEFAULT '',
  moq text DEFAULT '',
  dimensions text DEFAULT '',
  weight_per_unit numeric DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Factory owners can manage own products" ON public.products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.factories WHERE id = factory_id AND owner_user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.factories WHERE id = factory_id AND owner_user_id = auth.uid())
);

-- 4. Orders table (with escrow/milestone payment tracking)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  factory_id uuid REFERENCES public.factories(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  quantity integer NOT NULL DEFAULT 1,
  weight_kg numeric NOT NULL DEFAULT 0,
  total_pallets integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  balance_amount numeric DEFAULT 0,
  balance_paid boolean DEFAULT false,
  payment_status text NOT NULL DEFAULT 'awaiting_deposit',
  shipping_tracking_id text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers see only their orders
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid());
-- Admins see all
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Factory owners see orders for their factory
CREATE POLICY "Factory owners can view factory orders" ON public.orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.factories WHERE id = factory_id AND owner_user_id = auth.uid())
);
-- Admins can manage orders
CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Buyers can create orders
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- 5. Order Documents table
CREATE TABLE public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

-- Buyers see docs for their orders
CREATE POLICY "Buyers can view own order docs" ON public.order_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
);
-- Factory owners see docs for their orders
CREATE POLICY "Factory owners can view order docs" ON public.order_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.factories f ON o.factory_id = f.id WHERE o.id = order_id AND f.owner_user_id = auth.uid())
);
-- Admins full access
CREATE POLICY "Admins can manage order docs" ON public.order_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Factory owners can upload docs
CREATE POLICY "Factory owners can upload docs" ON public.order_documents FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.factories f ON o.factory_id = f.id WHERE o.id = order_id AND f.owner_user_id = auth.uid())
);

-- 6. Audit Logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_values jsonb DEFAULT '{}',
  new_values jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Support Tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  subject text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  resolution text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. KYC Documents table (for verification)
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doc_type text NOT NULL,
  file_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC docs" ON public.kyc_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upload KYC docs" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all KYC docs" ON public.kyc_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update KYC docs" ON public.kyc_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Add verification_status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

-- 10. Triggers for updated_at
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
