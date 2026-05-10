import type { ExecutionPolicyConfig, ExecutionPriority } from "@/features/execution-runtime/types/executionTypes";

export const defaultExecutionPolicies: ExecutionPolicyConfig = Object.freeze({
  maxAttempts: 3,
  retryAfterMinutes: 30,
  staleExecutionMinutes: 120,
  approvalRequiredPriorities: ["high", "critical"],
  autoExecutableActions: ["prepare_customer_update", "prepare_notification_dispatch"],
});

export const priorityRank: Record<ExecutionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const requiresApprovalByPolicy = (
  priority: ExecutionPriority,
  actionType: string,
  policies: ExecutionPolicyConfig = defaultExecutionPolicies,
) => policies.approvalRequiredPriorities.includes(priority) || !policies.autoExecutableActions.includes(actionType as never);
