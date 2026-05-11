import { fabricPolicy } from "@/features/agent-fabric/coordination/coordinationPolicies";
import type {
  CoordinationRecoveryState,
  CoordinationSnapshot,
  DelegationProposal,
} from "@/features/agent-fabric/types/agentFabricTypes";

export const recoverCoordinationFabric = (
  snapshot: CoordinationSnapshot,
  now: Date,
  previousReplayKeys: string[] = [],
): CoordinationRecoveryState => {
  const replayed = new Set(previousReplayKeys);
  const staleCutoff = now.getTime() - fabricPolicy.staleCoordinationHours * 60 * 60 * 1000;
  const replayedDelegations = snapshot.delegations
    .filter((delegation) => replayed.has(delegation.replayKey))
    .map((delegation) => Object.freeze({ ...delegation, status: "replayed" as const }) as DelegationProposal);
  const restoredDelegations = snapshot.delegations
    .filter((delegation) => !replayed.has(delegation.replayKey))
    .map((delegation) => Object.freeze({ ...delegation, status: delegation.status === "proposed" ? "recovered" as const : delegation.status }) as DelegationProposal);
  const staleCleaned = snapshot.records.filter((record) => new Date(record.occurredAt).getTime() < staleCutoff);

  return Object.freeze({
    restoredDelegations,
    replayedDelegations,
    staleCleaned,
    hydratedAgentIds: Object.freeze(snapshot.agents.map((agent) => agent.id).sort()) as string[],
    replayKeys: Object.freeze(snapshot.replayKeys) as string[],
    recoveredAt: now.toISOString(),
    immutable: true,
  });
};
