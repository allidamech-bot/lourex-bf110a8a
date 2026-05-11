import { fabricAgents } from "@/features/agent-fabric/agents/agentRegistry";
import {
  capabilityByReasoningKind,
  primaryAgentByCapability,
  priorityFromSeverity,
} from "@/features/agent-fabric/coordination/coordinationPolicies";
import type {
  AgentCapabilityMatch,
  AgentExecutionContext,
  AgentSignal,
  FabricAgent,
  FabricApprovalGate,
  FabricCapability,
} from "@/features/agent-fabric/types/agentFabricTypes";
import type { ExecutionActionType } from "@/features/execution-runtime/types/executionTypes";

const gateFromFinding = (approvalRequired: boolean, kind: string, severity: string): FabricApprovalGate => {
  if (!approvalRequired) return "none";
  if (kind === "finance_anomaly") return "finance_lead";
  if (severity === "critical") return "executive";
  return "operations_lead";
};

const actionForCapability = (capability: FabricCapability): ExecutionActionType => {
  if (capability === "finance_review") return "prepare_finance_review";
  if (capability === "escalation_recovery") return "prepare_partner_escalation";
  if (capability === "workflow_optimization") return "prepare_workflow_recovery";
  if (capability === "execution_guarding") return "assign_internal_review";
  if (capability === "customer_follow_up" || capability === "shipment_monitoring") return "prepare_customer_update";
  if (capability === "executive_briefing") return "prepare_notification_dispatch";
  return "assign_internal_review";
};

const scoreAgent = (
  agent: FabricAgent,
  capability: FabricCapability,
  findingPriority: number,
  workload: number,
) => {
  const primaryBonus = agent.type === primaryAgentByCapability[capability] ? 30 : 0;
  const capabilityBonus = agent.capabilities.includes(capability) ? 40 : 0;
  const loadPenalty = workload * 5;
  return capabilityBonus + primaryBonus + agent.priorityBias + Math.floor(findingPriority / 10) - loadPenalty;
};

export const matchAgentsToFindings = (context: AgentExecutionContext): AgentCapabilityMatch[] => {
  const plansByFinding = new Map(context.cognitive.plans.map((plan) => [plan.findingId, plan]));
  const workload = { ...context.workload };

  return context.cognitive.findings
    .flatMap((finding) => {
      const capability = capabilityByReasoningKind[finding.kind];
      return fabricAgents
        .filter((agent) => agent.capabilities.includes(capability))
        .map((agent) => ({
          agent,
          finding,
          sourcePlan: plansByFinding.get(finding.id),
          capability,
          score: scoreAgent(agent, capability, finding.priority, workload[agent.type] || 0),
          approvalGate: gateFromFinding(finding.approvalRequired, finding.kind, finding.severity),
        }));
    })
    .sort((first, second) =>
      second.finding.priority - first.finding.priority ||
      second.score - first.score ||
      first.agent.id.localeCompare(second.agent.id) ||
      first.finding.id.localeCompare(second.finding.id),
    );
};

export const buildAgentSignals = (context: AgentExecutionContext): AgentSignal[] => {
  const usedFindings = new Set<string>();
  const workload = { ...context.workload };
  const signals: AgentSignal[] = [];

  matchAgentsToFindings(context).forEach((match) => {
    if (usedFindings.has(match.finding.id)) return;
    if ((workload[match.agent.type] || 0) >= match.agent.maxConcurrentDelegations) return;
    workload[match.agent.type] = (workload[match.agent.type] || 0) + 1;
    usedFindings.add(match.finding.id);
    signals.push(Object.freeze({
      id: `agent-signal-${match.agent.id}-${match.finding.id}`,
      agentId: match.agent.id,
      agentType: match.agent.type,
      findingId: match.finding.id,
      capability: match.capability,
      severity: match.finding.severity,
      priority: priorityFromSeverity(match.finding.severity) + match.score,
      explanation: `${match.agent.label} selected for ${match.finding.title}; score ${match.score}.`,
      proposedAction: actionForCapability(match.capability),
      approvalGate: match.approvalGate,
      replayKey: `agent-signal:${match.agent.id}:${match.finding.id}:${match.capability}`,
      immutable: true,
    }));
  });

  return signals.sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id));
};
