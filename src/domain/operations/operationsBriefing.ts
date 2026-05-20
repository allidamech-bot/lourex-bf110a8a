import {
  fetchDeals,
  fetchFinancialEditRequests,
  fetchRequests,
  fetchShipments,
} from "@/domain/operations/service";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";

export type OperationsRiskLevel = "excellent" | "good" | "needs_attention" | "critical";

export type OperationsBriefingMetric = {
  id: string;
  label: string;
  value: number;
  severity: "info" | "warning" | "critical";
  description: string;
};

export type OperationsBriefingRecommendation = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  reason: string;
  action: string;
  entityLabel?: string;
};

export type OperationsBriefingReport = {
  generatedAt: string;
  riskScore: number;
  riskLevel: OperationsRiskLevel;
  metrics: OperationsBriefingMetric[];
  recommendations: OperationsBriefingRecommendation[];
  sourceCounts: {
    requests: number;
    deals: number;
    shipments: number;
    financialEditRequests: number;
  };
};

const dayMs = 24 * 60 * 60 * 1000;

const ageInHours = (value: string | null | undefined, now = Date.now()) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((now - timestamp) / (60 * 60 * 1000)));
};

const ageInDays = (value: string | null | undefined, now = Date.now()) => Math.floor(ageInHours(value, now) / 24);

const hasMissingRequestDetails = (request: OperationsRequest) => {
  return [
    request.productName,
    request.productDescription,
    request.quantity ? String(request.quantity) : "",
    request.destination || request.customer?.country,
    request.preferredShippingMethod,
  ].some((value) => !String(value || "").trim());
};

const isPendingRequest = (request: OperationsRequest) =>
  ["intake_submitted", "awaiting_clarification", "ready_for_conversion", "transfer_uploaded", "transfer_proof_pending"].includes(
    request.status,
  );

const isBlockedDeal = (deal: OperationsDeal) =>
  ["blocked", "on_hold", "needs_attention"].includes(deal.operationalStatus) ||
  (!deal.shipmentId && deal.stage !== "delivered") ||
  (!deal.turkishPartnerId && !deal.saudiPartnerId);

const isShipmentStale = (shipment: OperationsShipment, now = Date.now()) =>
  shipment.stage !== "delivered" && ageInDays(shipment.updatedAt, now) >= 3;

const riskLevelFromScore = (score: number): OperationsRiskLevel => {
  if (score >= 92) return "excellent";
  if (score >= 70) return "good";
  if (score >= 40) return "needs_attention";
  return "critical";
};

const clampRiskScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const metricSeverity = (value: number, warningAt: number, criticalAt: number): OperationsBriefingMetric["severity"] => {
  if (value >= criticalAt) return "critical";
  if (value >= warningAt) return "warning";
  return "info";
};

const buildRecommendations = ({
  pendingRequests24h,
  missingDetailsRequests,
  staleShipments,
  blockedDeals,
  pendingFinancialReviews,
}: {
  pendingRequests24h: OperationsRequest[];
  missingDetailsRequests: OperationsRequest[];
  staleShipments: OperationsShipment[];
  blockedDeals: OperationsDeal[];
  pendingFinancialReviews: OperationsFinancialEditRequest[];
}): OperationsBriefingRecommendation[] => {
  const recommendations: OperationsBriefingRecommendation[] = [];

  const oldestRequest = pendingRequests24h[0];
  if (oldestRequest) {
    recommendations.push({
      id: "pending-request-followup",
      title: "Prioritize pending purchase request follow-up",
      priority: pendingRequests24h.length >= 5 ? "critical" : "high",
      entityLabel: oldestRequest.requestNumber || oldestRequest.productName,
      reason: `${pendingRequests24h.length} purchase request(s) have waited more than 24 hours.`,
      action: "Review the oldest request first, confirm missing details, and prepare the next customer-safe update.",
    });
  }

  const missingRequest = missingDetailsRequests[0];
  if (missingRequest) {
    recommendations.push({
      id: "missing-request-details",
      title: "Resolve incomplete sourcing details",
      priority: missingDetailsRequests.length >= 5 ? "high" : "medium",
      entityLabel: missingRequest.requestNumber || missingRequest.productName,
      reason: `${missingDetailsRequests.length} request(s) appear to have missing product, quantity, destination, or shipping details.`,
      action: "Send a concise clarification checklist before supplier outreach or quote preparation.",
    });
  }

  const staleShipment = staleShipments[0];
  if (staleShipment) {
    recommendations.push({
      id: "stale-shipment-update",
      title: "Review stale shipment tracking",
      priority: staleShipments.length >= 3 ? "critical" : "high",
      entityLabel: staleShipment.trackingId || staleShipment.dealNumber,
      reason: `${staleShipments.length} active shipment(s) have not been updated for 3+ days.`,
      action: "Check the logistics stage, add an internal note, and prepare a customer-safe update if confirmed.",
    });
  }

  const blockedDeal = blockedDeals[0];
  if (blockedDeal) {
    recommendations.push({
      id: "blocked-deal-review",
      title: "Clear blocked or under-assigned deals",
      priority: blockedDeals.length >= 4 ? "high" : "medium",
      entityLabel: blockedDeal.dealNumber,
      reason: `${blockedDeals.length} deal(s) show blocked status, missing shipment, or missing partner assignment.`,
      action: "Review ownership, partner assignment, shipment linkage, and next operational action.",
    });
  }

  const pendingFinancial = pendingFinancialReviews[0];
  if (pendingFinancial) {
    recommendations.push({
      id: "finance-review",
      title: "Owner financial review required",
      priority: pendingFinancialReviews.length >= 3 ? "high" : "medium",
      entityLabel: pendingFinancial.targetEntryNumber || pendingFinancial.id,
      reason: `${pendingFinancialReviews.length} financial edit request(s) are pending review.`,
      action: "Owner should approve or reject pending financial corrections after reviewing the audit trail.",
    });
  }

  return recommendations.slice(0, 6);
};

export const buildOperationsBriefingReport = async (): Promise<OperationsBriefingReport> => {
  const now = Date.now();
  const [requests, deals, shipments, financialEditRequests] = await Promise.all([
    fetchRequests(),
    fetchDeals(),
    fetchShipments(),
    fetchFinancialEditRequests(),
  ]);

  const pendingRequests24h = requests
    .filter((request) => isPendingRequest(request) && ageInHours(request.createdAt || request.reviewedAt, now) >= 24)
    .sort((a, b) => ageInHours(b.createdAt || b.reviewedAt, now) - ageInHours(a.createdAt || a.reviewedAt, now));

  const missingDetailsRequests = requests.filter((request) => isPendingRequest(request) && hasMissingRequestDetails(request));
  const staleShipments = shipments
    .filter((shipment) => isShipmentStale(shipment, now))
    .sort((a, b) => ageInDays(b.updatedAt, now) - ageInDays(a.updatedAt, now));
  const blockedDeals = deals.filter(isBlockedDeal);
  const pendingFinancialReviews = financialEditRequests.filter((request) => request.status === "pending");

  const metrics: OperationsBriefingMetric[] = [
    {
      id: "pending-requests-24h",
      label: "Requests waiting 24h+",
      value: pendingRequests24h.length,
      severity: metricSeverity(pendingRequests24h.length, 2, 5),
      description: "Purchase requests that still need review, clarification, conversion, or transfer-proof handling.",
    },
    {
      id: "missing-request-details",
      label: "Incomplete requests",
      value: missingDetailsRequests.length,
      severity: metricSeverity(missingDetailsRequests.length, 3, 7),
      description: "Requests with weak or missing sourcing, quantity, destination, or shipping details.",
    },
    {
      id: "stale-shipments",
      label: "Stale shipments",
      value: staleShipments.length,
      severity: metricSeverity(staleShipments.length, 1, 3),
      description: "Active shipments without tracking updates for 3+ days.",
    },
    {
      id: "blocked-deals",
      label: "Blocked deals",
      value: blockedDeals.length,
      severity: metricSeverity(blockedDeals.length, 2, 5),
      description: "Deals that appear blocked, under-assigned, or missing shipment linkage.",
    },
    {
      id: "finance-pending-review",
      label: "Finance reviews",
      value: pendingFinancialReviews.length,
      severity: metricSeverity(pendingFinancialReviews.length, 1, 3),
      description: "Pending financial edit requests requiring owner review.",
    },
  ];

  const penalty =
    pendingRequests24h.length * 4 +
    missingDetailsRequests.length * 2 +
    staleShipments.length * 7 +
    blockedDeals.length * 5 +
    pendingFinancialReviews.length * 8;
  const riskScore = clampRiskScore(100 - penalty);

  return {
    generatedAt: new Date().toISOString(),
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    metrics,
    recommendations: buildRecommendations({
      pendingRequests24h,
      missingDetailsRequests,
      staleShipments,
      blockedDeals,
      pendingFinancialReviews,
    }),
    sourceCounts: {
      requests: requests.length,
      deals: deals.length,
      shipments: shipments.length,
      financialEditRequests: financialEditRequests.length,
    },
  };
};
