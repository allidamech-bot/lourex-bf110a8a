import { supabase } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";

const db = supabase as unknown as LooseDomainClient;

type DraftRow = {
  id: string;
  quote_number: string;
  source_request_id: string;
  status: "draft";
  currency: string;
  created_at: string;
  customer_id: string;
};
type ItemRow = {
  id: string;
  quote_id: string;
  line_number: number;
  product_name: string;
  quantity: number;
  unit: string;
  specifications: string;
  moq_snapshot: string;
  packaging_snapshot: string;
  origin_snapshot: string;
  unit_price: number | null;
};

export type CommercialQuoteDraft = {
  id: string;
  number: string;
  requestId: string;
  status: "draft";
  currency: string;
  createdAt: string;
  customerId: string;
  items: Array<{
    id: string;
    lineNumber: number;
    name: string;
    quantity: number;
    unit: string;
    specifications: string;
    moq: string;
    packaging: string;
    origin: string;
    unitPrice: number | null;
  }>;
};

export const isSmartRfqForCommercialQuote = (requestNumber?: string | null) =>
  Boolean(requestNumber?.startsWith("RFQ-"));

export const fetchCommercialQuoteDraft = async (requestId: string): Promise<CommercialQuoteDraft | null> => {
  const { data: header, error } = await db.from<DraftRow>("commercial_quote_drafts")
    .select("id,quote_number,source_request_id,status,currency,created_at,customer_id")
    .eq("source_request_id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!header) return null;

  const { data: rows, error: itemsError } = await db.from<ItemRow>("commercial_quote_items")
    .select("id,quote_id,line_number,product_name,quantity,unit,specifications,moq_snapshot,packaging_snapshot,origin_snapshot,unit_price")
    .eq("quote_id", header.id)
    .order("line_number", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);
  if (!rows?.length) throw new Error("The quotation draft has no saved lines. Please contact LOUREX support.");

  return {
    id: header.id,
    number: header.quote_number,
    requestId: header.source_request_id,
    status: "draft",
    currency: header.currency,
    createdAt: header.created_at,
    customerId: header.customer_id,
    items: rows.map(item => ({
      id: item.id,
      lineNumber: item.line_number,
      name: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
      specifications: item.specifications,
      moq: item.moq_snapshot,
      packaging: item.packaging_snapshot,
      origin: item.origin_snapshot,
      unitPrice: item.unit_price,
    })),
  };
};

export const createCommercialQuoteDraft = async (requestId: string): Promise<CommercialQuoteDraft> => {
  const { data, error } = await db.rpc<Array<{ quote_id: string; quote_number: string }>>(
    "create_commercial_quote_draft",
    { p_request_id: requestId },
  );
  if (error) throw new Error(error.message);
  if (!data?.[0]?.quote_id) throw new Error("The quotation draft was not saved.");

  const draft = await fetchCommercialQuoteDraft(requestId);
  if (!draft || draft.id !== data[0].quote_id) {
    throw new Error("Quotation saved but cannot be read. Refresh the page before retrying.");
  }
  return draft;
};
