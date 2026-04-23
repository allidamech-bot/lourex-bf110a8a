import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/domain/audit/service";
import {
  getCurrentUserContext,
  getLourexDomainAvailability,
  getInternalNotificationRecipients,
  createNotifications,
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
  normalizeFinancialCurrency,
  sanitizeFinancialEditProposal,
  validateFinancialEntryInput,
} from "@/domain/accounting/utils";

type ActiveFinancialEditRequestInsert = {
  financial_entry_id: string;
  deal_id: string | null;
  customer_id: string | null;
  requested_by_name: string;
  requested_by_email: string;
  reason: string;
  old_value: Record<string, unknown>;
  proposed_value: Record<string, unknown>;
  created_by: string;
};

const insertActiveFinancialEditRequest = async (payload: ActiveFinancialEditRequestInsert) =>
  supabase
    .from("financial_edit_requests")
    .insert(payload as never)
    .select("*")
    .single();

const assertAccountingActor = async (allowCustomerRead = false) => {
  const context = await getCurrentUserContext();
  const role = context.profile?.role;

  if (!context.user || !context.profile || !isValidRole(role)) {
    throw new Error("ظٹط¬ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط£ظˆظ„ط§ظ‹.");
  }

  if (!allowCustomerRead && !canManageAccounting(role)) {
    throw new Error("طµظ„ط§ط­ظٹط§طھظƒ ط§ظ„ط­ط§ظ„ظٹط© ظ„ط§ طھط³ظ…ط­ ط¨ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط­ط§ط³ط¨ط©.");
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
    options.deals ? Promise.resolve(options.deals) : import("@/lib/operationsDomain").then((m) => m.loadDeals()),
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
  scope: "deal_linked" | "global" | "customer_linked";
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
  if (!user) throw new Error("ظٹط¬ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط£ظˆظ„ط§ظ‹.");
  if (!(await getLourexDomainAvailability())) throw new Error("ظٹط¬ط¨ طھظپط¹ظٹظ„ ظ…ط®ط·ط· Lourex ط§ظ„ط¬ط¯ظٹط¯ ط£ظˆظ„ط§ظ‹ ظپظٹ Supabase.");

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
    const { loadDeals } = await import("@/lib/operationsDomain");
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
    input.scope === "deal_linked" ? "deal_linked" : input.scope === "customer_linked" ? "customer_linked" : "general";

  const inserted = await supabase
    .from("financial_entries")
    .insert({
      entry_number: entryNumber,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      type: input.type,
      scope: input.scope,
      relation_type: relationType,
      amount: input.amount,
      currency: normalizedCurrency,
      note: normalizedNote,
      entry_date: input.entryDate,
      method: normalizedMethod,
      counterparty: normalizedCounterparty,
      category: normalizedCategory,
      reference_label: normalizedReferenceLabel,
      created_by: user.id,
      locked: true,
    })
    .select("*")
    .single();

  if (inserted.error) {
    logOperationalError("financial_entry_create", inserted.error, { dealId: input.dealId || null });
    throw inserted.error;
  }

  await writeAuditLog({
    action: "financial_entry.created",
    tableName: "financial_entries",
    recordId: inserted.data.id,
    newValues: {
      entry_number: entryNumber,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      amount: input.amount,
      currency: normalizedCurrency,
      type: input.type,
      summary: `ط¥ظ†ط´ط§ط، ظ‚ظٹط¯ ظ…ط§ظ„ظٹ ${entryNumber}`,
      entity_label: entryNumber,
    },
  });

  trackEvent("financial_entry_created", {
    scope: input.scope,
    type: input.type,
    currency: normalizedCurrency,
  });

  return inserted.data;
};

export const loadFinancialEditRequests = async (): Promise<FinancialEditRequest[]> => {
  await assertAccountingActor();

  const [rows, entries, deals, customers, profiles] = await Promise.all([
    safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests"),
    loadFinancialEntries(),
    import("@/lib/operationsDomain").then((m) => m.loadDeals()),
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
      reason: row.reason,
      status: row.status,
      submittedAt: row.created_at,
      reviewedAt: row.reviewed_at || null,
      reviewerName: row.reviewer_id ? profileMap.get(row.reviewer_id)?.full_name || "" : "",
      reviewNote: row.review_note || "",
      oldValue: (row.old_value as Record<string, unknown>) || {},
      proposedValue: (row.proposed_value as Record<string, unknown>) || {},
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
  if (!user) throw new Error("ظٹط¬ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط£ظˆظ„ط§ظ‹.");
  if (!(await getLourexDomainAvailability())) throw new Error("ظٹط¬ط¨ طھظپط¹ظٹظ„ ظ…ط®ط·ط· Lourex ط§ظ„ط¬ط¯ظٹط¯ ط£ظˆظ„ط§ظ‹ ظپظٹ Supabase.");

  const normalizedRequester = input.requester.trim();
  const normalizedEmail = input.email.trim();
  const normalizedReason = input.reason.trim();
  const sanitizedProposal = sanitizeFinancialEditProposal(input.proposedValue);

  if (!input.financialEntryId || !normalizedRequester || !normalizedEmail || !normalizedReason) {
    throw new Error("ظٹط¬ط¨ ط§ط³طھظƒظ…ط§ظ„ ط¨ظٹط§ظ†ط§طھ ط·ظ„ط¨ ط§ظ„طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط§ظ„ظٹ.");
  }

  if (normalizedReason.length < 10) {
    throw new Error("Please provide a clear reason for the financial edit request.");
  }

  if (!hasMeaningfulFinancialEditChange(input.oldValue, sanitizedProposal)) {
    throw new Error("The financial edit request must include a meaningful proposed change.");
  }

  const entryRows = await safeStructuredSelect<FinancialEntryRow>("financial_entries");
  const targetEntry = entryRows.find((row) => row.id === input.financialEntryId);
  if (!targetEntry) {
    throw new Error("The requested financial entry could not be found.");
  }

  if (!targetEntry.locked) {
    throw new Error("Only locked financial entries can be updated through edit requests.");
  }

  if (targetEntry.deal_id && input.dealId && targetEntry.deal_id !== input.dealId) {
    throw new Error("The edit request deal does not match the target financial entry.");
  }

  if (targetEntry.customer_id && input.customerId && targetEntry.customer_id !== input.customerId) {
    throw new Error("The edit request customer does not match the target financial entry.");
  }

  const insertedRequest = await insertActiveFinancialEditRequest({
    financial_entry_id: input.financialEntryId,
    deal_id: input.dealId || targetEntry.deal_id || null,
    customer_id: input.customerId || targetEntry.customer_id || null,
    requested_by_name: normalizedRequester,
    requested_by_email: normalizedEmail,
    reason: normalizedReason,
    old_value: sanitizeFinancialEditProposal(input.oldValue),
    proposed_value: sanitizedProposal,
    created_by: user.id,
  });

  if (insertedRequest.error) {
    logOperationalError("financial_edit_request_create", insertedRequest.error, {
      financialEntryId: input.financialEntryId,
      dealId: input.dealId || null,
    });
    throw insertedRequest.error;
  }

  await writeAuditLog({
    action: "financial_entry.edit_requested",
    tableName: "financial_edit_requests",
    recordId: insertedRequest.data.id,
    newValues: {
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || targetEntry.deal_id || null,
      customer_id: input.customerId || targetEntry.customer_id || null,
      summary: "طھظ… ط¥ظ†ط´ط§ط، ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ظ…ط§ظ„ظٹ",
      entity_label: input.financialEntryId,
      reason: normalizedReason,
    },
  });

  const recipients = await getInternalNotificationRecipients();
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request",
      title: "طھظ… ط±ظپط¹ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ظ…ط§ظ„ظٹ",
      message: `ظٹظˆط¬ط¯ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ط¬ط¯ظٹط¯ ط¹ظ„ظ‰ ط§ظ„ظ‚ظٹط¯ ${input.financialEntryId}.`,
      link: input.dealId ? `/dashboard/edit-requests?deal=${input.dealId}` : "/dashboard/edit-requests",
    })),
  );

  trackEvent("financial_edit_request_submitted", {
    hasDeal: Boolean(input.dealId || targetEntry.deal_id),
    hasCustomer: Boolean(input.customerId || targetEntry.customer_id),
  });

  return insertedRequest.data;
};

export const updateFinancialEditRequestStatus = async (
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string,
) => {
  const { user } = await assertAccountingActor();
  if (!user) throw new Error("ظٹط¬ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط£ظˆظ„ط§ظ‹.");
  if (!(await getLourexDomainAvailability())) throw new Error("ظٹط¬ط¨ طھظپط¹ظٹظ„ ظ…ط®ط·ط· Lourex ط§ظ„ط¬ط¯ظٹط¯ ط£ظˆظ„ط§ظ‹ ظپظٹ Supabase.");

  const currentRows = await safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests");
  const current = currentRows.find((row) => row.id === id);
  if (!current) throw new Error("طھط¹ط°ط± ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط·ظ„ط¨ ط§ظ„طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط§ظ„ظٹ.");
  if (current.status !== "pending") throw new Error("ظ„ط§ ظٹظ…ظƒظ† ظ…ط±ط§ط¬ط¹ط© ط·ظ„ط¨ طھظ…طھ ظ…ط¹ط§ظ„ط¬طھظ‡ ظ…ط³ط¨ظ‚ط§ظ‹.");

  const normalizedReviewNote = reviewNote?.trim() || "";
  const sanitizedProposal = sanitizeFinancialEditProposal((current.proposed_value as Record<string, unknown>) || {});
  if (status === "approved" && !hasMeaningfulFinancialEditChange((current.old_value as Record<string, unknown>) || {}, sanitizedProposal)) {
    throw new Error("This edit request no longer contains a valid financial change to approve.");
  }

  const updated = await supabase
    .from("financial_edit_requests")
    .update({
      status,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: normalizedReviewNote,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updated.error) {
    logOperationalError("financial_edit_request_review", updated.error, { id, status });
    throw updated.error;
  }

  if (status === "approved" && updated.data.financial_entry_id) {
    const entryUpdate = await supabase
      .from("financial_entries")
      .update({
        ...(sanitizedProposal as Record<string, unknown>),
        locked: true,
      })
      .eq("id", updated.data.financial_entry_id)
      .eq("locked", true);

    if (entryUpdate.error) {
      logOperationalError("financial_entry_apply_edit", entryUpdate.error, {
        id,
        financialEntryId: updated.data.financial_entry_id,
      });
      throw entryUpdate.error;
    }
  }

  await writeAuditLog({
    action: `financial_edit_request.${status}`,
    tableName: "financial_edit_requests",
    recordId: id,
    oldValues: { status: current.status || "pending" },
    newValues: {
      status,
      financial_entry_id: updated.data.financial_entry_id,
      deal_id: updated.data.deal_id,
      review_note: normalizedReviewNote,
      summary: status === "approved" ? "طھظ…طھ ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ظ…ط§ظ„ظٹ" : "طھظ… ط±ظپط¶ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ظ…ط§ظ„ظٹ",
      entity_label: updated.data.financial_entry_id || id,
    },
  });

  const recipients = await getInternalNotificationRecipients([current.created_by]);
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request_review",
      title: status === "approved" ? "طھظ…طھ ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط·ظ„ط¨ ط§ظ„طھط¹ط¯ظٹظ„" : "طھظ… ط±ظپط¶ ط·ظ„ط¨ ط§ظ„طھط¹ط¯ظٹظ„",
      message:
        status === "approved"
          ? `طھظ…طھ ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظ‰ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ط§ظ„ظ‚ظٹط¯ ${updated.data.financial_entry_id}.`
          : `طھظ… ط±ظپط¶ ط·ظ„ط¨ طھط¹ط¯ظٹظ„ ط§ظ„ظ‚ظٹط¯ ${updated.data.financial_entry_id}.`,
      link: updated.data.deal_id ? `/dashboard/edit-requests?deal=${updated.data.deal_id}` : "/dashboard/edit-requests",
    })),
  );

  trackEvent("financial_edit_request_reviewed", { status });

  return updated.data;
};
