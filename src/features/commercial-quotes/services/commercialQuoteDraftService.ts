import { supabase } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";

const db = supabase as unknown as LooseDomainClient;

type DraftRow = {
  id: string;
  quote_number: string;
  source_request_id: string;
  status: "draft" | "approved" | "issued" | "accepted" | "changes_requested" | "declined";
  currency: string;
  created_at: string;
  customer_id: string;
  payment_terms: string;
  delivery_terms: string;
  incoterm: string;
  lead_time: string;
  validity_days: number;
  shipping_cost: number;
  discount_amount: number;
  internal_notes: string;
  approved_at: string | null;
  issued_at: string | null;
  customer_response_note: string;
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
  paymentTerms: string;
  deliveryTerms: string;
  incoterm: string;
  leadTime: string;
  validityDays: number;
  shippingCost: number;
  discountAmount: number;
  internalNotes: string;
  approvedAt: string | null;
  issuedAt: string | null;
  customerResponseNote: string;
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
    .select("id,quote_number,source_request_id,status,currency,created_at,customer_id,payment_terms,delivery_terms,incoterm,lead_time,validity_days,shipping_cost,discount_amount,internal_notes,approved_at,issued_at,customer_response_note")
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
    status: header.status,
    currency: header.currency,
    createdAt: header.created_at,
    customerId: header.customer_id,
    paymentTerms: header.payment_terms,
    deliveryTerms: header.delivery_terms,
    incoterm: header.incoterm,
    leadTime: header.lead_time,
    validityDays: header.validity_days,
    shippingCost: Number(header.shipping_cost),
    discountAmount: Number(header.discount_amount),
    internalNotes: header.internal_notes,
    approvedAt: header.approved_at,
    issuedAt: header.issued_at,
    customerResponseNote: header.customer_response_note,
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

export type CommercialQuotePricingInput = {
  currency: string;
  paymentTerms: string;
  deliveryTerms: string;
  incoterm: string;
  leadTime: string;
  validityDays: number;
  shippingCost: string;
  discountAmount: string;
  internalNotes: string;
  lines: Array<{ itemId: string; unitPrice: string }>;
};

const PRICE_PATTERN = /^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,4})?$/;
const MONEY_PATTERN = /^(?:0|[1-9][0-9]{0,10})(?:\.[0-9]{1,2})?$/;

const requireMoney = (raw: string, name: string): number => {
  const text = raw.trim();
  if (!MONEY_PATTERN.test(text) || Number(text) > 10000000000) {
    throw new Error(`Invalid ${name}: enter a nonnegative amount with at most two decimal places.`);
  }
  return Number(text);
};

export const validateQuotePricingInput = (quote: CommercialQuoteDraft, draft: CommercialQuotePricingInput) => {
  if (!["USD", "EUR", "TRY", "SAR", "AED"].includes(draft.currency)) {
    throw new Error("Choose a supported currency");
  }
  if (!Number.isInteger(draft.validityDays) || draft.validityDays < 1 || draft.validityDays > 365) {
    throw new Error("Quote validity must be between 1 and 365 days");
  }
  if (draft.paymentTerms.length > 2000 || draft.deliveryTerms.length > 2000 ||
      draft.incoterm.length > 120 || draft.leadTime.length > 240 ||
      draft.internalNotes.length > 2000) {
    throw new Error("One or more commercial terms exceed the allowed length");
  }
  if (draft.lines.length !== quote.items.length || new Set(draft.lines.map(x => x.itemId)).size !== quote.items.length ||
      draft.lines.some(x => !quote.items.some(i => i.id === x.itemId))) {
    throw new Error("Every quotation line must appear exactly once");
  }
  const prices = draft.lines.map(x => {
    const amount = x.unitPrice.trim();
    if (amount && (!PRICE_PATTERN.test(amount) || Number(amount) > 9999999999)) {
      throw new Error("Unit prices must be nonnegative numbers with up to 4 decimal places");
    }
    return { item_id: x.itemId, unit_price: amount ? Number(amount) : null };
  });
  return {
    p_quote_id: quote.id,
    p_currency: draft.currency,
    p_payment_terms: draft.paymentTerms.trim(),
    p_delivery_terms: draft.deliveryTerms.trim(),
    p_incoterm: draft.incoterm.trim(),
    p_lead_time: draft.leadTime.trim(),
    p_validity_days: draft.validityDays,
    p_shipping_cost: requireMoney(draft.shippingCost, "shipping cost"),
    p_discount_amount: requireMoney(draft.discountAmount, "discount"),
    p_internal_notes: draft.internalNotes.trim(),
    p_line_prices: prices,
  };
};

export const saveCommercialQuotePricing = async (
  quote: CommercialQuoteDraft,
  input: CommercialQuotePricingInput,
): Promise<CommercialQuoteDraft> => {
  const params = validateQuotePricingInput(quote, input);
  const { data, error } = await db.rpc<Array<{ quote_id: string; subtotal: number | null; total: number | null; fully_priced: boolean }>>(
    "save_commercial_quote_draft", params,
  );
  if (error) throw new Error(error.message);
  if (!data?.[0] || data[0].quote_id !== quote.id) throw new Error("Saved quotation receipt was not returned");
  const reloaded = await fetchCommercialQuoteDraft(quote.requestId);
  if (!reloaded || reloaded.id !== quote.id) throw new Error("Quotation was saved but could not be refreshed");
  return reloaded;
};
