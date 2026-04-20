
-- 1. Drop the overly permissive supplier UPDATE policy
DROP POLICY IF EXISTS "Suppliers can update rfq quotes" ON public.rfqs;

-- 2. Create a restricted RPC for supplier quote submission
CREATE OR REPLACE FUNCTION public.supplier_submit_quote(
  p_rfq_id uuid,
  p_offered_price numeric,
  p_valid_until timestamptz DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rfqs
  SET offered_price = p_offered_price,
      valid_until = COALESCE(p_valid_until, valid_until),
      message = COALESCE(p_message, message),
      status = 'quoted',
      updated_at = now()
  WHERE id = p_rfq_id
    AND supplier_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found or access denied';
  END IF;
END;
$$;
