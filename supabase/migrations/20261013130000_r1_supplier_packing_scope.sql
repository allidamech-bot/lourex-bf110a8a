-- R1: supplier packing lists were globally visible to both partner roles.
-- The SECURITY DEFINER writer previously accepted arbitrary shipment references.
-- Retain the full original payload and calculations; enforce assignment in RPC.
-- Apply ONLY to isolated staging until live pg_policies + role tests pass.

DROP POLICY IF EXISTS supplier_packing_lists_select ON public.supplier_packing_lists;
CREATE POLICY supplier_packing_lists_select
ON public.supplier_packing_lists FOR SELECT TO authenticated
USING (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  OR (
    public.current_lourex_role() IN ('turkish_partner', 'saudi_partner')
    AND (
      (deal_id IS NOT NULL AND public.lourex_r1_is_assigned_deal(deal_id))
      OR (shipment_id IS NOT NULL AND public.lourex_r1_is_assigned_shipment(shipment_id))
    )
  )
);

-- Partners must use the hardened RPC. They cannot forge rows directly.
DROP POLICY IF EXISTS supplier_packing_lists_insert ON public.supplier_packing_lists;
CREATE POLICY supplier_packing_lists_insert
ON public.supplier_packing_lists FOR INSERT TO authenticated
WITH CHECK (public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee']));

DROP POLICY IF EXISTS supplier_packing_items_select ON public.supplier_packing_list_items;
CREATE POLICY supplier_packing_items_select
ON public.supplier_packing_list_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_packing_lists spl
    WHERE spl.id = supplier_packing_list_items.packing_list_id
      AND (
        public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
        OR (
          public.current_lourex_role() IN ('turkish_partner','saudi_partner')
          AND (
            (spl.deal_id IS NOT NULL AND public.lourex_r1_is_assigned_deal(spl.deal_id))
            OR (spl.shipment_id IS NOT NULL AND public.lourex_r1_is_assigned_shipment(spl.shipment_id))
          )
        )
      )
  )
);
DROP POLICY IF EXISTS supplier_packing_items_insert ON public.supplier_packing_list_items;
CREATE POLICY supplier_packing_items_insert
ON public.supplier_packing_list_items FOR INSERT TO authenticated
WITH CHECK (
  public.is_lourex_role(auth.uid(), ARRAY['owner','operations_employee'])
  AND EXISTS (
    SELECT 1 FROM public.supplier_packing_lists spl
    WHERE spl.id = supplier_packing_list_items.packing_list_id
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

  -- SECURITY DEFINER bypasses table RLS. Enforce row ownership explicitly.
  IF v_role = 'turkish_partner' AND (
    v_shipment_id IS NULL
    OR v_deal_id IS NULL
    OR NOT public.lourex_r1_is_assigned_deal(v_deal_id)
  ) THEN
    RAISE EXCEPTION 'R1: supplier packing list shipment is not assigned to partner';
  END IF;

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


REVOKE ALL ON FUNCTION public.submit_supplier_packing_list(text,jsonb,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_supplier_packing_list(text,jsonb,numeric,numeric) TO authenticated;
