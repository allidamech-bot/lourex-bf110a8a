import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/domain/audit/service";
import {
  getCurrentUserContext,
  getLourexDomainAvailability,
  getInternalNotificationRecipients,
  createNotifications,
  loadDeals,
  safeStructuredSelect,
  safeStructuredSelectWhereEq,
} from "@/lib/operationsDomain";
import type {
  FinancialEntryRow,
  FinancialEditRequestRow,
  CustomerRow,
  ProfileRow,
} from "@/lib/operationsDomain";
import type { FinancialEntry, FinancialEditRequest } from "@/types/lourex";
import type { OperationalDeal } from "@/lib/operationsDomain";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { canManageAccounting, isValidRole } from "@/features/auth/rbac";
import {
  hasMeaningfulFinancialEditChange,
  isValidFinancialCurrency,
  isValidFinancialEntryDate,
  normalizeFinancialCurrency,
  sanitizeFinancialEditProposal,
  validateFinancialEntryInput,
} from "@/domain/accounting/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
};

const assertValidFinancialEditProposal = (proposal: Record<string, unknown>) => {
  if ("amount" in proposal && (!Number.isFinite(Number(proposal.amount)) || Number(proposal.amount) <= 0)) {
    throw new Error("The financial amount must be greater than zero.");
  }

  if ("currency" in proposal && !isValidFinancialCurrency(String(proposal.currency || ""))) {
    throw new Error("A valid 3-letter currency code is required.");
  }

  if ("entryDate" in proposal && !isValidFinancialEntryDate(String(proposal.entryDate || ""))) {
    throw new Error("A valid financial entry date is required.");
  }

  if ("entry_date" in proposal && !isValidFinancialEntryDate(String(proposal.entry_date || ""))) {
    throw new Error("A valid financial entry date is required.");
  }
};

export const getFinancialOperationErrorMessage = (error: unknown) => {
  const message = getSupabaseErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("row-level security") || normalized.includes("unauthorized")) {
    return "You do not have permission to complete this financial action.";
  }

  if (normalized.includes("append-only") || normalized.includes("locked financial entries cannot")) {
    return "Locked financial entries cannot be edited directly. Submit an edit request for approval.";
  }

  if (normalized.includes("customer must match linked deal")) {
    return "The selected customer does not match the linked deal.";
  }

  if (normalized.includes("financial entry linked deal does not exist") || normalized.includes("linked deal could not be found")) {
    return "The linked deal could not be found for this financial entry.";
  }

  if (normalized.includes("financial entry amount") || normalized.includes("amount must")) {
    return "The financial amount must be greater than zero.";
  }

  if (normalized.includes("financial entry date") || normalized.includes("invalid input syntax for type date")) {
    return "A valid financial entry date is required.";
  }

  return message || "The financial action could not be completed.";
};

const assertAccountingActor = async (allowCustomerRead = false) => {
  const context = await getCurrentUserContext();
  const role = context.profile?.role;

  if (!context.user || !context.profile || !isValidRole(role)) {
    throw new Error("Authentication required.");
  }

  if (!allowCustomerRead && !canManageAccounting(role)) {
    throw new Error("Your current role does not permit accounting management.");
  }

  return context;
};

export const loadFinancialEntries = async (options: { deals?: OperationalDeal[] } = {}): Promise<FinancialEntry[]> => {
  const { profile } = await assertAccountingActor(true);
  const isCustomer = profile?.role === "customer";

  const [entries, deals, customers] = await Promise.all([
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<FinancialEntryRow>("financial_entries", "customer_id", profile.id)
      : safeStructuredSelect<FinancialEntryRow>("financial_entries"),
    options.deals ? Promise.resolve(options.deals) : loadDeals(),
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<CustomerRow>("lourex_customers", "id", profile.id)
      : safeStructuredSelect<CustomerRow>("lourex_customers"),
  ]);

  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const customerMap = new Map((customers || []).map((row) => [row.id, row]));

  return (entries || [])
    .map((row) => {
      const relationType = (
        row.relation_type || (row.deal_id ? "deal_linked" : row.customer_id ? "customer_linked" : "general")
      ) as FinancialEntry["relationType"];

      return {
        id: row.id,
        entryNumber: row.entry_number,
        scope: relationType === "deal_linked" ? "deal" : relationType === "customer_linked" ? "customer" : "global",
        relationType,
        dealId: row.deal_id || undefined,
        dealNumber: row.deal_id ? dealMap.get(row.deal_id)?.dealNumber : undefined,
        customerId: row.customer_id || undefined,
        customerName: row.customer_id ? customerMap.get(row.customer_id)?.full_name : undefined,
        type: row.type,
        amount: Number(row.amount || 0),
        currency: row.currency || "SAR",
        locked: Boolean(row.locked),
        createdBy: row.created_by || "",
        createdAt: row.created_at,
        entryDate: row.entry_date || row.created_at,
        method: row.method || "",
        counterparty: row.counterparty || "",
        category: row.category || "",
        referenceLabel: row.reference_label || "",
        note: row.note || "",
      } satisfies FinancialEntry;
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const createFinancialEntry = async (input: {
  dealId?: string;
  customerId?: string;
  type: "income" | "expense";
  scope: "deal_linked" | "global";
  amount: number;
  currency: string;
  note: string;
  method: string;
  counterparty: string;
  category: string;
  entryDate: string;
  referenceLabel?: string;
}) => {
  const { user } = await assertAccountingActor();
  if (!user) throw new Error("Authentication required.");
  if (!(await getLourexDomainAvailability())) throw new Error("The Lourex domain must be activated in Supabase first.");

  const validationError = validateFinancialEntryInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedCurrency = normalizeFinancialCurrency(input.currency);
  const normalizedNote = input.note.trim();
  const normalizedMethod = input.method.trim();
  const normalizedCounterparty = input.counterparty.trim();
  const normalizedCategory = input.category.trim();
  const normalizedReferenceLabel = input.referenceLabel?.trim() || "";

  if (input.dealId) {
    const linkedDeal = (await loadDeals()).find((deal) => deal.id === input.dealId);

    if (!linkedDeal) {
      throw new Error("The linked deal could not be found for this financial entry.");
    }

    if (input.customerId && linkedDeal.customerId !== input.customerId) {
      throw new Error("The selected customer does not match the linked deal.");
    }
  }

  const entryNumber = `FE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const relationType =
    input.scope === "deal_linked" ? "deal_linked" : input.customerId ? "customer_linked" : "general";

  const inserted = await db.rpc("create_locked_financial_entry", {
    p_entry_number: entryNumber,
    p_deal_id: input.dealId || null,
    p_customer_id: input.customerId || null,
    p_type: input.type,
    p_scope: input.scope,
    p_relation_type: relationType,
    p_amount: input.amount,
    p_currency: normalizedCurrency,
    p_note: normalizedNote,
    p_entry_date: input.entryDate,
    p_method: normalizedMethod,
    p_counterparty: normalizedCounterparty,
    p_category: normalizedCategory,
    p_reference_label: normalizedReferenceLabel,
  });

  if (inserted.error) {
    logOperationalError("financial_entry_create", inserted.error, {
      flow: "accounting",
      dealId: input.dealId || null,
      customerId: input.customerId || null,
    });
    throw inserted.error;
  }

  trackEvent("financial_entry_created", {
    flow: "accounting",
    dealId: input.dealId || null,
    customerId: input.customerId || null,
    scope: input.scope,
    type: input.type,
    currency: normalizedCurrency,
  });

  return { id: inserted.data, entry_number: entryNumber };
};

export const loadFinancialEditRequests = async (): Promise<FinancialEditRequest[]> => {
  await assertAccountingActor();

  const [rows, entries, deals, customers, profiles] = await Promise.all([
    safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests"),
    loadFinancialEntries(),
    loadDeals(),
    safeStructuredSelect<CustomerRow>("lourex_customers"),
    safeStructuredSelect<ProfileRow>("profiles", "id, full_name"),
  ]);

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const customerMap = new Map((customers || []).map((row) => [row.id, row]));
  const profileMap = new Map((profiles || []).map((row) => [row.id, row]));

  return (rows || [])
    .map((row) => ({
      id: row.id,
      financialEntryId: row.financial_entry_id,
      targetEntryNumber: row.financial_entry_id ? entryMap.get(row.financial_entry_id)?.entryNumber || "" : "",
      dealId: row.deal_id || undefined,
      dealNumber: row.deal_id ? dealMap.get(row.deal_id)?.dealNumber : undefined,
      customerId: row.customer_id || undefined,
      customerName: row.customer_id ? customerMap.get(row.customer_id)?.full_name : undefined,
      requestedBy: row.requested_by_name,
      requestedByEmail: row.requested_by_email,
      reason: row.request_reason || row.reason,
      status: row.status,
      submittedAt: row.created_at,
      reviewedAt: row.reviewed_at || null,
      reviewerName: row.reviewer_id ? profileMap.get(row.reviewer_id)?.full_name || "" : "",
      reviewNote: row.review_note || "",
      oldValue: (row.old_value as Record<string, unknown>) || {},
      proposedValue:
        (row.proposed_changes as Record<string, unknown>) ||
        (row.proposed_value as Record<string, unknown>) ||
        {},
    }))
    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
};

export const createFinancialEditRequest = async (input: {
  financialEntryId: string;
  dealId?: string;
  customerId?: string;
  requester: string;
  email: string;
  reason: string;
  oldValue: Record<string, unknown>;
  proposedValue: Record<string, unknown>;
}) => {
  const { user } = await assertAccountingActor();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  const normalizedRequester = input.requester.trim();
  const normalizedEmail = input.email.trim();
  const normalizedReason = input.reason.trim();
  const sanitizedProposal = sanitizeFinancialEditProposal(input.proposedValue);

  if (!input.financialEntryId || !normalizedRequester || !normalizedEmail || !normalizedReason) {
    throw new Error("يجب استكمال بيانات طلب التعديل المالي.");
  }

  if (normalizedReason.length < 10) {
    throw new Error("Please provide a clear reason for the financial edit request.");
  }

  if (!hasMeaningfulFinancialEditChange(input.oldValue, sanitizedProposal)) {
    throw new Error("The financial edit request must include a meaningful proposed change.");
  }
  assertValidFinancialEditProposal(sanitizedProposal);

  const entryRows = await safeStructuredSelect<FinancialEntryRow>("financial_entries");
  const targetEntry = entryRows.find((row) => row.id === input.financialEntryId);
  if (!targetEntry) {
    throw new Error("The requested financial entry could not be found.");
  }
  const linkedDealId = input.dealId || targetEntry.deal_id || null;
  const linkedDealNumber = linkedDealId
    ? (await loadDeals()).find((deal) => deal.id === linkedDealId)?.dealNumber || null
    : null;

  if (!targetEntry.locked) {
    throw new Error("Only locked financial entries can be updated through edit requests.");
  }

  if (targetEntry.deal_id && input.dealId && targetEntry.deal_id !== input.dealId) {
    throw new Error("The edit request deal does not match the target financial entry.");
  }

  if (targetEntry.customer_id && input.customerId && targetEntry.customer_id !== input.customerId) {
    throw new Error("The edit request customer does not match the target financial entry.");
  }

  const insertedRequest = await db.rpc("request_financial_entry_edit", {
    p_financial_entry_id: input.financialEntryId,
    p_reason: normalizedReason,
    p_proposed_changes: sanitizedProposal,
    p_requested_by_name: normalizedRequester,
    p_requested_by_email: normalizedEmail,
  });

  if (insertedRequest.error) {
    logOperationalError("financial_edit_request_create", insertedRequest.error, {
      flow: "accounting",
      financialEntryId: input.financialEntryId,
      dealId: input.dealId || null,
    });
    throw insertedRequest.error;
  }

  await writeAuditLog({
    action: "financial_entry.edit_requested",
    tableName: "financial_edit_requests",
    recordId: insertedRequest.data,
    newValues: {
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || targetEntry.deal_id || null,
      customer_id: input.customerId || targetEntry.customer_id || null,
      summary: `Financial edit request submitted for ${targetEntry.entry_number}.`,
      entity_label: targetEntry.entry_number || input.financialEntryId,
      reason: normalizedReason,
    },
  });

  const recipients = await getInternalNotificationRecipients();
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request",
      title: "New financial edit request",
      message: linkedDealNumber
        ? `Entry ${targetEntry.entry_number} requires review for deal ${linkedDealNumber}.`
        : `Entry ${targetEntry.entry_number} requires financial review.`,
      link: linkedDealNumber
        ? `/dashboard/edit-requests?deal=${linkedDealNumber}&entry=${targetEntry.entry_number}`
        : `/dashboard/edit-requests?entry=${targetEntry.entry_number}`,
    })),
  );

  trackEvent("financial_edit_request_submitted", {
    flow: "accounting",
    financialEntryId: input.financialEntryId,
    dealId: input.dealId || targetEntry.deal_id || null,
    hasDeal: Boolean(input.dealId || targetEntry.deal_id),
    hasCustomer: Boolean(input.customerId || targetEntry.customer_id),
  });

  return { id: insertedRequest.data };
};

export const updateFinancialEditRequestStatus = async (
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string,
) => {
  const { user } = await assertAccountingActor();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  const currentRows = await safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests");
  const current = currentRows.find((row) => row.id === id);
  if (!current) throw new Error("تعذر العثور على طلب التعديل المالي.");
  if (current.status !== "pending") throw new Error("لا يمكن مراجعة طلب تمت معالجته مسبقاً.");

  const normalizedReviewNote = reviewNote?.trim() || "";
  const sanitizedProposal = sanitizeFinancialEditProposal(
    ((current.proposed_changes || current.proposed_value) as Record<string, unknown>) || {},
  );
  if (status === "approved" && !hasMeaningfulFinancialEditChange((current.old_value as Record<string, unknown>) || {}, sanitizedProposal)) {
    throw new Error("This edit request no longer contains a valid financial change to approve.");
  }
  if (status === "approved") {
    assertValidFinancialEditProposal(sanitizedProposal);
  }

  const updated = await db.rpc("review_financial_entry_edit_request", {
    p_request_id: id,
    p_status: status,
    p_review_note: normalizedReviewNote,
  });

  if (updated.error) {
    logOperationalError("financial_edit_request_review", updated.error, {
      flow: "accounting",
      id,
      status,
    });
    throw updated.error;
  }

  const reviewedDealNumber = current.deal_id
    ? (await loadDeals()).find((deal) => deal.id === current.deal_id)?.dealNumber || null
    : null;
  const targetEntryNumber =
    (await loadFinancialEntries()).find((entry) => entry.id === current.financial_entry_id)?.entryNumber ||
    current.financial_entry_id ||
    id;

  await writeAuditLog({
    action: `financial_edit_request.${status}`,
    tableName: "financial_edit_requests",
    recordId: id,
    oldValues: { status: current.status || "pending" },
    newValues: {
      status,
      financial_entry_id: current.financial_entry_id,
      deal_id: current.deal_id,
      correction_entry_id: updated.data || null,
      review_note: normalizedReviewNote,
      summary:
        status === "approved"
          ? `Financial edit request approved for ${targetEntryNumber}.`
          : `Financial edit request rejected for ${targetEntryNumber}.`,
      entity_label: targetEntryNumber,
    },
  });

  const recipients = await getInternalNotificationRecipients([current.created_by]);
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request_review",
      title: status === "approved" ? "Financial edit request approved" : "Financial edit request rejected",
      message:
        status === "approved"
          ? reviewedDealNumber
            ? `Entry ${targetEntryNumber} was approved for deal ${reviewedDealNumber}.`
            : `Entry ${targetEntryNumber} was approved.`
          : reviewedDealNumber
            ? `Entry ${targetEntryNumber} was rejected for deal ${reviewedDealNumber}.`
            : `Entry ${targetEntryNumber} was rejected.`,
      link: reviewedDealNumber
        ? `/dashboard/edit-requests?deal=${reviewedDealNumber}&entry=${targetEntryNumber}`
        : `/dashboard/edit-requests?entry=${targetEntryNumber}`,
    })),
  );

  trackEvent("financial_edit_request_reviewed", {
    flow: "accounting",
    financialEntryId: current.financial_entry_id || null,
    dealId: current.deal_id || null,
    status,
  });

  return { id, status, correctionEntryId: updated.data || null };
};
