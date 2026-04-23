import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/domain/audit/service";
import { 
  getCurrentUserContext, 
  getLourexDomainAvailability, 
  getInternalNotificationRecipients,
  createNotifications,
  safeStructuredSelect,
  safeStructuredSelectWhereEq
} from "@/lib/operationsDomain";
import type { 
  FinancialEntryRow,
  FinancialEditRequestRow,
  CustomerRow,
  ProfileRow
} from "@/lib/operationsDomain";
import type { FinancialEntry, FinancialEditRequest } from "@/types/lourex";
import type { OperationalDeal } from "@/lib/operationsDomain";
import { logOperationalError, trackEvent } from "@/lib/monitoring";

export const loadFinancialEntries = async (options: { deals?: OperationalDeal[] } = {}): Promise<FinancialEntry[]> => {
  const { profile } = await getCurrentUserContext();
  const isCustomer = profile?.role === "customer";

  const [entries, deals, customers] = await Promise.all([
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<FinancialEntryRow>("financial_entries", "customer_id", profile.id)
      : safeStructuredSelect<FinancialEntryRow>("financial_entries"),
    options.deals ? Promise.resolve(options.deals) : (import("@/lib/operationsDomain").then(m => m.loadDeals())),
    isCustomer && profile?.id
      ? safeStructuredSelectWhereEq<CustomerRow>("lourex_customers", "id", profile.id)
      : safeStructuredSelect<CustomerRow>("lourex_customers"),
  ]);

  const dealMap = new Map((deals as any[]).map((deal) => [deal.id, deal]));
  const customerMap = new Map((customers || []).map((row) => [row.id, row]));

  return (entries || [])
    .map((row) => {
      const relationType = (row.relation_type ||
        (row.deal_id ? "deal_linked" : row.customer_id ? "customer_linked" : "general")) as FinancialEntry["relationType"];

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
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("يجب أن يكون مبلغ القيد أكبر من صفر.");
  if (!input.entryDate) throw new Error("تاريخ القيد المالي مطلوب.");
  if (!input.note.trim() || !input.method.trim() || !input.counterparty.trim() || !input.category.trim()) {
    throw new Error("يجب استكمال الحقول المحاسبية الأساسية قبل حفظ القيد.");
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
      scope: input.scope === "global" ? "global" : "deal_linked",
      relation_type: relationType,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      entry_date: input.entryDate,
      method: input.method,
      counterparty: input.counterparty,
      category: input.category,
      reference_label: input.referenceLabel || "",
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
      currency: input.currency,
      type: input.type,
      summary: `إنشاء قيد مالي ${entryNumber}`,
      entity_label: entryNumber,
    },
  });

  trackEvent("financial_entry_created", {
    scope: input.scope,
    type: input.type,
    currency: input.currency,
  });

  return inserted.data;
};

export const loadFinancialEditRequests = async (): Promise<FinancialEditRequest[]> => {
  const [rows, entries, deals, customers, profiles] = await Promise.all([
    safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests"),
    loadFinancialEntries(),
    import("@/lib/operationsDomain").then(m => m.loadDeals()),
    safeStructuredSelect<CustomerRow>("lourex_customers"),
    safeStructuredSelect<ProfileRow>("profiles", "id, full_name"),
  ]);

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const dealMap = new Map((deals as any[]).map((deal) => [deal.id, deal]));
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
      oldValue: (row.old_value as any) || {},
      proposedValue: (row.proposed_value as any) || {},
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
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");
  if (!input.financialEntryId || !input.requester.trim() || !input.email.trim() || !input.reason.trim()) {
    throw new Error("يجب استكمال بيانات طلب التعديل المالي.");
  }

  const inserted = await supabase
    .from("financial_edit_requests")
    .insert({
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      requested_by_name: input.requester,
      requested_by_email: input.email,
      reason: input.reason,
      old_value: input.oldValue,
      proposed_value: input.proposedValue,
      created_by: user.id,
    } as any)
    .select("*")
    .single();

  if (inserted.error) {
    logOperationalError("financial_edit_request_create", inserted.error, {
      financialEntryId: input.financialEntryId,
      dealId: input.dealId || null,
    });
    throw inserted.error;
  }

  await writeAuditLog({
    action: "financial_entry.edit_requested",
    tableName: "financial_edit_requests",
    recordId: inserted.data.id,
    newValues: {
      financial_entry_id: input.financialEntryId,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      summary: "تم إنشاء طلب تعديل مالي",
      entity_label: input.financialEntryId,
      reason: input.reason,
    },
  });

  const recipients = await getInternalNotificationRecipients();
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request",
      title: "تم رفع طلب تعديل مالي",
      message: `يوجد طلب تعديل جديد على القيد ${input.financialEntryId}.`,
      link: input.dealId ? `/dashboard/edit-requests?deal=${input.dealId}` : "/dashboard/edit-requests",
    })),
  );

  trackEvent("financial_edit_request_submitted", {
    hasDeal: Boolean(input.dealId),
    hasCustomer: Boolean(input.customerId),
  });

  return inserted.data;
};

export const updateFinancialEditRequestStatus = async (
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string,
) => {
  const { user } = await getCurrentUserContext();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً.");
  if (!(await getLourexDomainAvailability())) throw new Error("يجب تفعيل مخطط Lourex الجديد أولاً في Supabase.");

  const currentRows = await safeStructuredSelect<FinancialEditRequestRow>("financial_edit_requests");
  const current = currentRows.find((row) => row.id === id);
  if (!current) throw new Error("تعذر العثور على طلب التعديل المالي.");
  if (current.status !== "pending") throw new Error("لا يمكن مراجعة طلب تمت معالجته مسبقاً.");

  const updated = await supabase
    .from("financial_edit_requests")
    .update({
      status,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || "",
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
        ...(updated.data.proposed_value as any),
        locked: true,
      })
      .eq("id", updated.data.financial_entry_id);

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
    oldValues: { status: current?.status || "pending" },
    newValues: {
      status,
      financial_entry_id: updated.data.financial_entry_id,
      deal_id: updated.data.deal_id,
      review_note: reviewNote || "",
      summary: status === "approved" ? "تمت الموافقة على طلب تعديل مالي" : "تم رفض طلب تعديل مالي",
      entity_label: updated.data.financial_entry_id || id,
    },
  });

  const recipients = await getInternalNotificationRecipients([current?.created_by]);
  await createNotifications(
    recipients.map((recipientId) => ({
      userId: recipientId,
      type: "financial_edit_request_review",
      title: status === "approved" ? "تمت الموافقة على طلب التعديل" : "تم رفض طلب التعديل",
      message:
        status === "approved"
          ? `تمت الموافقة على طلب تعديل القيد ${updated.data.financial_entry_id}.`
          : `تم رفض طلب تعديل القيد ${updated.data.financial_entry_id}.`,
      link: updated.data.deal_id ? `/dashboard/edit-requests?deal=${updated.data.deal_id}` : "/dashboard/edit-requests",
    })),
  );

  trackEvent("financial_edit_request_reviewed", { status });

  return updated.data;
};
