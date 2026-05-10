import type { ExecutionAction, ExecutionQueueItem } from "@/features/execution-runtime/types/executionTypes";
import { defaultExecutionPolicies, priorityRank } from "@/features/execution-runtime/execution/executionPolicies";

export const createExecutionQueue = (
  actions: ExecutionAction[],
  now: Date = new Date(),
): ExecutionQueueItem[] =>
  actions.map((action) => Object.freeze({
    id: `queue:${action.id}`,
    action,
    status: action.approvalRequired ? "approval_required" : "queued",
    attempts: 0,
    queuedAt: now.toISOString(),
    staleAt: new Date(now.getTime() + defaultExecutionPolicies.staleExecutionMinutes * 60_000).toISOString(),
  }) as ExecutionQueueItem).sort((first, second) =>
    priorityRank[second.action.priority] - priorityRank[first.action.priority] ||
    new Date(first.queuedAt).getTime() - new Date(second.queuedAt).getTime() ||
    first.id.localeCompare(second.id),
  );

export const isolateStaleQueueItems = (
  queue: ExecutionQueueItem[],
  now: Date = new Date(),
): ExecutionQueueItem[] =>
  queue.map((item) =>
    new Date(item.staleAt).getTime() <= now.getTime() && item.status !== "executed"
      ? Object.freeze({ ...item, status: "stale_isolated" as const })
      : item,
  );
