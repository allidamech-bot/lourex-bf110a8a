import { buildSynchronizedRuntime } from "@/features/distributed-runtime/runtime/synchronizedRuntime";
import { buildAgentActions, operationalAgents } from "@/features/execution-runtime/agents/operationalAgents";
import { createApprovalRequests } from "@/features/execution-runtime/approval/approvalWorkflow";
import { buildExecutionAuditTrail } from "@/features/execution-runtime/execution/executionAudit";
import { executeGuardedQueue } from "@/features/execution-runtime/execution/guardedExecution";
import { createExecutionQueue } from "@/features/execution-runtime/queue/executionQueue";
import { recoverExecutionQueue } from "@/features/execution-runtime/recovery/executionRecovery";
import type { ExecutionRuntimeInput, ExecutionRuntimeResult } from "@/features/execution-runtime/types/executionTypes";

export const buildExecutionRuntime = async (
  input: ExecutionRuntimeInput,
): Promise<ExecutionRuntimeResult> => {
  const now = input.now || new Date();
  const distributed = input.distributed || await buildSynchronizedRuntime({ dataset: input.dataset, now });
  const actions = buildAgentActions(distributed, now);
  const queue = createExecutionQueue(actions, now);
  const approvals = createApprovalRequests(queue, now);
  const executionRecords = executeGuardedQueue(queue, approvals, now);
  const audit = buildExecutionAuditTrail(queue, approvals, executionRecords, now);
  const recovery = recoverExecutionQueue(queue, executionRecords, now);

  return Object.freeze({
    distributed,
    agents: operationalAgents,
    actions,
    queue,
    approvals,
    executionRecords,
    audit,
    recovery,
    generatedAt: now.toISOString(),
  });
};
