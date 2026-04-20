
-- Performance indexes on high-traffic columns
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_factory_id ON public.orders (factory_id);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments (created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments (user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_id ON public.shipments (tracking_id);

CREATE INDEX IF NOT EXISTS idx_products_factory_id ON public.products (factory_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);

CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages (order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON public.audit_logs (changed_by);

CREATE INDEX IF NOT EXISTS idx_organization_staff_owner_id ON public.organization_staff (owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_staff_email ON public.organization_staff (lower(email));

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets (created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles (verification_status);

CREATE INDEX IF NOT EXISTS idx_factories_owner ON public.factories (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_factories_category ON public.factories (category);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents (status);

-- Audit trigger function for automatic logging
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach audit triggers to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_shipments AFTER INSERT OR UPDATE OR DELETE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_factories AFTER INSERT OR UPDATE OR DELETE ON public.factories
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
