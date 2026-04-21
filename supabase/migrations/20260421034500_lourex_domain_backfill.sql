CREATE POLICY "Admins can update financial edit requests"
  ON public.financial_edit_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.extract_legacy_line(source text, label text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  match text[];
BEGIN
  IF source IS NULL OR source = '' THEN
    RETURN '';
  END IF;

  match := regexp_match(source, '(?:^|\n)' || regexp_replace(label, '([.^$|()\\[\\]{}*+?\\\\-])', '\\\1', 'g') || ':\s*([^\n]+)');

  IF match IS NULL OR array_length(match, 1) = 0 THEN
    RETURN '';
  END IF;

  RETURN btrim(match[1]);
END;
$$;

INSERT INTO public.lourex_customers (full_name, phone, email, country, city)
SELECT DISTINCT
  i.name,
  COALESCE(i.phone, ''),
  i.email,
  btrim(split_part(COALESCE(i.company, ''), '-', 1)),
  btrim(split_part(COALESCE(i.company, ''), '-', 2))
FROM public.inquiries i
WHERE i.inquiry_type = 'purchase_request'
  AND COALESCE(i.email, '') <> ''
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone = CASE WHEN COALESCE(EXCLUDED.phone, '') <> '' THEN EXCLUDED.phone ELSE public.lourex_customers.phone END,
  country = CASE WHEN COALESCE(EXCLUDED.country, '') <> '' THEN EXCLUDED.country ELSE public.lourex_customers.country END,
  city = CASE WHEN COALESCE(EXCLUDED.city, '') <> '' THEN EXCLUDED.city ELSE public.lourex_customers.city END;

INSERT INTO public.purchase_requests (
  request_number,
  source_inquiry_id,
  customer_id,
  status,
  full_name,
  phone,
  email,
  country,
  city,
  product_name,
  product_description,
  quantity,
  size_dimensions,
  color,
  material,
  technical_specs,
  reference_link,
  preferred_shipping_method,
  delivery_notes,
  image_urls,
  submitted_at,
  created_at,
  updated_at
)
SELECT
  COALESCE(NULLIF(public.extract_legacy_line(i.message, 'Request Number'), ''), 'PR-' || left(i.id::text, 8)),
  i.id,
  c.id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND (a.record_id = i.id::text OR a.new_values ->> 'request_id' = i.id::text)
    ) THEN 'converted_to_deal'
    ELSE 'under_review'
  END,
  i.name,
  COALESCE(i.phone, ''),
  i.email,
  btrim(split_part(COALESCE(i.company, ''), '-', 1)),
  btrim(split_part(COALESCE(i.company, ''), '-', 2)),
  public.extract_legacy_line(i.message, 'Product'),
  public.extract_legacy_line(i.message, 'Description'),
  GREATEST(COALESCE(NULLIF(public.extract_legacy_line(i.message, 'Quantity'), '')::integer, 1), 1),
  public.extract_legacy_line(i.message, 'Size/Dimensions'),
  public.extract_legacy_line(i.message, 'Color'),
  public.extract_legacy_line(i.message, 'Material'),
  public.extract_legacy_line(i.message, 'Technical Specs'),
  public.extract_legacy_line(i.message, 'Reference Link'),
  public.extract_legacy_line(i.message, 'Preferred Shipping Method'),
  public.extract_legacy_line(i.message, 'Delivery Notes'),
  CASE
    WHEN public.extract_legacy_line(i.message, 'Request Images') = '' OR public.extract_legacy_line(i.message, 'Request Images') = 'N/A' THEN ARRAY[]::text[]
    ELSE string_to_array(replace(public.extract_legacy_line(i.message, 'Request Images'), ', ', ','), ',')
  END,
  i.created_at,
  i.created_at,
  now()
FROM public.inquiries i
LEFT JOIN public.lourex_customers c ON c.email = i.email
WHERE i.inquiry_type = 'purchase_request'
  AND NOT EXISTS (
    SELECT 1 FROM public.purchase_requests pr WHERE pr.source_inquiry_id = i.id
  );

UPDATE public.deals d
SET
  source_request_id = COALESCE(
    d.source_request_id,
    (
      SELECT pr.id
      FROM public.purchase_requests pr
      WHERE pr.id = NULLIF(public.extract_legacy_line(d.notes, 'Source Request Id'), '')::uuid
      LIMIT 1
    ),
    (
      SELECT (a.new_values ->> 'request_id')::uuid
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND (
          a.new_values ->> 'deal_number' = d.deal_number OR
          a.new_values ->> 'deal_id' = d.id::text
        )
      ORDER BY a.created_at DESC
      LIMIT 1
    )
  ),
  customer_id = COALESCE(
    d.customer_id,
    (
      SELECT pr.customer_id
      FROM public.purchase_requests pr
      WHERE pr.id = NULLIF(public.extract_legacy_line(d.notes, 'Source Request Id'), '')::uuid
      LIMIT 1
    ),
    (
      SELECT pr.customer_id
      FROM public.purchase_requests pr
      WHERE pr.id = (
        SELECT (a.new_values ->> 'request_id')::uuid
        FROM public.audit_logs a
        WHERE a.action = 'purchase_request.converted_to_deal'
          AND (
            a.new_values ->> 'deal_number' = d.deal_number OR
            a.new_values ->> 'deal_id' = d.id::text
          )
        ORDER BY a.created_at DESC
        LIMIT 1
      )
      LIMIT 1
    ),
    (
      SELECT c.id
      FROM public.lourex_customers c
      WHERE c.email = public.extract_legacy_line(d.notes, 'Customer Email')
      LIMIT 1
    )
  ),
  operation_title = CASE
    WHEN COALESCE(d.operation_title, '') <> '' THEN d.operation_title
    ELSE COALESCE(
      NULLIF(public.extract_legacy_line(d.notes, 'Product'), ''),
      'صفقة تشغيلية'
    )
  END,
  accounting_reference = CASE
    WHEN COALESCE(d.accounting_reference, '') <> '' THEN d.accounting_reference
    ELSE 'ACC-' || d.deal_number
  END;

UPDATE public.shipments s
SET
  deal_id = COALESCE(
    s.deal_id,
    (
      SELECT d.id
      FROM public.deals d
      WHERE d.shipment_id = s.id
      LIMIT 1
    ),
    (
      SELECT (a.new_values ->> 'deal_id')::uuid
      FROM public.audit_logs a
      WHERE a.action = 'purchase_request.converted_to_deal'
        AND a.new_values ->> 'tracking_id' = s.tracking_id
      ORDER BY a.created_at DESC
      LIMIT 1
    )
  ),
  current_stage_code = CASE
    WHEN COALESCE(s.current_stage_code, '') <> '' THEN s.current_stage_code
    WHEN s.status = 'factory' THEN 'product_preparation'
    WHEN s.status = 'warehouse' THEN 'transfer_to_warehouse'
    WHEN s.status = 'shipping' THEN 'in_transit'
    WHEN s.status = 'customs' THEN 'destination_customs'
    WHEN s.status = 'delivered' THEN 'delivered'
    ELSE 'deal_accepted'
  END;

UPDATE public.deals d
SET shipment_id = COALESCE(d.shipment_id, s.id)
FROM public.shipments s
WHERE s.deal_id = d.id
  AND d.shipment_id IS NULL;

CREATE OR REPLACE FUNCTION public.backfill_lourex_domain()
RETURNS TABLE (
  customers_count bigint,
  purchase_requests_count bigint,
  linked_deals_count bigint,
  linked_shipments_count bigint
)
LANGUAGE sql
AS $$
  SELECT
    (SELECT count(*) FROM public.lourex_customers),
    (SELECT count(*) FROM public.purchase_requests),
    (SELECT count(*) FROM public.deals WHERE source_request_id IS NOT NULL OR customer_id IS NOT NULL),
    (SELECT count(*) FROM public.shipments WHERE deal_id IS NOT NULL);
$$;
