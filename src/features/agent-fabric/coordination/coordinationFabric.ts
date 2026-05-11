import { buildAgentSignals } from "@/features/agent-fabric/agents/operationalAgents";
import { fabricAgents } from "@/features/agent-fabric/agents/agentRegistry";
import { fabricPolicy } from "@/features/agent-fabric/coordination/coordinationPolicies";
import { negotiateDelegations } from "@/features/agent-fabric/negotiation/coordinationNegotiation";
import type {
  AgentExecutionContext,
  CoordinationRecord,
  CoordinationSnapshot,
  DelegationProposal,
  FabricAgentType,
} from "@/features/agent-fabric/types/agentFabricTypes";

const workloadFromDelegations = (delegations: DelegationProposal[]): Readonly<Record<FabricAgentType, number>> => {
  const byAgentType = fabricAgents.reduce((workload, agent) => {
    workload[agent.type] = 0;
    return workload;
  }, {} as Record<FabricAgentType, number>);

  delegations.forEach((delegation) => {
    const agent = fabricAgents.find((item) => item.id === delegation.toAgentId);
    if (agent) byAgentType[agent.type] += 1;
  });

  return Object.freeze(byAgentType);
};

export const buildCoordinationRecords = (
  context: AgentExecutionContext,
  delegations: DelegationProposal[],
): CoordinationRecord[] =>
  delegations.map((delegation) => {
    const finding = context.cognitive.findings.find((item) => item.id === delegation.findingId);
    return Object.freeze({
      id: `coordination-record-${delegation.id}`,
      type: delegation.status === "approval_required" ? "negotiation" : "delegation",
      occurredAt: context.generatedAt,
      agentIds: Object.freeze([delegation.fromAgentId, delegation.toAgentId]) as string[],
      entityId: finding?.entity.entityId || delegation.findingId,
      severity: finding?.severity || "medium",
      summary: `${delegation.status}: ${delegation.reason}`,
      replayKey: `coordination:${delegation.replayKey}`,
      immutable: true,
    }) as CoordinationRecord;
  });

export const buildCoordinationFabric = (
  context: AgentExecutionContext,
  previousReplayKeys: string[] = [],
): CoordinationSnapshot => {
  const signals = buildAgentSignals(context).slice(0, fabricPolicy.maxSignals);
  const delegations = negotiateDelegations(signals, previousReplayKeys).slice(0, fabricPolicy.maxDelegations);
  const records = buildCoordinationRecords(context, delegations).slice(0, fabricPolicy.maxCoordinationRecords);
  const replayKeys = [...signals.map((signal) => signal.replayKey), ...delegations.map((delegation) => delegation.replayKey), ...records.map((record) => record.replayKey)];

  return Object.freeze({
    id: `coordination-snapshot-${context.id}`,
    generatedAt: context.generatedAt,
    agents: context.activeAgents,
    signals,
    delegations,
    records,
    workload: workloadFromDelegations(delegations),
    replayKeys: Object.freeze([...new Set(replayKeys)].sort()) as string[],
    immutable: true,
  });
};
