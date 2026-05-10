import type { ApprovalRequest, ExecutionQueueItem } from "@/features/execution-runtime/types/executionTypes";

const reviewerForPriority = (priority: ExecutionQueueItem["action"]["priority"]): ApprovalRequest["reviewerRole"] => {
  if (priority === "critical") return "executive";
  if (priority === "high") return "operations_lead";
  return "finance_lead";
};

export const createApprovalRequests = (
  queue: ExecutionQueueItem[],
  now: Date = new Date(),
): ApprovalRequest[] =>
  queue
    .filter((item) => item.status === "approval_required")
    .map((item) => Object.freeze({
      id: `approval:${item.id}`,
      queueItemId: item.id,
      actionId: item.action.id,
      reviewerRole: reviewerForPriority(item.action.priority),
      status: "pending",
      requestedAt: now.toISOString(),
      reason: `Approval required for ${item.action.priority} ${item.action.type}.`,
    }) as ApprovalRequest);

export const approveExecutionRequest = (
  request: ApprovalRequest,
  reviewerName: string,
  reviewedAt: string = new Date().toISOString(),
): ApprovalRequest => Object.freeze({
  ...request,
  status: "approved",
  reviewedAt,
  reviewerName,
});

export const rejectExecutionRequest = (
  request: ApprovalRequest,
  reviewerName: string,
  reviewedAt: string = new Date().toISOString(),
): ApprovalRequest => Object.freeze({
  ...request,
  status: "rejected",
  reviewedAt,
  reviewerName,
});
