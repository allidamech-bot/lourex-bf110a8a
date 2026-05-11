import { buildCognitiveOperationsLayer } from "@/features/cognitive-ops/services/cognitiveOperationsService";
import { fabricAgents } from "@/features/agent-fabric/agents/agentRegistry";
import type { AgentExecutionContext, AgentFabricInput, FabricAgentType } from "@/features/agent-fabric/types/agentFabricTypes";

const emptyWorkload = (): Record<FabricAgentType, number> =>
  fabricAgents.reduce((workload, agent) => {
    workload[agent.type] = 0;
    return workload;
  }, {} as Record<FabricAgentType, number>);

export const buildAgentExecutionContext = async (
  input: AgentFabricInput,
): Promise<AgentExecutionContext> => {
  const now = input.now || input.dataset.now || new Date();
  const cognitive = input.cognitive || await buildCognitiveOperationsLayer({ dataset: input.dataset, now });
  const replayKeys = [
    ...cognitive.reconstruction.replayKeys,
    ...cognitive.plans.map((plan) => plan.replayKey),
    ...cognitive.findings.flatMap((finding) => finding.evidenceReplayKeys),
  ];

  return Object.freeze({
    id: `agent-context-${cognitive.context.id}`,
    cognitive,
    generatedAt: now.toISOString(),
    activeAgents: fabricAgents,
    workload: Object.freeze(emptyWorkload()),
    replayKeys: Object.freeze([...new Set(replayKeys)].sort()) as string[],
    immutable: true,
  });
};
