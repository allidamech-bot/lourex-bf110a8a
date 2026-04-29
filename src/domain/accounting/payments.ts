import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentUserContext,
  safeStructuredSelect,
  safeStructuredSelectWhereEq,
} from "@/lib/operationsDomain";
import { canManageAccounting, isValidRole, type LourexRole } from "@/features/auth/rbac";
import type {
  OutstandingBalance,
  PaymentAllocationRecord,
  PaymentPayerType,
  PaymentRecord,
  PaymentStatus,
} from "@/types/lourex";

type PaymentRow = {
  id: string;
  reference_number: string;
  payer_type: PaymentPayerType;
  payer_id?: string | null;
  related_deal_id?: string | null;
  related_settlement_id?: string | null;
  amount: number | string | null;
  currency?: string | null;
  payment_method?: string | null;
  payment_status: PaymentStatus;
  received_at?: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentAllocationRow = {
  id: string;
  payment_id: string;
  financial_entry_id: string;
  allocated_amount: number | string | null;
  created_at: string;
};

type FinancialEntryPaymentRow = {
  id: string;
  deal_id?: string | null;
  customer_id?: string | null;
  type: "income" | "expense";
  amount: number | string | null;
};

export type CustomerPaymentSummary = {
  relatedDealId: string;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  reconciliationStatus: OutstandingBalance["reconciliationStatus"];
  payments: PaymentRecord[];
};

const db = supabase as any;

const mapPayment = (row: PaymentRow): PaymentRecord => ({
  id: row.id,
  referenceNumber: row.reference_number,
  payerType: row.payer_type,
  payerId: row.payer_id || null,
  relatedDealId: row.related_deal_id || null,
  relatedSettlementId: row.related_settlement_id || null,
  amount: Number(row.amount || 0),
  currency: row.currency || "SAR",
  paymentMethod: row.payment_method || "bank_transfer",
  paymentStatus: row.payment_status,
  receivedAt: row.received_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAllocation = (row: PaymentAllocationRow): PaymentAllocationRecord => ({
  id: row.id,
  paymentId: row.payment_id,
  financialEntryId: row.financial_entry_id,
  allocatedAmount: Number(row.allocated_amount || 0),
  createdAt: row.created_at,
});

const assertPaymentActor = async (allowRead = false) => {
  const context = await getCurrentUserContext();
  const role = context.profile?.role;

  if (!context.user || !context.profile || !isValidRole(role)) {
    throw new Error("Authentication required.");
  }

  if (!allowRead && !canManageAccounting(role as LourexRole)) {
    throw new Error("Only owner or operations can manage payments.");
  }

  return context;
};

export const loadPayments = async (): Promise<PaymentRecord[]> => {
  await assertPaymentActor(true);
  const rows = await safeStructuredSelect<PaymentRow>("payments");
  return rows.map(mapPayment).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const loadPaymentAllocations = async (): Promise<PaymentAllocationRecord[]> => {
  await assertPaymentActor(true);
  const rows = await safeStructuredSelect<PaymentAllocationRow>("payment_allocations");
  return rows.map(mapAllocation);
};

export const createPayment = async (input: {
  payerType: PaymentPayerType;
  payerId?: string | null;
  relatedDealId?: string | null;
  relatedSettlementId?: string | null;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}) => {
  await assertPaymentActor();
  const { data, error } = await db.rpc("create_payment", {
    p_payer_type: input.payerType,
    p_payer_id: input.payerId || null,
    p_related_deal_id: input.relatedDealId || null,
    p_related_settlement_id: input.relatedSettlementId || null,
    p_amount: input.amount,
    p_currency: input.currency || "SAR",
    p_payment_method: input.paymentMethod || "bank_transfer",
  });
  if (error) throw error;
  return data as string;
};

export const confirmPayment = async (paymentId: string) => {
  await assertPaymentActor();
  const { data, error } = await db.rpc("confirm_payment", { p_payment_id: paymentId });
  if (error) throw error;
  return data as string;
};

export const rejectPayment = async (paymentId: string, reason = "") => {
  await assertPaymentActor();
  const { error } = await db.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
};

export const allocatePayment = async (paymentId: string, financialEntryId: string, allocatedAmount: number) => {
  await assertPaymentActor();
  const { data, error } = await db.rpc("allocate_payment", {
    p_payment_id: paymentId,
    p_financial_entry_id: financialEntryId,
    p_allocated_amount: allocatedAmount,
  });
  if (error) throw error;
  return data as string;
};

export const getOutstandingBalance = async (
  entityType: "deal" | "customer" | "settlement",
  entityId: string,
): Promise<OutstandingBalance> => {
  await assertPaymentActor(true);
  const { data, error } = await db.rpc("get_outstanding_balance", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    expectedAmount: Number(row?.expected_amount || 0),
    paidAmount: Number(row?.paid_amount || 0),
    outstandingAmount: Number(row?.outstanding_amount || 0),
    reconciliationStatus: row?.reconciliation_status || "unpaid",
  };
};

export const loadCustomerPaymentSummaries = async (dealIds: string[]): Promise<Map<string, CustomerPaymentSummary>> => {
  const { profile } = await assertPaymentActor(true);
  if (!dealIds.length) return new Map();

  const [payments, entries] = await Promise.all([
    safeStructuredSelect<PaymentRow>("payments"),
    profile?.role === "customer" && profile.id
      ? safeStructuredSelectWhereEq<FinancialEntryPaymentRow>("financial_entries", "customer_id", profile.id)
      : safeStructuredSelect<FinancialEntryPaymentRow>("financial_entries"),
  ]);

  const dealSet = new Set(dealIds);
  const summaries = new Map<string, CustomerPaymentSummary>();

  dealIds.forEach((dealId) => {
    summaries.set(dealId, {
      relatedDealId: dealId,
      expectedAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      currency: "SAR",
      reconciliationStatus: "unpaid",
      payments: [],
    });
  });

  entries
    .filter((entry) => entry.deal_id && dealSet.has(entry.deal_id) && entry.type === "income")
    .forEach((entry) => {
      const summary = summaries.get(entry.deal_id || "");
      if (!summary) return;
      summary.expectedAmount += Number(entry.amount || 0);
    });

  payments
    .filter((payment) => payment.related_deal_id && dealSet.has(payment.related_deal_id))
    .map(mapPayment)
    .forEach((payment) => {
      const dealId = payment.relatedDealId;
      if (!dealId) return;
      const summary = summaries.get(dealId);
      if (!summary) return;
      summary.payments.push(payment);
      if (payment.paymentStatus === "confirmed") {
        summary.paidAmount += payment.amount;
        summary.currency = payment.currency;
      }
    });

  summaries.forEach((summary) => {
    summary.payments.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    summary.remainingAmount = Math.max(summary.expectedAmount - summary.paidAmount, 0);
    summary.reconciliationStatus =
      summary.expectedAmount > 0 && summary.paidAmount >= summary.expectedAmount
        ? "fully_paid"
        : summary.paidAmount > 0
          ? "partially_paid"
          : "unpaid";
  });

  return summaries;
};
