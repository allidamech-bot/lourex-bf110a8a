import type {
  ApprovalRequest,
  ExecutionAuditRecord,
  ExecutionQueueItem,
  GuardedExecutionRecord,
} from "@/features/execution-runtime/types/executionTypes";

export const buildExecutionAuditTrail = (
  queue: ExecutionQueueItem[],
  approvals: ApprovalRequest[],
  records: GuardedExecutionRecord[],
  now: Date = new Date(),
): ExecutionAuditRecord[] => {
  const queued = queue.map((item) => Object.freeze({
    id: `audit:queued:${item.id}`,
    actionId: item.action.id,
    queueItemId: item.id,
    event: "queued",
    occurredAt: item.queuedAt,
    actor: item.action.agentType,
    message: item.action.detail,
    replayKey: `audit:queued:${item.action.replayKey}`,
    immutable: true,
  }) as ExecutionAuditRecord);
  const approvalAudit = approvals.map((approval) => Object.freeze({
    id: `audit:approval:${approval.id}`,
    actionId: approval.actionId,
    queueItemId: approval.queueItemId,
    event: approval.status === "approved" ? "approved" : approval.status === "rejected" ? "rejected" : "approval_requested",
    occurredAt: approval.reviewedAt || approval.requestedAt,
    actor: approval.reviewerName || approval.reviewerRole,
    message: approval.reason,
    replayKey: `audit:approval:${approval.id}:${approval.status}`,
    immutable: true,
  }) as ExecutionAuditRecord);
  const executionAudit = records.map((record) => Object.freeze({
    id: `audit:execution:${record.id}`,
    actionId: record.actionId,
    queueItemId: record.queueItemId,
    event: record.applied ? "executed" : record.status === "approval_required" ? "approval_requested" : "failed",
    occurredAt: record.executedAt || now.toISOString(),
    actor: "guarded_execution",
    message: record.message,
    replayKey: `audit:execution:${record.replayKey}`,
    immutable: true,
  }) as ExecutionAuditRecord);

  return [...queued, ...approvalAudit, ...executionAudit].sort((first, second) =>
    new Date(first.occurredAt).getTime() - new Date(second.occurredAt).getTime() ||
    first.id.localeCompare(second.id),
  );
};
