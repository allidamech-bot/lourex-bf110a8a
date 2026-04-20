
-- Milestone enforcement: prevent order from moving to shipping/customs without deposit paid
CREATE OR REPLACE FUNCTION public.enforce_milestone_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('shipped', 'customs', 'delivered') AND (NEW.deposit_paid IS NOT TRUE) THEN
    RAISE EXCEPTION 'Cannot move order to % status without deposit being paid', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_milestone_before_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_milestone_payment();

CREATE TRIGGER enforce_milestone_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_milestone_payment();

-- Admins can view all profiles (for KYC management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
