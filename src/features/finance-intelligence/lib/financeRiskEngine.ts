import {
  FinancialEntry,
  PartnerSettlement,
  PaymentRecord,
  PurchaseRequest,
  DealOperation,
} from "../../../types/lourex";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FinanceRecommendation {
  type: "AUDIT" | "ACTION" | "INFO";
  message: string;
  severity: RiskLevel;
}

export const calculateCustomerBalanceRisk = (
  balances: { customerId: string; outstanding: number }[]
): RiskLevel => {
  const highRisk = balances.filter((b) => b.outstanding > 10000);
  if (highRisk.length > 5) return "CRITICAL";
  if (highRisk.length > 2) return "HIGH";
  if (highRisk.length > 0) return "MEDIUM";
  return "LOW";
};

export const calculatePartnerSettlementRisk = (
  settlements: PartnerSettlement[]
): RiskLevel => {
  const pending = settlements.filter((s) => s.status === "pending_review");
  if (pending.length > 3) return "HIGH";
  if (pending.length > 0) return "MEDIUM";
  return "LOW";
};

export const calculatePaymentProofRisk = (
  payments: PaymentRecord[]
): RiskLevel => {
  const pending = payments.filter((p) => p.paymentStatus === "pending");
  if (pending.length > 5) return "HIGH";
  if (pending.length > 0) return "MEDIUM";
  return "LOW";
};

export const calculateAuditReadinessScore = (
  entries: FinancialEntry[],
  requests: PurchaseRequest[]
): number => {
  if (entries.length === 0) return 100;
  const lockedEntries = entries.filter((e) => e.locked).length;
  return Math.round((lockedEntries / entries.length) * 100);
};

export const generateFinancialRecommendations = (
  risk: RiskLevel
): FinanceRecommendation[] => {
  switch (risk) {
    case "CRITICAL":
      return [{ type: "AUDIT", message: "Immediate manual audit required for customer receivables.", severity: "CRITICAL" }];
    case "HIGH":
      return [{ type: "ACTION", message: "Review pending settlements and payment proofs.", severity: "HIGH" }];
    default:
      return [{ type: "INFO", message: "Financial records are within normal parameters.", severity: "LOW" }];
  }
};

export const generateExecutiveFinanceBriefing = (
  deals: DealOperation[]
): { receivables: number; payables: number } => {
  const receivables = deals.reduce((acc, d) => acc + (d.accountingSummary?.income || 0), 0);
  const payables = deals.reduce((acc, d) => acc + (d.accountingSummary?.expense || 0), 0);
  return { receivables, payables };
};
