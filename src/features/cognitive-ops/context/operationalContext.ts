import { createEventSystemSnapshot } from "@/features/event-system/services/eventSystemService";
import { buildSynchronizedRuntime, createDistributedRuntimeRepository } from "@/features/distributed-runtime/runtime/synchronizedRuntime";
import { buildExecutionRuntime } from "@/features/execution-runtime/services/executionRuntimeService";
import { bootstrapRuntimeInfrastructure } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import { InMemoryEventRepository } from "@/features/runtime-infra/repositories/eventRepository";
import { buildRealtimeTransportRuntime, createRealtimeTransportClient } from "@/features/realtime-transport/services/realtimeTransportService";
import { buildWorkflowIntelligence } from "@/features/workflow-intelligence/orchestrators/workflowOrchestrator";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { OperationalContextSnapshot } from "@/features/cognitive-ops/types/cognitiveTypes";

const contextId = (generatedAt: string, counts: OperationalContextSnapshot["datasetCounts"]) =>
  `ctx-${generatedAt}-${counts.requests}-${counts.shipments}-${counts.deals}-${counts.financialEntries}`;

export const buildOperationalContextSnapshot = async (
  dataset: EventSystemDataset,
  now: Date = dataset.now || new Date(),
): Promise<OperationalContextSnapshot> => {
  const workflow = buildWorkflowIntelligence({ ...dataset, now });
  const events = createEventSystemSnapshot({ ...dataset, now }, now);
  const runtime = await bootstrapRuntimeInfrastructure(
    { ...dataset, now },
    new InMemoryEventRepository(),
    { now },
  );
  const transport = await buildRealtimeTransportRuntime(
    { dataset: { ...dataset, now }, now, runtime },
    createRealtimeTransportClient(),
  );
  const distributed = await buildSynchronizedRuntime(
    { dataset: { ...dataset, now }, now, transport },
    createDistributedRuntimeRepository(),
  );
  const execution = await buildExecutionRuntime({ dataset: { ...dataset, now }, distributed, now });
  const generatedAt = now.toISOString();
  const datasetCounts = Object.freeze({
    requests: dataset.requests.length,
    shipments: dataset.shipments.length,
    deals: dataset.deals.length,
    financialEntries: dataset.financialEntries.length,
    financialEditRequests: dataset.financialEditRequests.length,
    settlements: dataset.settlements?.length || 0,
  });

  const activeRiskCounts = Object.freeze({
    workflowTriggers: workflow.triggers.length,
    criticalTriggers: workflow.triggers.filter((trigger) => trigger.severity === "critical").length,
    pendingApprovals: execution.approvals.filter((approval) => approval.status === "pending").length,
    blockedExecutions: execution.executionRecords.filter((record) => !record.applied).length,
    financeAnomalies: workflow.triggers.filter((trigger) => trigger.type === "financial_risk_spike").length,
    staleShipments: workflow.triggers.filter((trigger) => trigger.type === "missing_update").length,
  });

  return Object.freeze({
    id: contextId(generatedAt, datasetCounts),
    generatedAt,
    datasetCounts,
    activeRiskCounts,
    workflow,
    events,
    execution,
    immutable: true,
  });
};
