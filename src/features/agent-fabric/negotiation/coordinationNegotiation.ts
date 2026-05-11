import { fabricAgents, getFabricAgentById } from "@/features/agent-fabric/agents/agentRegistry";
import { fabricSeverityRank } from "@/features/agent-fabric/coordination/coordinationPolicies";
import type { AgentSignal, DelegationProposal, FabricAgent } from "@/features/agent-fabric/types/agentFabricTypes";

const scoreTarget = (agent: FabricAgent, signal: AgentSignal, currentLoad: number) => {
  const capabilityScore = agent.capabilities.includes(signal.capability) ? 50 : 0;
  const severityScore = fabricSeverityRank[signal.severity] * 10;
  const loadPenalty = currentLoad * 6;
  const sameAgentPenalty = agent.id === signal.agentId ? 8 : 0;
  return capabilityScore + severityScore + agent.priorityBias - loadPenalty - sameAgentPenalty;
};

export const negotiateDelegations = (
  signals: AgentSignal[],
  previousReplayKeys: string[] = [],
): DelegationProposal[] => {
  const replayed = new Set(previousReplayKeys);
  const loadByAgent = new Map<string, number>();

  return signals.map((signal) => {
    const candidates = fabricAgents
      .filter((agent) => agent.capabilities.includes(signal.capability))
      .map((agent) => {
        const currentLoad = loadByAgent.get(agent.id) || 0;
        return {
          agent,
          score: scoreTarget(agent, signal, currentLoad),
          currentLoad,
        };
      })
      .sort((first, second) =>
        second.score - first.score ||
        first.currentLoad - second.currentLoad ||
        first.agent.id.localeCompare(second.agent.id),
      );

    const selected = candidates[0]?.agent || getFabricAgentById(signal.agentId) || fabricAgents[0];
    loadByAgent.set(selected.id, (loadByAgent.get(selected.id) || 0) + 1);
    const replayKey = `delegation:${signal.replayKey}:${selected.id}`;
    const overloaded = (loadByAgent.get(selected.id) || 0) > selected.maxConcurrentDelegations;
    const status = replayed.has(replayKey)
      ? "replayed"
      : overloaded
        ? "conflict_resolved"
        : signal.approvalGate === "none"
          ? "accepted"
          : "approval_required";

    return Object.freeze({
      id: `delegation-${signal.id}-${selected.id}`,
      signalId: signal.id,
      findingId: signal.findingId,
      fromAgentId: signal.agentId,
      toAgentId: selected.id,
      capability: signal.capability,
      score: candidates[0]?.score || 0,
      status,
      approvalGate: signal.approvalGate,
      reason: overloaded
        ? "Delegation routed with workload conflict safeguards."
        : `Capability ${signal.capability} matched with deterministic score ${candidates[0]?.score || 0}.`,
      replayKey,
      immutable: true,
    }) as DelegationProposal;
  });
};
