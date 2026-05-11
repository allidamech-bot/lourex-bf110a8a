import { getFabricAgentById } from "@/features/agent-fabric/agents/agentRegistry";
import { fabricPolicy } from "@/features/agent-fabric/coordination/coordinationPolicies";
import type {
  AgentMemoryReconstruction,
  AgentMemoryRecord,
  CoordinationSnapshot,
} from "@/features/agent-fabric/types/agentFabricTypes";

export const buildAgentMemory = (snapshot: CoordinationSnapshot): AgentMemoryRecord[] => {
  const signalMemory = snapshot.signals.map((signal) => Object.freeze({
    id: `agent-memory-signal-${signal.id}`,
    agentId: signal.agentId,
    agentType: signal.agentType,
    sourceRecordId: signal.id,
    occurredAt: snapshot.generatedAt,
    title: `${signal.capability} signal`,
    summary: signal.explanation,
    replayKey: `agent-memory:${signal.replayKey}`,
    immutable: true,
  }) as AgentMemoryRecord);

  const delegationMemory = snapshot.delegations.map((delegation) => {
    const agent = getFabricAgentById(delegation.toAgentId);
    return Object.freeze({
      id: `agent-memory-delegation-${delegation.id}`,
      agentId: delegation.toAgentId,
      agentType: agent?.type || "operational_anomaly_analysis",
      sourceRecordId: delegation.id,
      occurredAt: snapshot.generatedAt,
      title: `${delegation.capability} delegation`,
      summary: `${delegation.status}: ${delegation.reason}`,
      replayKey: `agent-memory:${delegation.replayKey}`,
      immutable: true,
    }) as AgentMemoryRecord;
  });

  return [...signalMemory, ...delegationMemory]
    .sort((first, second) =>
      first.agentId.localeCompare(second.agentId) ||
      first.occurredAt.localeCompare(second.occurredAt) ||
      first.id.localeCompare(second.id),
    )
    .slice(0, fabricPolicy.maxMemoryRecords);
};

export const recallAgentMemory = (
  memory: AgentMemoryRecord[],
  options: { agentId?: string; limit?: number } = {},
): AgentMemoryRecord[] =>
  memory
    .filter((record) => !options.agentId || record.agentId === options.agentId)
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt) || first.id.localeCompare(second.id))
    .slice(0, options.limit || 16);

export const reconstructAgentMemory = (
  memory: AgentMemoryRecord[],
  now: Date,
): AgentMemoryReconstruction => {
  const records = [...memory].sort((first, second) =>
    first.occurredAt.localeCompare(second.occurredAt) || first.id.localeCompare(second.id),
  );

  return Object.freeze({
    records,
    replayKeys: Object.freeze(records.map((record) => record.replayKey)) as string[],
    summary: `${records.length} immutable agent memory record(s) reconstructed for coordination recall.`,
    reconstructedAt: now.toISOString(),
  });
};
