import type {
  ApprovalRequest,
  ExecutionQueueItem,
  GuardedExecutionRecord,
} from "@/features/execution-runtime/types/executionTypes";

const approvalForItem = (item: ExecutionQueueItem, approvals: ApprovalRequest[]) =>
  approvals.find((approval) => approval.queueItemId === item.id);

export const canExecuteQueueItem = (
  item: ExecutionQueueItem,
  approvals: ApprovalRequest[],
) => {
  if (item.status === "stale_isolated" || item.status === "failed" || item.status === "executed") return false;
  if (!item.action.approvalRequired) return true;
  return approvalForItem(item, approvals)?.status === "approved";
};

export const executeGuardedQueue = (
  queue: ExecutionQueueItem[],
  approvals: ApprovalRequest[],
  now: Date = new Date(),
  replayKeys: string[] = [],
): GuardedExecutionRecord[] => {
  const replayed = new Set(replayKeys);
  return queue.map((item) => {
    const approval = approvalForItem(item, approvals);
    const replayKey = `applied:${item.action.replayKey}`;
    if (replayed.has(replayKey)) {
      return Object.freeze({
        id: `execution-record:${item.id}`,
        queueItemId: item.id,
        actionId: item.action.id,
        status: "executed",
        applied: false,
        approvalId: approval?.id,
        executedAt: now.toISOString(),
        replayKey,
        rollbackPrepared: true,
        message: "Replay-safe execution skipped because record already exists.",
        immutable: true,
      }) as GuardedExecutionRecord;
    }
    const allowed = canExecuteQueueItem(item, approvals);
    return Object.freeze({
      id: `execution-record:${item.id}`,
      queueItemId: item.id,
      actionId: item.action.id,
      status: allowed ? "executed" : item.action.approvalRequired ? "approval_required" : "failed",
      applied: allowed,
      approvalId: approval?.id,
      executedAt: now.toISOString(),
      replayKey,
      rollbackPrepared: true,
      message: allowed
        ? `Prepared guarded ${item.action.type}; no irreversible mutation was applied.`
        : "Execution blocked by approval or guard validation.",
      immutable: true,
    }) as GuardedExecutionRecord;
  });
};
