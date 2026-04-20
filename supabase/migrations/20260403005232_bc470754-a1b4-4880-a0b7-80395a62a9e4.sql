
-- 1. Prevent users from changing their own verification_status
CREATE OR REPLACE FUNCTION public.prevent_verification_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
    AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.verification_status := OLD.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_verification_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verification_status_change();

-- 2. Prevent non-admin deal participants from modifying structural fields
CREATE OR REPLACE FUNCTION public.protect_deal_structural_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF OLD.total_value IS DISTINCT FROM NEW.total_value
      OR OLD.client_id IS DISTINCT FROM NEW.client_id
      OR OLD.supplier_id IS DISTINCT FROM NEW.supplier_id
      OR OLD.broker_id IS DISTINCT FROM NEW.broker_id
      OR OLD.factory_id IS DISTINCT FROM NEW.factory_id
      OR OLD.currency IS DISTINCT FROM NEW.currency
      OR OLD.deal_number IS DISTINCT FROM NEW.deal_number THEN
      RAISE EXCEPTION 'Only admins may modify deal structural fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_deal_structural_fields
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_deal_structural_fields();
