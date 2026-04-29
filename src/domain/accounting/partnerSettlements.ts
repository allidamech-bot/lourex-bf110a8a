import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/domain/audit/service";
import { loadFinancialEntries } from "@/domain/accounting/service";
import { getCurrentUserContext, safeStructuredSelect } from "@/lib/operationsDomain";
import { canManageAccounting, type LourexRole } from "@/features/auth/rbac";
import type { PartnerSettlement, PartnerSettlementRole } from "@/types/lourex";

type PartnerSettlementRow = {
  id: string;
  partner_id: string;
  partner_role: PartnerSettlementRole;
  settlement_period: string;
  gross_amount: number | string | null;
  partner_commission: number | string | null;
  expenses: number | string | null;
  net_due: number | string | null;
  status: PartnerSettlement["status"];
  approved_by?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
};

type PartnerProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: LourexRole | null;
  status?: string | null;
};

type SettlementCalculationInput = {
  partnerId: string;
  partnerRole: PartnerSettlementRole;
  settlementPeriod: string;
  commissionRate?: number;
};

type SettlementAmounts = {
  grossAmount: number;
  partnerCommission: number;
  expenses: number;
  netDue: number;
};

const db = supabase as any;

const assertSettlementActor = async () => {
  const context = await getCurrentUserContext();
  if (!context.user || !context.profile) throw new Error("Authentication required.");
  const role = context.profile.role as LourexRole;

  if (
    !canManageAccounting(role) &&
    context.profile.role !== "turkish_partner" &&
    role !== "saudi_partner"
  ) {
    throw new Error("Your current role does not permit partner settlement access.");
  }
  return context;
};

const mapSettlement = (
  row: PartnerSettlementRow,
  profileMap: Map<string, PartnerProfileRow>,
): PartnerSettlement => ({
  id: row.id,
  partnerId: row.partner_id,
  partnerName: profileMap.get(row.partner_id)?.full_name || profileMap.get(row.partner_id)?.email || "",
  partnerRole: row.partner_role,
  settlementPeriod: row.settlement_period,
  grossAmount: Number(row.gross_amount || 0),
  partnerCommission: Number(row.partner_commission || 0),
  expenses: Number(row.expenses || 0),
  netDue: Number(row.net_due || 0),
  status: row.status,
  approvedBy: row.approved_by || null,
  approvedAt: row.approved_at || null,
  paidAt: row.paid_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const loadPartnerProfiles = async () => {
  const { profile } = await assertSettlementActor();
  const profiles = await safeStructuredSelect<PartnerProfileRow>("profiles", "id, full_name, email, role, status");
  const partnerRows = profiles.filter(
    (row) => (row.role === "turkish_partner" || row.role === "saudi_partner") && row.status === "active",
  );

  if (profile.role === "turkish_partner" || profile.role === "saudi_partner") {
    return partnerRows.filter((row) => row.id === profile.id);
  }

  return partnerRows;
};

export const loadPartnerSettlements = async (): Promise<PartnerSettlement[]> => {
  await assertSettlementActor();
  const [rows, profiles] = await Promise.all([
    safeStructuredSelect<PartnerSettlementRow>("partner_settlements"),
    safeStructuredSelect<PartnerProfileRow>("profiles", "id, full_name, email, role, status"),
  ]);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return rows.map((row) => mapSettlement(row, profileMap)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const calculatePartnerSettlement = async (
  input: SettlementCalculationInput,
): Promise<SettlementAmounts> => {
  const { loadDeals } = await import("@/lib/operationsDomain");
  const [deals, entries] = await Promise.all([loadDeals(), loadFinancialEntries()]);
  const normalizedRate = input.commissionRate ?? 0.05;
  const periodPrefix = input.settlementPeriod.trim();
  const assignedDeals = deals.filter((deal) => {
    const assigned =
      input.partnerRole === "turkish_partner"
        ? deal.turkishPartnerId === input.partnerId
        : deal.saudiPartnerId === input.partnerId;
    return assigned && (!periodPrefix || deal.createdAt?.startsWith(periodPrefix));
  });
  const dealIds = new Set(assignedDeals.map((deal) => deal.id));
  const grossAmount = assignedDeals.reduce((sum, deal) => sum + Number(deal.totalValue || 0), 0);
  const expenses = entries
    .filter((entry) => entry.dealId && dealIds.has(entry.dealId) && entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const partnerCommission = Math.max(0, grossAmount * normalizedRate);

  return {
    grossAmount,
    partnerCommission,
    expenses,
    netDue: partnerCommission + expenses,
  };
};

export const createPartnerSettlement = async (input: SettlementCalculationInput & Partial<SettlementAmounts>) => {
  const { profile } = await assertSettlementActor();
  if (!canManageAccounting(profile.role as LourexRole)) throw new Error("Only owner or operations can create partner settlements.");
  const amounts = input.grossAmount === undefined
    ? await calculatePartnerSettlement(input)
    : {
        grossAmount: input.grossAmount || 0,
        partnerCommission: input.partnerCommission || 0,
        expenses: input.expenses || 0,
        netDue: input.netDue || (input.partnerCommission || 0) + (input.expenses || 0),
      };

  const { data, error } = await db.rpc("create_partner_settlement", {
    p_partner_id: input.partnerId,
    p_partner_role: input.partnerRole,
    p_settlement_period: input.settlementPeriod,
    p_gross_amount: amounts.grossAmount,
    p_partner_commission: amounts.partnerCommission,
    p_expenses: amounts.expenses,
  });
  if (error) throw error;

  await writeAuditLog({
    action: "partner_settlement.created",
    tableName: "partner_settlements",
    recordId: data,
    newValues: { ...amounts, partner_id: input.partnerId, settlement_period: input.settlementPeriod },
  });

  return data as string;
};

export const recalculatePartnerSettlement = async (
  settlementId: string,
  amounts: SettlementAmounts,
) => {
  const { profile } = await assertSettlementActor();
  if (!canManageAccounting(profile.role as LourexRole)) throw new Error("Only owner or operations can recalculate partner settlements.");
  const { error } = await db.rpc("recalculate_partner_settlement", {
    p_settlement_id: settlementId,
    p_gross_amount: amounts.grossAmount,
    p_partner_commission: amounts.partnerCommission,
    p_expenses: amounts.expenses,
  });
  if (error) throw error;
  await writeAuditLog({
    action: "partner_settlement.recalculated",
    tableName: "partner_settlements",
    recordId: settlementId,
    newValues: amounts,
  });
};

export const approvePartnerSettlement = async (settlementId: string) => {
  const { profile } = await assertSettlementActor();
  if (!canManageAccounting(profile.role as LourexRole)) throw new Error("Only owner or operations can approve partner settlements.");
  const { error } = await db.rpc("approve_partner_settlement", { p_settlement_id: settlementId });
  if (error) throw error;
  await writeAuditLog({ action: "partner_settlement.approved", tableName: "partner_settlements", recordId: settlementId });
};

export const markPartnerSettlementPaid = async (settlementId: string) => {
  const { profile } = await assertSettlementActor();
  if (!canManageAccounting(profile.role as LourexRole)) throw new Error("Only owner or operations can mark partner settlements paid.");
  const { error } = await db.rpc("mark_partner_settlement_paid", { p_settlement_id: settlementId });
  if (error) throw error;
  await writeAuditLog({ action: "partner_settlement.marked_paid", tableName: "partner_settlements", recordId: settlementId });
};

export const disputePartnerSettlement = async (settlementId: string, reason = "") => {
  await assertSettlementActor();
  const { error } = await db.rpc("dispute_partner_settlement", {
    p_settlement_id: settlementId,
    p_reason: reason,
  });
  if (error) throw error;
  await writeAuditLog({
    action: "partner_settlement.disputed",
    tableName: "partner_settlements",
    recordId: settlementId,
    newValues: { reason },
  });
};
