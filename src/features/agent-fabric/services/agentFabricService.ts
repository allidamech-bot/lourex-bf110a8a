import { buildCoordinationFabric } from "@/features/agent-fabric/coordination/coordinationFabric";
import { buildAgentMemory, reconstructAgentMemory } from "@/features/agent-fabric/memory/agentMemory";
import { synthesizeDistributedPlans } from "@/features/agent-fabric/planning/distributedPlanning";
import { buildAgentExecutionContext } from "@/features/agent-fabric/runtime/agentExecutionContext";
import { recoverCoordinationFabric } from "@/features/agent-fabric/runtime/agentRecovery";
import type { AgentFabricInput, AgentFabricResult } from "@/features/agent-fabric/types/agentFabricTypes";

export const buildAgentCoordinationFabric = async (
  input: AgentFabricInput,
): Promise<AgentFabricResult> => {
  const now = input.now || input.dataset.now || new Date();
  const context = await buildAgentExecutionContext(input);
  const snapshot = buildCoordinationFabric(context);
  const memory = buildAgentMemory(snapshot);
  const memoryReconstruction = reconstructAgentMemory(memory, now);
  const plans = synthesizeDistributedPlans(context, snapshot);
  const recovery = recoverCoordinationFabric(snapshot, now);

  return Object.freeze({
    context,
    snapshot,
    memory,
    memoryReconstruction,
    plans,
    recovery,
    generatedAt: now.toISOString(),
  });
};
