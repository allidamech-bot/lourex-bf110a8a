import type {
  ExecutionQueueItem,
  ExecutionRecoveryState,
  GuardedExecutionRecord,
} from "@/features/execution-runtime/types/executionTypes";
import { defaultExecutionPolicies } from "@/features/execution-runtime/execution/executionPolicies";
import { isolateStaleQueueItems } from "@/features/execution-runtime/queue/executionQueue";

export const recoverExecutionQueue = (
  queue: ExecutionQueueItem[],
  records: GuardedExecutionRecord[],
  now: Date = new Date(),
): ExecutionRecoveryState => {
  const appliedReplayKeys = new Set(records.filter((record) => record.applied).map((record) => record.replayKey));
  const restoredQueue = isolateStaleQueueItems(queue, now).map((item) => {
    if (appliedReplayKeys.has(`applied:${item.action.replayKey}`)) {
      return Object.freeze({ ...item, status: "executed" as const });
    }
    if (item.status === "failed" && item.attempts < defaultExecutionPolicies.maxAttempts) {
      return Object.freeze({
        ...item,
        status: "retry_ready" as const,
        nextAttemptAt: new Date(now.getTime() + defaultExecutionPolicies.retryAfterMinutes * 60_000).toISOString(),
      });
    }
    return item;
  });

  return Object.freeze({
    restoredQueue,
    retryReady: restoredQueue.filter((item) => item.status === "retry_ready"),
    staleIsolated: restoredQueue.filter((item) => item.status === "stale_isolated"),
    replayKeys: [...appliedReplayKeys].sort(),
    recoveredAt: now.toISOString(),
  });
};
