-- R1 reporting RPC authorization boundary, current live-schema-compatible.
-- SECURITY DEFINER bypasses table RLS. All three procedures previously allowed
-- both partner roles to read aggregate customer and company financial details.
-- Explicitly limit these legacy global reports to active owner/operations users.
-- Staging-only until real role-session tests; not applied to production.

CREATE OR REPLACE FUNCTION public.lourex_report_summary(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['owner'::text, 'operations_employee'::text]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'requests', COALESCE((
      SELECT COUNT(*)
      FROM public.purchase_requests
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'deals', COALESCE((
      SELECT COUNT(*)
      FROM public.deals
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'shipments', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
    ), 0),
    'customers', COALESCE((
      SELECT COUNT(*)
      FROM public.lourex_customers
    ), 0),
    'audits', COALESCE((
      SELECT COUNT(*)
      FROM public.audit_logs
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'linked_entries', COALESCE((
      SELECT COUNT(*)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND relation_type IN ('deal_linked', 'customer_linked')
    ), 0),
    'income', COALESCE((
      SELECT SUM(amount)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND type = 'income'
    ), 0),
    'expense', COALESCE((
      SELECT SUM(amount)
      FROM public.financial_entries
      WHERE created_at BETWEEN p_start AND p_end
        AND type = 'expense'
    ), 0),
    'average_operation_value', COALESCE((
      SELECT AVG(COALESCE(total_value, 0))
      FROM public.deals
      WHERE created_at BETWEEN p_start AND p_end
    ), 0),
    'in_transit', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code = 'in_transit'
    ), 0),
    'destination', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code IN ('arrived_destination', 'destination_customs')
    ), 0),
    'delivered', COALESCE((
      SELECT COUNT(*)
      FROM public.shipments
      WHERE updated_at BETWEEN p_start AND p_end
        AND current_stage_code = 'delivered'
    ), 0)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lourex_report_top_customers(p_start timestamp with time zone, p_end timestamp with time zone, p_limit integer DEFAULT 4)
 RETURNS TABLE(customer_id uuid, full_name text, email text, requests_count bigint, deals_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['owner'::text, 'operations_employee'::text]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    customer.id,
    customer.full_name,
    customer.email,
    COALESCE(request_counts.requests_count, 0) AS requests_count,
    COALESCE(deal_counts.deals_count, 0) AS deals_count
  FROM public.lourex_customers customer
  LEFT JOIN (
    SELECT purchase_requests.customer_id, COUNT(*) AS requests_count
    FROM public.purchase_requests
    WHERE purchase_requests.created_at BETWEEN p_start AND p_end
    GROUP BY purchase_requests.customer_id
  ) AS request_counts ON request_counts.customer_id = customer.id
  LEFT JOIN (
    SELECT deals.customer_id, COUNT(*) AS deals_count
    FROM public.deals
    WHERE deals.created_at BETWEEN p_start AND p_end
    GROUP BY deals.customer_id
  ) AS deal_counts ON deal_counts.customer_id = customer.id
  ORDER BY COALESCE(deal_counts.deals_count, 0) DESC, COALESCE(request_counts.requests_count, 0) DESC, customer.full_name
  LIMIT GREATEST(COALESCE(p_limit, 4), 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.lourex_report_top_expense_categories(p_start timestamp with time zone, p_end timestamp with time zone, p_limit integer DEFAULT 4)
 RETURNS TABLE(category text, amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_lourex_role(auth.uid(), ARRAY['owner'::text, 'operations_employee'::text]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(financial_entries.category, ''), 'غير مصنف') AS category,
    COALESCE(SUM(financial_entries.amount), 0) AS amount
  FROM public.financial_entries
  WHERE financial_entries.created_at BETWEEN p_start AND p_end
    AND financial_entries.type = 'expense'
  GROUP BY COALESCE(NULLIF(financial_entries.category, ''), 'غير مصنف')
  ORDER BY amount DESC, category
  LIMIT GREATEST(COALESCE(p_limit, 4), 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.lourex_report_summary(timestamp with time zone,timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_report_summary(timestamp with time zone,timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.lourex_report_top_customers(timestamp with time zone,timestamp with time zone,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_report_top_customers(timestamp with time zone,timestamp with time zone,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.lourex_report_top_expense_categories(timestamp with time zone,timestamp with time zone,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lourex_report_top_expense_categories(timestamp with time zone,timestamp with time zone,integer) TO authenticated;
