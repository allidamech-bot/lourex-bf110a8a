import type {
  AIOpsSeverity,
  ShipmentRiskProfile,
  ShipmentRiskReason,
} from "@/features/ai-ops/types/aiOpsTypes";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsShipment,
} from "@/domain/operations/types";

const DAY_MS = 86_400_000;
const STALE_UPDATE_DAYS = 5;
const DELAYED_UPDATE_DAYS = 10;
const FINANCIAL_EXPOSURE_THRESHOLD = 25_000;
const PROBLEMATIC_ORDER_THRESHOLD = 2;

const toDate = (value: string | undefined | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysSince = (value: string | undefined | null, now: Date) => {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
};

const severityFromScore = (score: number): AIOpsSeverity => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
};

const getDelayProbability = (score: number, daysSinceUpdate: number) =>
  Math.min(0.95, Math.max(0.05, score / 100 + Math.min(daysSinceUpdate, 20) / 100));

const hasDisputeIndicator = (
  deal: OperationsDeal | undefined,
  editRequests: OperationsFinancialEditRequest[],
) => {
  const text = `${deal?.notes || ""} ${deal?.status || ""} ${deal?.operationalStatus || ""}`.toLowerCase();
  return (
    text.includes("dispute") ||
    text.includes("اعتراض") ||
    editRequests.some((request) => request.status === "pending" && request.dealId === deal?.id)
  );
};

const buildSuggestedActions = (reasons: ShipmentRiskReason[]): string[] => {
  const actions = new Set<string>();

  if (reasons.includes("delayed_shipment") || reasons.includes("stale_shipment")) {
    actions.add("Escalate shipment owner and verify the current stage before updating the customer.");
  }
  if (reasons.includes("missing_recent_update")) {
    actions.add("Request a customer-safe shipment update from the responsible partner.");
  }
  if (reasons.includes("financial_exposure")) {
    actions.add("Review payment coverage and financial entries before committing next operational steps.");
  }
  if (reasons.includes("dispute_indicator") || reasons.includes("risky_customer_pattern")) {
    actions.add("Prepare a dispute-prevention note and align internally before customer communication.");
  }

  return [...actions];
};

export const analyzeShipmentRisks = (
  input: {
    shipments: OperationsShipment[];
    deals: OperationsDeal[];
    financialEntries: OperationsFinancialEntry[];
    financialEditRequests: OperationsFinancialEditRequest[];
    now?: Date;
  },
): ShipmentRiskProfile[] => {
  const now = input.now || new Date();
  const dealsById = new Map(input.deals.map((deal) => [deal.id, deal]));
  const dealsByNumber = new Map(input.deals.map((deal) => [deal.dealNumber, deal]));
  const entriesByDeal = input.financialEntries.reduce<Map<string, OperationsFinancialEntry[]>>((map, entry) => {
    if (!entry.dealId) return map;
    map.set(entry.dealId, [...(map.get(entry.dealId) || []), entry]);
    return map;
  }, new Map());

  const problematicByCustomer = new Map<string, number>();

  input.shipments.forEach((shipment) => {
    const deal = (shipment.dealId ? dealsById.get(shipment.dealId) : undefined) ||
      (shipment.dealNumber ? dealsByNumber.get(shipment.dealNumber) : undefined);
    const key = deal?.customerId || shipment.clientName || shipment.trackingId;
    const staleDays = daysSince(shipment.updatedAt, now);
    const hasProblem = staleDays >= STALE_UPDATE_DAYS || hasDisputeIndicator(deal, input.financialEditRequests);
    if (hasProblem) problematicByCustomer.set(key, (problematicByCustomer.get(key) || 0) + 1);
  });

  return input.shipments.map((shipment) => {
    const deal = (shipment.dealId ? dealsById.get(shipment.dealId) : undefined) ||
      (shipment.dealNumber ? dealsByNumber.get(shipment.dealNumber) : undefined);
    const dealEntries = deal ? entriesByDeal.get(deal.id) || [] : [];
    const income = dealEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const exposureBase = deal?.totalValue || deal?.accountingSummary.expense || 0;
    const financialExposure = Math.max(0, exposureBase - income);
    const daysSinceUpdate = daysSince(shipment.updatedAt, now);
    const reasons: ShipmentRiskReason[] = [];

    if (daysSinceUpdate >= DELAYED_UPDATE_DAYS) reasons.push("delayed_shipment");
    if (daysSinceUpdate >= STALE_UPDATE_DAYS) reasons.push("stale_shipment");
    if (!shipment.customerVisibleNote?.trim() || shipment.timeline.length === 0) reasons.push("missing_recent_update");
    if (hasDisputeIndicator(deal, input.financialEditRequests)) reasons.push("dispute_indicator");
    if (financialExposure >= FINANCIAL_EXPOSURE_THRESHOLD) reasons.push("financial_exposure");

    const customerKey = deal?.customerId || shipment.clientName || shipment.trackingId;
    if ((problematicByCustomer.get(customerKey) || 0) >= PROBLEMATIC_ORDER_THRESHOLD) {
      reasons.push("risky_customer_pattern");
    }

    const riskScore = Math.min(100, Math.round(
      reasons.reduce((score, reason) => {
        const weights: Record<ShipmentRiskReason, number> = {
          delayed_shipment: 30,
          stale_shipment: 18,
          missing_recent_update: 14,
          dispute_indicator: 20,
          financial_exposure: 18,
          risky_customer_pattern: 12,
        };
        return score + weights[reason];
      }, 0),
    ));

    return {
      shipmentId: shipment.id,
      trackingId: shipment.trackingId,
      customerName: deal?.customerName || shipment.clientName,
      dealNumber: deal?.dealNumber || shipment.dealNumber,
      riskScore,
      severity: severityFromScore(riskScore),
      reasons,
      suggestedActions: buildSuggestedActions(reasons),
      financialExposure,
      delayProbability: getDelayProbability(riskScore, daysSinceUpdate),
      daysSinceUpdate,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
};
