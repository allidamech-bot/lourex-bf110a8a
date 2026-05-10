import type { ExecutionAction, ExecutionAgentType, OperationalAgent } from "@/features/execution-runtime/types/executionTypes";
import type { DistributedRuntimeResult } from "@/features/distributed-runtime/types/distributedTypes";
import type { TransportMessage } from "@/features/realtime-transport/types/transportTypes";
import { requiresApprovalByPolicy } from "@/features/execution-runtime/execution/executionPolicies";

export const operationalAgents: OperationalAgent[] = [
  {
    id: "agent-shipment-coordination",
    type: "shipment_coordination",
    label: "Shipment coordination agent",
    deterministic: true,
    approvalRequired: true,
    supportedActions: ["prepare_customer_update", "prepare_partner_escalation"],
  },
  {
    id: "agent-escalation-handling",
    type: "escalation_handling",
    label: "Escalation handling agent",
    deterministic: true,
    approvalRequired: true,
    supportedActions: ["assign_internal_review", "prepare_partner_escalation"],
  },
  {
    id: "agent-workflow-recovery",
    type: "workflow_recovery",
    label: "Workflow recovery agent",
    deterministic: true,
    approvalRequired: true,
    supportedActions: ["prepare_workflow_recovery", "isolate_stale_execution"],
  },
  {
    id: "agent-notification-dispatch",
    type: "notification_dispatch_preparation",
    label: "Notification dispatch preparation agent",
    deterministic: true,
    approvalRequired: false,
    supportedActions: ["prepare_notification_dispatch"],
  },
  {
    id: "agent-finance-review",
    type: "finance_review_recommendation",
    label: "Finance review recommendation agent",
    deterministic: true,
    approvalRequired: true,
    supportedActions: ["prepare_finance_review"],
  },
  {
    id: "agent-anomaly-handling",
    type: "operational_anomaly_handling",
    label: "Operational anomaly handling agent",
    deterministic: true,
    approvalRequired: true,
    supportedActions: ["assign_internal_review", "prepare_workflow_recovery"],
  },
];

const priorityFromSeverity = (severity: ExecutionAction["sourceSeverity"]): ExecutionAction["priority"] => severity;

const agentForMessageType = (type: string): ExecutionAgentType => {
  if (type === "finance_alert" || type === "settlement_issue") return "finance_review_recommendation";
  if (type === "shipment_delay") return "shipment_coordination";
  if (type === "escalation_trigger" || type === "dispute_escalation") return "escalation_handling";
  if (type === "workflow_blockage") return "workflow_recovery";
  if (type === "ai_recommendation") return "notification_dispatch_preparation";
  return "operational_anomaly_handling";
};

const actionForAgent = (agentType: ExecutionAgentType): ExecutionAction["type"] => {
  if (agentType === "finance_review_recommendation") return "prepare_finance_review";
  if (agentType === "shipment_coordination") return "prepare_customer_update";
  if (agentType === "escalation_handling") return "prepare_partner_escalation";
  if (agentType === "workflow_recovery") return "prepare_workflow_recovery";
  if (agentType === "notification_dispatch_preparation") return "prepare_notification_dispatch";
  return "assign_internal_review";
};

const getExecutionSourceMessages = (distributed: DistributedRuntimeResult): TransportMessage[] => {
  const byReplayKey = new Map<string, TransportMessage>();

  distributed.snapshot.records.forEach((record) => {
    byReplayKey.set(record.replayKey, record.message);
  });

  distributed.transport.messages.forEach((message) => {
    if (!byReplayKey.has(message.replayKey)) {
      byReplayKey.set(message.replayKey, message);
    }
  });

  return Array.from(byReplayKey.values()).sort((first, second) =>
    first.sequence - second.sequence ||
    first.timestamp.localeCompare(second.timestamp) ||
    first.id.localeCompare(second.id),
  );
};

export const buildAgentActions = (
  distributed: DistributedRuntimeResult,
  now: Date = new Date(),
): ExecutionAction[] =>
  getExecutionSourceMessages(distributed)
    .filter((message) => message.payload.kind === "event")
    .slice(0, 12)
    .map((message) => {
      const event = message.payload.kind === "event" ? message.payload.event : null;
      if (!event) return null;
      const agentType = agentForMessageType(event.type);
      const type = actionForAgent(agentType);
      const priority = priorityFromSeverity(event.severity);
      return Object.freeze({
        id: `execution-action:${message.replayKey}`,
        type,
        priority,
        agentType,
        entity: event.entity,
        title: `Prepare ${type.replaceAll("_", " ")}`,
        detail: event.summary,
        approvalRequired: requiresApprovalByPolicy(priority, type),
        replayKey: `execution:${message.replayKey}`,
        createdAt: now.toISOString(),
        sourceSeverity: event.severity,
        immutable: true,
      }) as ExecutionAction;
    })
    .filter((action): action is ExecutionAction => Boolean(action))
    .sort((first, second) =>
      first.createdAt.localeCompare(second.createdAt) ||
      first.id.localeCompare(second.id),
    );
