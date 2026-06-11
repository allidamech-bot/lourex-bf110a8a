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
import {
  canApproveAccountingEdit,
  canCreateAccountingEntry,
  canRequestAccountingEdit,
  canViewAccounting,
  isValidRole,
  type LourexRole,
} from "@/features/auth/rbac";
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

type AccountingPermission = "view" | "create" | "request_edit" | "approve_edit";

const accountingPermissionMessages: Record<AccountingPermission, string> = {
  view: "Your current role does not permit viewing accounting data.",
  create: "Your current role does not permit creating accounting entries.",
  request_edit: "Your current role does not permit requesting accounting edits.",
  approve_edit: "Your current role does not permit approving or rejecting accounting edit requests.",
};

const accountingPermissionChecks: Record<AccountingPermission, (role: LourexRole) => boolean> = {
  view: canViewAccounting,
  create: canCreateAccountingEntry,
  request_edit: canRequestAccountingEdit,
  approve_edit: canApproveAccountingEdit,
};

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
};

const isTransientSupabaseReadError = (error: unknown) => {
  const message = getSupabaseErrorMessage(error).toLowerCase();
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : Number.NaN;

  return (
    status === 503 ||
    status === 504 ||
    status === 502 ||
    message.includes("failed to load") ||
    message.includes("service unavailable") ||
    message.includes("network") ||
    message.includes("timeout")
  );
};

const safeAccountingRead = async <T,>(label: string, reader: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await reader();
  } catch (error) {
    if (isTransientSupabaseReadError(error)) {
      logOperationalError("accounting_read_transient_unavailable", error, { label });
      return fallback;
    }

    throw error;
  }
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

const assertAccountingActor = async (permission: AccountingPermission) => {
  const context = await getCurrentUserContext();
  const role = context.profile?.role;

  if (!context.user || !context.profile || !isValidRole(role)) {
    throw new Error("Authentication required.");
  }

  if (!accountingPermissionChecks[permission](role)) {
    throw new Error(accountingPermissionMessages[permission]);
  }

  return context;
};

const filterRowsByVisibleDeals = <T extends { deal_id?: string | null }>(rows: T[], deals: OperationalDeal[]) => {
  const visibleDealIds = new Set(deals.map((deal) => deal.id));
  return rows.filter((row) => row.deal_id && visibleDealIds.has(row.deal_id));
};

export const loadFinancialEntries = async (options: { deals?: OperationalDeal[] } = {}): Promise<FinancialEntry[]> => {
  const { profile } = await assertAccountingActor("view");
  const isScopedPartnerView = profile.role === "saudi_partner";

  const deals = options.deals || await safeAccountingRead("loadDeals", () => loadDeals(), [] as OperationalDeal[]);
  const [rawEntries, customers] = await Promise.all([
    safeAccountingRead("financial_entries", () => safeStructuredSelect<FinancialEntryRow>("financial_entries"), [] as FinancialEntryRow[]),
    isScopedPartnerView
      ? Promise.resolve([] as CustomerRow[])
      : safeAccountingRead("lourex_customers", () => safeStructuredSelect<CustomerRow>("lourex_customers"), [] as CustomerRow[]),
  ]);
  const entries = isScopedPartnerView ? filterRowsByVisibleDeals(rawEntries || [], deals) : rawEntries;

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
  try {
    const { user } = await assertAccountingActor("create");
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
      if (linkedDeal.operationalStatus === "closed") {
        throw new Error("Cannot add financial entries to a closed deal. Create an adjustment entry instead.");
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
      p_note: normalizedNote || null,
      p_method: normalizedMethod || null,
      p_counterparty: normalizedCounterparty || null,
      p_category: normalizedCategory || null,
      p_entry_date: input.entryDate,
      p_reference_label: normalizedReferenceLabel || null,
      p_created_by: user.id,
    }).maybeSingle();

    if (inserted.error) throw inserted.error;

    await writeAuditLog({
      action: "financial_entry_created",
      entityType: "financial_entry",
      recordId: inserted.data?.id || entryNumber,
      newValues: {
        entryNumber,
        type: input.type,
        scope: input.scope,
        relationType,
        amount: input.amount,
        currency: normalizedCurrency,
        dealId: input.dealId || null,
        customerId: input.customerId || null,
      },
      userId: user.id,
    });

    trackEvent("financial_entry_created", {
      type: input.type,
      relationType,
      hasDeal: Boolean(input.dealId),
      hasCustomer: Boolean(input.customerId),
    });

    return inserted.data;
  } catch (error) {
    logOperationalError("financial_entry_create_failed", error);
    throw new Error(getFinancialOperationErrorMessage(error));
  }
};

export const loadFinancialEditRequests = async (): Promise<FinancialEditRequest[]> => {
  const { profile } = await assertAccountingActor("request_edit");
  const isScopedPartnerView = profile.role === "saudi_partner";
  const deals = await loadDeals();
  const rows = await safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests");
  const profiles = await safeStructuredSelect<ProfileRow>("profiles", "id, full_name");

  const visibleRows = isScopedPartnerView ? filterRowsByVisibleDeals(rows || [], deals) : rows;
  const profileMap = new Map((profiles || []).map((row) => [row.id, row.full_name || row.id]));

  return (visibleRows || []).map((row) => ({
    id: row.id,
    financialEntryId: row.financial_entry_id || "",
    dealId: row.deal_id || undefined,
    customerId: row.customer_id || undefined,
    requestedBy: row.requested_by_name || (row.requested_by ? profileMap.get(row.requested_by) : undefined) || "Unknown",
    requestedByEmail: row.requested_by_email || "",
    requestedByUserId: row.requested_by || row.created_by || undefined,
    reason: row.reason || row.request_reason || "",
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
    reviewerId: row.reviewer_id || undefined,
    reviewNote: row.review_note || undefined,
    oldValue: row.old_value || null,
    proposedChanges: row.proposed_changes || row.proposed_value || null,
  }));
};

export const createFinancialEditRequest = async (input: {
  financialEntryId: string;
  reason: string;
  proposedChanges: Record<string, unknown>;
  oldValue?: Record<string, unknown> | null;
  dealId?: string;
  customerId?: string;
}) => {
  try {
    const { user, profile } = await assertAccountingActor("request_edit");
    if (!user || !profile) throw new Error("Authentication required.");
    assertValidFinancialEditProposal(input.proposedChanges);

    const existingEntries = await loadFinancialEntries();
    const targetEntry = existingEntries.find((entry) => entry.id === input.financialEntryId);

    if (!targetEntry) {
      throw new Error("The financial entry could not be found or is not visible to your role.");
    }

    const sanitizedProposal = sanitizeFinancialEditProposal(input.proposedChanges);
    const baseline = input.oldValue || {
      amount: targetEntry.amount,
      currency: targetEntry.currency,
      type: targetEntry.type,
      note: targetEntry.note,
      entryDate: targetEntry.entryDate,
      method: targetEntry.method,
      counterparty: targetEntry.counterparty,
      category: targetEntry.category,
      referenceLabel: targetEntry.referenceLabel,
    };

    if (!hasMeaningfulFinancialEditChange(baseline, sanitizedProposal)) {
      throw new Error("The edit request must include at least one meaningful change.");
    }

    const payload = {
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || targetEntry.dealId || null,
      customer_id: input.customerId || targetEntry.customerId || null,
      requested_by_name: profile.fullName || user.email || user.id,
      requested_by_email: user.email || "",
      requested_by: user.id,
      request_reason: input.reason,
      reason: input.reason,
      status: "pending" as const,
      old_value: baseline,
      proposed_changes: sanitizedProposal,
      proposed_value: sanitizedProposal,
      created_by: user.id,
    };

    const result = await db.from("financial_edit_requests").insert(payload).select("*").single();
    if (result.error) throw result.error;

    const recipients = await getInternalNotificationRecipients(["owner", "operations_employee"]);
    if (recipients.length > 0) {
      await createNotifications(recipients, {
        title: "Financial edit request",
        body: `${profile.fullName || user.email || "A user"} requested a financial edit review.`,
        type: "financial_edit_request",
        entityType: "financial_edit_request",
        entityId: result.data.id,
        metadata: {
          financialEntryId: input.financialEntryId,
          dealId: payload.deal_id,
          customerId: payload.customer_id,
          reason: input.reason,
        },
      });
    }

    await writeAuditLog({
      action: "financial_edit_requested",
      entityType: "financial_edit_request",
      recordId: result.data.id,
      newValues: payload,
      userId: user.id,
    });

    trackEvent("financial_edit_requested", {
      financialEntryId: input.financialEntryId,
      dealId: payload.deal_id,
      customerId: payload.customer_id,
    });

    return result.data;
  } catch (error) {
    logOperationalError("financial_edit_request_failed", error);
    throw new Error(getFinancialOperationErrorMessage(error));
  }
};

export const updateFinancialEditRequestStatus = async (
  requestId: string,
  status: "approved" | "rejected",
  reviewNote?: string,
) => {
  try {
    const { user } = await assertAccountingActor("approve_edit");
    if (!user) throw new Error("Authentication required.");

    const result = await db.from("financial_edit_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        review_note: reviewNote || null,
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (result.error) throw result.error;

    await writeAuditLog({
      action: status === "approved" ? "financial_edit_approved" : "financial_edit_rejected",
      entityType: "financial_edit_request",
      recordId: requestId,
      newValues: { status, reviewNote: reviewNote || null },
      userId: user.id,
    });

    trackEvent("financial_edit_reviewed", { requestId, status });

    return result.data;
  } catch (error) {
    logOperationalError("financial_edit_review_failed", error);
    throw new Error(getFinancialOperationErrorMessage(error));
  }
};
