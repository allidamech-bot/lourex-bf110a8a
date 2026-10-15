import { supabase } from "@/integrations/supabase/client";
import { fetchCommercialQuoteDraft, type CommercialQuoteDraft } from "@/features/commercial-quotes/services/commercialQuoteDraftService";

export type QuoteStatus = "draft" | "approved" | "issued" | "accepted" | "changes_requested" | "declined";
export type CustomerQuotation = {
  id: string; number: string; requestId: string; versionNo: number; status: QuoteStatus;
  currency: string; approvedAt: string | null; issuedAt: string | null;
  respondedAt: string | null; responseNote: string;
  paymentTerms: string; deliveryTerms: string; incoterm: string; leadTime: string;
  validityDays: number; shippingCost: number; discountAmount: number;
  items: Array<{ lineNumber: number; name: string; quantity: number; unit: string;
    specifications: string; moq: string; packaging: string; origin: string; unitPrice: number }>;
};

type RpcClient = {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown; error: { message: string } | null;
  }>;
};
const rpc = supabase as unknown as RpcClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const updateQuotationState = async (
  quote: CommercialQuoteDraft, action: "approve" | "issue",
): Promise<CommercialQuoteDraft> => {
  if (!UUID.test(quote.id)) throw new Error("Invalid quotation ID");
  const fn = action === "approve" ? "approve_commercial_quote" : "issue_commercial_quote";
  const { data, error } = await rpc.rpc(fn, { p_quote_id: quote.id });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data[0]?.quote_id !== quote.id) throw new Error("Quotation state confirmation was not received");
  const fresh = await fetchCommercialQuoteDraft(quote.requestId);
  if (!fresh) throw new Error("Quotation updated; refresh to retrieve its state");
  return fresh;
};

export const fetchCustomerQuotation = async (requestId: string, versionId?: string): Promise<CustomerQuotation | null> => {
  if (!UUID.test(requestId)) return null;
  if (versionId && !UUID.test(versionId)) return null;
  const { data, error } = versionId
    ? await rpc.rpc("get_customer_commercial_quote_version", { p_quote_id: versionId })
    : await rpc.rpc("get_customer_commercial_quote", { p_request_id: requestId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid quotation received");
  const q = data as Record<string, unknown>;
  if (!UUID.test(String(q.id || "")) || !Array.isArray(q.items) || !q.items.length ||
      !["issued","accepted","changes_requested","declined"].includes(String(q.status))) {
    throw new Error("Invalid issued quotation");
  }
  return {
    id: String(q.id), number: String(q.number || ""), requestId: String(q.requestId || ""),
    versionNo: Number(q.versionNo || 1),
    status: q.status as QuoteStatus, currency: String(q.currency || "USD"),
    approvedAt: q.approvedAt ? String(q.approvedAt) : null,
    issuedAt: q.issuedAt ? String(q.issuedAt) : null,
    respondedAt: q.respondedAt ? String(q.respondedAt) : null,
    responseNote: String(q.responseNote || ""),
    paymentTerms: String(q.paymentTerms || ""), deliveryTerms: String(q.deliveryTerms || ""),
    incoterm: String(q.incoterm || ""), leadTime: String(q.leadTime || ""),
    validityDays: Number(q.validityDays), shippingCost: Number(q.shippingCost),
    discountAmount: Number(q.discountAmount),
    items: (q.items as Record<string, unknown>[]).map(i => ({
      lineNumber: Number(i.lineNumber), name: String(i.name || ""),
      quantity: Number(i.quantity), unit: String(i.unit || ""),
      specifications: String(i.specifications || ""), moq: String(i.moq || ""),
      packaging: String(i.packaging || ""), origin: String(i.origin || ""),
      unitPrice: Number(i.unitPrice),
    })),
  };
};

export type CustomerQuoteVersion = {
  id: string; number: string; versionNo: number; status: QuoteStatus; issuedAt: string | null;
};
export const fetchCustomerQuoteVersions = async (requestId: string): Promise<CustomerQuoteVersion[]> => {
  if (!UUID.test(requestId)) return [];
  const { data, error } = await rpc.rpc("get_customer_commercial_quote_versions", { p_request_id: requestId });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("Quotation history could not be verified");
  return (data as Record<string, unknown>[]).map(x => ({
    id: String(x.id), number: String(x.number || ""), versionNo: Number(x.versionNo),
    status: x.status as QuoteStatus, issuedAt: x.issuedAt ? String(x.issuedAt) : null,
  })).filter(x => UUID.test(x.id) && Number.isInteger(x.versionNo) &&
    x.versionNo > 0 && ["issued","accepted","changes_requested","declined"].includes(x.status));
};

export const respondToCustomerQuotation = async (
  q: CustomerQuotation, action: "accepted" | "changes_requested" | "declined", note: string,
) => {
  if (!UUID.test(q.id) || q.status !== "issued" || note.length > 2000) throw new Error("Invalid quotation response");
  if (action === "changes_requested" && note.trim().length < 5) throw new Error("Describe the requested changes");
  const { data, error } = await rpc.rpc("respond_commercial_quote", {
    p_quote_id: q.id, p_action: action, p_note: note.trim(),
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data[0]?.quote_id !== q.id || data[0]?.quote_status !== action)
    throw new Error("Could not verify quotation response");
  return fetchCustomerQuotation(q.requestId);
};

export const emailIssuedCommercialQuote = async (quote: CommercialQuoteDraft) => {
  if (quote.status !== "issued") throw new Error("Only issued quotations can be emailed");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to send this quotation");
  const response = await fetch("/api/lourex-quote-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ quoteId: quote.id }),
  });
  const result = await response.json().catch(() => ({})) as { sent?: boolean; error?: string };
  if (!response.ok || !result.sent) throw new Error(result.error || "Quotation email was not confirmed");
  return result;
};
