-- Supplier packing list persistence.
-- Stores origin-side packing submissions with line-level dimensions for CBM and gross weight review.

CREATE TABLE IF NOT EXISTS public.supplier_packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_reference text NOT NULL,
  shipment_id uuid NULL REFERENCES public.shipments(id) ON DELETE SET NULL,
  deal_id uuid NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  submitted_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_by_role text NOT NULL,
  total_cbm numeric(12, 3) NOT NULL DEFAULT 0,
  total_weight_kg numeric(12, 3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'superseded', 'approved')),
  source text NOT NULL DEFAULT 'admin_packing_list_tool',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_packing_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id uuid NOT NULL REFERENCES public.supplier_packing_lists(id) ON DELETE CASCADE,
  item_index integer NOT NULL DEFAULT 0,
  item_name text NOT NULL DEFAULT '',
  length_cm numeric(12, 3) NOT NULL DEFAULT 0,
  width_cm numeric(12, 3) NOT NULL DEFAULT 0,
  height_cm numeric(12, 3) NOT NULL DEFAULT 0,
  weight_kg numeric(12, 3) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  item_cbm numeric(12, 3) NOT NULL DEFAULT 0,
  item_total_weight_kg numeric(12, 3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_packing_lists_reference
  ON public.supplier_packing_lists(shipment_reference);

CREATE INDEX IF NOT EXISTS idx_supplier_packing_lists_shipment
  ON public.supplier_packing_lists(shipment_id);

CREATE INDEX IF NOT EXISTS idx_supplier_packing_lists_deal
  ON public.supplier_packing_lists(deal_id);

CREATE INDEX IF NOT EXISTS idx_supplier_packing_items_list
  ON public.supplier_packing_list_items(packing_list_id, item_index);

ALTER TABLE public.supplier_packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_packing_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_packing_lists_select ON public.supplier_packing_lists;
CREATE POLICY supplier_packing_lists_select
ON public.supplier_packing_lists
FOR SELECT
USING (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
);

DROP POLICY IF EXISTS supplier_packing_lists_insert ON public.supplier_packing_lists;
CREATE POLICY supplier_packing_lists_insert
ON public.supplier_packing_lists
FOR INSERT
WITH CHECK (
  public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner')
);

DROP POLICY IF EXISTS supplier_packing_items_select ON public.supplier_packing_list_items;
CREATE POLICY supplier_packing_items_select
ON public.supplier_packing_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.supplier_packing_lists spl
    WHERE spl.id = supplier_packing_list_items.packing_list_id
      AND public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner', 'saudi_partner')
  )
);

DROP POLICY IF EXISTS supplier_packing_items_insert ON public.supplier_packing_list_items;
CREATE POLICY supplier_packing_items_insert
ON public.supplier_packing_list_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.supplier_packing_lists spl
    WHERE spl.id = supplier_packing_list_items.packing_list_id
      AND public.current_lourex_role() IN ('owner', 'operations_employee', 'turkish_partner')
  )
);

CREATE OR REPLACE FUNCTION public.submit_supplier_packing_list(
  p_shipment_reference text,
  p_items jsonb,
  p_total_cbm numeric,
  p_total_weight_kg numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_list_id uuid;
  v_shipment_id uuid;
  v_deal_id uuid;
  v_item jsonb;
  v_index integer := 0;
  v_length numeric;
  v_width numeric;
  v_height numeric;
  v_weight numeric;
  v_quantity integer;
  v_item_cbm numeric;
  v_item_total_weight numeric;
BEGIN
  v_role := public.current_lourex_role();

  IF v_role NOT IN ('owner', 'operations_employee', 'turkish_partner') THEN
    RAISE EXCEPTION 'Current role cannot submit supplier packing lists';
  END IF;

  IF COALESCE(btrim(p_shipment_reference), '') = '' THEN
    RAISE EXCEPTION 'Shipment reference is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one packing item is required';
  END IF;

  SELECT s.id, s.deal_id
  INTO v_shipment_id, v_deal_id
  FROM public.shipments s
  LEFT JOIN public.deals d ON d.id = s.deal_id
  WHERE s.id::text = p_shipment_reference
     OR s.tracking_id = p_shipment_reference
     OR d.deal_number = p_shipment_reference
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.supplier_packing_lists (
    shipment_reference,
    shipment_id,
    deal_id,
    submitted_by,
    submitted_by_role,
    total_cbm,
    total_weight_kg,
    status
  )
  VALUES (
    btrim(p_shipment_reference),
    v_shipment_id,
    v_deal_id,
    auth.uid(),
    v_role,
    GREATEST(COALESCE(p_total_cbm, 0), 0),
    GREATEST(COALESCE(p_total_weight_kg, 0), 0),
    'submitted'
  )
  RETURNING id INTO v_list_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_index := v_index + 1;
    v_length := GREATEST(COALESCE(NULLIF(v_item->>'lengthCm', '')::numeric, 0), 0);
    v_width := GREATEST(COALESCE(NULLIF(v_item->>'widthCm', '')::numeric, 0), 0);
    v_height := GREATEST(COALESCE(NULLIF(v_item->>'heightCm', '')::numeric, 0), 0);
    v_weight := GREATEST(COALESCE(NULLIF(v_item->>'weightKg', '')::numeric, 0), 0);
    v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 1);
    v_item_cbm := ROUND((v_length * v_width * v_height * v_quantity) / 1000000.0, 3);
    v_item_total_weight := ROUND(v_weight * v_quantity, 3);

    INSERT INTO public.supplier_packing_list_items (
      packing_list_id,
      item_index,
      item_name,
      length_cm,
      width_cm,
      height_cm,
      weight_kg,
      quantity,
      item_cbm,
      item_total_weight_kg
    )
    VALUES (
      v_list_id,
      v_index,
      COALESCE(NULLIF(btrim(v_item->>'itemName'), ''), format('Item %s', v_index)),
      v_length,
      v_width,
      v_height,
      v_weight,
      v_quantity,
      v_item_cbm,
      v_item_total_weight
    );
  END LOOP;

  INSERT INTO public.audit_logs (action, table_name, record_id, changed_by, new_values)
  VALUES (
    'supplier_packing_list.submitted',
    'supplier_packing_lists',
    v_list_id::text,
    auth.uid(),
    jsonb_build_object(
      'shipment_reference', p_shipment_reference,
      'shipment_id', v_shipment_id,
      'deal_id', v_deal_id,
      'total_cbm', p_total_cbm,
      'total_weight_kg', p_total_weight_kg,
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_list_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_supplier_packing_list(text, jsonb, numeric, numeric) TO authenticated;
