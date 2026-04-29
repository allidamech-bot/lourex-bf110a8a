import { canMoveShipmentStage, getNextShipmentStage, getShipmentStage } from "@/lib/shipmentStages";
import type { LourexRole } from "@/features/auth/rbac";
import type { PurchaseRequestStatus, ShipmentStageCode } from "@/types/lourex";

const REQUEST_STATUS_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  intake_submitted: ["under_review", "awaiting_clarification", "cancelled"],
  under_review: ["awaiting_clarification", "ready_for_conversion", "cancelled"],
  awaiting_clarification: ["under_review", "ready_for_conversion", "cancelled"],
  ready_for_conversion: ["under_review", "transfer_proof_pending", "cancelled"],
  transfer_proof_pending: ["in_progress", "transfer_proof_rejected", "cancelled"],
  transfer_proof_rejected: ["transfer_proof_pending", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const canTransitionPurchaseRequestStatus = (
  currentStatus: PurchaseRequestStatus,
  nextStatus: PurchaseRequestStatus,
) => currentStatus === nextStatus || REQUEST_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) === true;

export const canConvertPurchaseRequest = (input: {
  role: LourexRole | null | undefined;
  status: PurchaseRequestStatus;
  convertedDealNumber?: string | null;
}) =>
  (input.role === "owner" || input.role === "operations_employee") &&
  input.status === "ready_for_conversion" &&
  !input.convertedDealNumber;

export const getNextShipmentStageCode = (currentStage: ShipmentStageCode | null | undefined) => {
  return getNextShipmentStage(currentStage)?.code ?? null;
};

export const canAdvanceShipmentStage = (input: {
  role: LourexRole | null | undefined;
  currentStage: ShipmentStageCode | null | undefined;
  nextStage: ShipmentStageCode | null | undefined;
}) => {
  const expectedNextStage = getNextShipmentStageCode(input.currentStage);

  if (!expectedNextStage || !canMoveShipmentStage(input.currentStage, input.nextStage)) {
    return false;
  }

  const nextOrder = getShipmentStage(input.nextStage).order;

  if (input.role === "owner" || input.role === "operations_employee") {
    return true;
  }

  if (input.role === "turkish_partner") {
    return nextOrder >= 2 && nextOrder <= 6;
  }

  if (input.role === "saudi_partner") {
    return nextOrder >= 8;
  }

  return false;
};

export const isAssignedPartnerForDeal = (input: {
  role: LourexRole | null | undefined;
  profileId: string | null | undefined;
  turkishPartnerId?: string | null;
  saudiPartnerId?: string | null;
}) => {
  if (!input.profileId) {
    return false;
  }

  if (input.role === "turkish_partner") {
    return input.turkishPartnerId === input.profileId;
  }

  if (input.role === "saudi_partner") {
    return input.saudiPartnerId === input.profileId;
  }

  return input.role === "owner" || input.role === "operations_employee";
};
