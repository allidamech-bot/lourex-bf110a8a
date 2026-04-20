
-- ============================================================
-- PHASE 1: EXTEND rfqs
-- ============================================================
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS timeline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'targeted'
    CHECK (visibility IN ('targeted','broadcast'));

CREATE INDEX IF NOT EXISTS idx_rfqs_visibility_category
  ON public.rfqs(visibility, category) WHERE status IN ('open','pending');
CREATE INDEX IF NOT EXISTS idx_rfqs_requester ON public.rfqs(requester_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs(status);

-- ============================================================
-- PHASE 2: rfq_recipients (targeted invites)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rfq_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, factory_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_recipients_factory ON public.rfq_recipients(factory_id);
CREATE INDEX IF NOT EXISTS idx_rfq_recipients_rfq ON public.rfq_recipients(rfq_id);

ALTER TABLE public.rfq_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers manage own rfq recipients"
  ON public.rfq_recipients FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.requester_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.requester_id = auth.uid()));

CREATE POLICY "Invited suppliers can view recipient row"
  ON public.rfq_recipients FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.factories f WHERE f.id = factory_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Admins manage rfq recipients"
  ON public.rfq_recipients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- PHASE 3: quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  supplier_user_id uuid NOT NULL,
  price_per_unit numeric NOT NULL CHECK (price_per_unit >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  currency text NOT NULL DEFAULT 'USD',
  moq integer NOT NULL DEFAULT 1 CHECK (moq >= 1),
  lead_time text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, factory_id)
);

CREATE INDEX IF NOT EXISTS idx_quotes_rfq ON public.quotes(rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotes_factory ON public.quotes(factory_id);
CREATE INDEX IF NOT EXISTS idx_quotes_supplier ON public.quotes(supplier_user_id);

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Buyers can view all quotes on their RFQs
CREATE POLICY "Buyers can view quotes on own rfqs"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.requester_id = auth.uid()));

-- Suppliers can view their own quotes
CREATE POLICY "Suppliers view own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    supplier_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.factories f WHERE f.id = factory_id AND f.owner_user_id = auth.uid())
  );

-- Admins
CREATE POLICY "Admins manage quotes"
  ON public.quotes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Direct INSERT/UPDATE blocked at policy level — must go through submit_quote RPC
-- (no INSERT/UPDATE/DELETE policies for non-admins → denied by default)

-- ============================================================
-- PHASE 4: extend orders to link back to rfq + quote
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Strict: at most one order per RFQ
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_rfq_id
  ON public.orders(rfq_id) WHERE rfq_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_quote ON public.orders(quote_id);

-- ============================================================
-- PHASE 5: order_events (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL DEFAULT '',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events(order_id, created_at DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own order events"
  ON public.order_events FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));

CREATE POLICY "Factory owners view order events"
  ON public.order_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.factories f ON f.id = o.factory_id
    WHERE o.id = order_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins manage order events"
  ON public.order_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT only via SECURITY DEFINER functions (no public INSERT policy)

-- ============================================================
-- PHASE 6: Update RLS on rfqs to support invited suppliers + broadcast
-- ============================================================
DROP POLICY IF EXISTS "Suppliers can view received rfqs" ON public.rfqs;

CREATE POLICY "Invited suppliers can view rfqs"
  ON public.rfqs FOR SELECT
  TO authenticated
  USING (
    -- Targeted: supplier was invited
    EXISTS (
      SELECT 1 FROM public.rfq_recipients rr
      JOIN public.factories f ON f.id = rr.factory_id
      WHERE rr.rfq_id = rfqs.id AND f.owner_user_id = auth.uid()
    )
    -- Broadcast: any verified factory owner whose category matches
    OR (
      visibility = 'broadcast'
      AND status IN ('open','pending')
      AND EXISTS (
        SELECT 1 FROM public.factories f
        WHERE f.owner_user_id = auth.uid()
          AND f.is_verified = true
          AND (rfqs.category = '' OR f.category = '' OR f.category = rfqs.category)
      )
    )
    -- Legacy: directly assigned supplier_id
    OR supplier_id = auth.uid()
  );

-- ============================================================
-- PHASE 7: RPCs
-- ============================================================

-- create_rfq: buyer creates RFQ + optional targeted invites
CREATE OR REPLACE FUNCTION public.create_rfq(
  p_title text,
  p_category text,
  p_quantity integer,
  p_target_country text DEFAULT '',
  p_budget_min numeric DEFAULT NULL,
  p_budget_max numeric DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_timeline text DEFAULT '',
  p_notes text DEFAULT '',
  p_visibility text DEFAULT 'targeted',
  p_invited_factory_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq_id uuid;
  v_rfq_number text;
  v_factory_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_verified_user() THEN
    RAISE EXCEPTION 'Only verified users can create RFQs';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;

  IF p_visibility NOT IN ('targeted','broadcast') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;

  v_rfq_number := 'RFQ-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.rfqs (
    rfq_number, requester_id, title, category, quantity,
    target_country, budget_min, budget_max, currency,
    timeline, notes, visibility, status, message
  ) VALUES (
    v_rfq_number, auth.uid(), p_title, COALESCE(p_category, ''), p_quantity,
    COALESCE(p_target_country, ''), p_budget_min, p_budget_max, COALESCE(p_currency, 'USD'),
    COALESCE(p_timeline, ''), COALESCE(p_notes, ''), p_visibility, 'open', COALESCE(p_notes, '')
  )
  RETURNING id INTO v_rfq_id;

  IF p_visibility = 'targeted' AND p_invited_factory_ids IS NOT NULL THEN
    FOREACH v_factory_id IN ARRAY p_invited_factory_ids LOOP
      INSERT INTO public.rfq_recipients (rfq_id, factory_id)
      VALUES (v_rfq_id, v_factory_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_rfq_id;
END;
$$;

-- submit_quote: supplier submits/updates a quote on an RFQ
CREATE OR REPLACE FUNCTION public.submit_quote(
  p_rfq_id uuid,
  p_factory_id uuid,
  p_price_per_unit numeric,
  p_moq integer DEFAULT 1,
  p_lead_time text DEFAULT '',
  p_currency text DEFAULT 'USD',
  p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq public.rfqs%ROWTYPE;
  v_factory public.factories%ROWTYPE;
  v_eligible boolean := false;
  v_quote_id uuid;
  v_total numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_factory FROM public.factories WHERE id = p_factory_id;
  IF NOT FOUND OR v_factory.owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You do not own this supplier account';
  END IF;

  IF NOT v_factory.is_verified THEN
    RAISE EXCEPTION 'Only verified suppliers can submit quotes';
  END IF;

  SELECT * INTO v_rfq FROM public.rfqs WHERE id = p_rfq_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found';
  END IF;

  IF v_rfq.status NOT IN ('open','pending','quoted') THEN
    RAISE EXCEPTION 'This RFQ is no longer accepting quotes';
  END IF;

  -- Eligibility: invited OR broadcast match
  IF EXISTS (SELECT 1 FROM public.rfq_recipients WHERE rfq_id = p_rfq_id AND factory_id = p_factory_id) THEN
    v_eligible := true;
  ELSIF v_rfq.visibility = 'broadcast'
        AND (v_rfq.category = '' OR v_factory.category = '' OR v_rfq.category = v_factory.category) THEN
    v_eligible := true;
  END IF;

  IF NOT v_eligible THEN
    RAISE EXCEPTION 'Your supplier account is not eligible to quote this RFQ';
  END IF;

  IF p_price_per_unit IS NULL OR p_price_per_unit < 0 THEN
    RAISE EXCEPTION 'Price per unit must be non-negative';
  END IF;

  v_total := p_price_per_unit * v_rfq.quantity;

  INSERT INTO public.quotes (
    rfq_id, factory_id, supplier_user_id,
    price_per_unit, total_price, currency, moq, lead_time, notes, status
  ) VALUES (
    p_rfq_id, p_factory_id, auth.uid(),
    p_price_per_unit, v_total, COALESCE(p_currency,'USD'),
    GREATEST(COALESCE(p_moq,1),1), COALESCE(p_lead_time,''), COALESCE(p_notes,''), 'pending'
  )
  ON CONFLICT (rfq_id, factory_id) DO UPDATE
    SET price_per_unit = EXCLUDED.price_per_unit,
        total_price = EXCLUDED.total_price,
        currency = EXCLUDED.currency,
        moq = EXCLUDED.moq,
        lead_time = EXCLUDED.lead_time,
        notes = EXCLUDED.notes,
        status = CASE WHEN public.quotes.status = 'accepted' THEN public.quotes.status ELSE 'pending' END,
        updated_at = now()
  RETURNING id INTO v_quote_id;

  -- Reflect on RFQ
  UPDATE public.rfqs
    SET status = CASE WHEN status = 'open' THEN 'quoted' ELSE status END,
        updated_at = now()
    WHERE id = p_rfq_id;

  RETURN v_quote_id;
END;
$$;

-- accept_quote: buyer accepts a quote → creates the single order, rejects siblings
CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_rfq public.rfqs%ROWTYPE;
  v_existing_order uuid;
  v_order_id uuid;
  v_order_number text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  SELECT * INTO v_rfq FROM public.rfqs WHERE id = v_quote.rfq_id FOR UPDATE;
  IF NOT FOUND OR v_rfq.requester_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the RFQ buyer can accept a quote';
  END IF;

  -- Idempotency: if already an order on this RFQ, return it
  SELECT id INTO v_existing_order FROM public.orders WHERE rfq_id = v_rfq.id LIMIT 1;
  IF v_existing_order IS NOT NULL THEN
    RETURN v_existing_order;
  END IF;

  IF v_quote.status = 'rejected' OR v_quote.status = 'withdrawn' THEN
    RAISE EXCEPTION 'This quote is no longer available';
  END IF;

  -- Mark this quote accepted, others rejected
  UPDATE public.quotes
    SET status = CASE WHEN id = p_quote_id THEN 'accepted' ELSE 'rejected' END,
        updated_at = now()
    WHERE rfq_id = v_rfq.id;

  v_order_number := 'ORD-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,8);

  INSERT INTO public.orders (
    order_number, buyer_id, factory_id, rfq_id, quote_id,
    quantity, total_amount, currency, status, payment_status
  ) VALUES (
    v_order_number, auth.uid(), v_quote.factory_id, v_rfq.id, v_quote.id,
    v_rfq.quantity, v_quote.total_price, v_quote.currency, 'pending', 'awaiting_deposit'
  )
  RETURNING id INTO v_order_id;

  -- Close RFQ
  UPDATE public.rfqs
    SET status = 'converted', updated_at = now()
    WHERE id = v_rfq.id;

  -- Timeline event
  INSERT INTO public.order_events (order_id, event_type, message, actor_id)
  VALUES (v_order_id, 'order_created', 'Order created from accepted quote', auth.uid());

  RETURN v_order_id;
END;
$$;

-- update_order_status: supplier advances production/shipping
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_status text,
  p_message text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_factory public.factories%ROWTYPE;
  v_allowed text[] := ARRAY['confirmed','in_production','quality_check','shipped','delivered'];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (p_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status for supplier update: %', p_status;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT * INTO v_factory FROM public.factories WHERE id = v_order.factory_id;
  IF NOT FOUND OR v_factory.owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the supplier can update this order';
  END IF;

  IF v_order.status = p_status THEN
    RETURN; -- idempotent
  END IF;

  UPDATE public.orders
    SET status = p_status, updated_at = now()
    WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, event_type, message, actor_id)
  VALUES (p_order_id, 'status_' || p_status, COALESCE(p_message, ''), auth.uid());
END;
$$;

-- confirm_delivery: buyer marks order completed
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_order_id uuid, p_message text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can confirm delivery';
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN; -- idempotent
  END IF;

  UPDATE public.orders
    SET status = 'completed', updated_at = now()
    WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, event_type, message, actor_id)
  VALUES (p_order_id, 'delivery_confirmed', COALESCE(p_message,'Buyer confirmed delivery'), auth.uid());
END;
$$;
