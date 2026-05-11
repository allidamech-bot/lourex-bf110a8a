import { orchestrateCopilots } from "@/features/cognitive-ops/copilot/copilotOrchestrator";
import { buildOperationalContextSnapshot } from "@/features/cognitive-ops/context/operationalContext";
import { buildOperationalMemory, reconstructOperationalTimeline } from "@/features/cognitive-ops/memory/operationalMemory";
import { generateCognitivePlans } from "@/features/cognitive-ops/planning/cognitivePlanning";
import { runContextualReasoning } from "@/features/cognitive-ops/reasoning/contextualReasoning";
import { generateExecutiveInsights } from "@/features/cognitive-ops/services/executiveInsights";
import type { CognitiveOperationsInput, CognitiveOperationsResult } from "@/features/cognitive-ops/types/cognitiveTypes";

export const buildCognitiveOperationsLayer = async (
  input: CognitiveOperationsInput,
): Promise<CognitiveOperationsResult> => {
  const now = input.now || input.dataset.now || new Date();
  const context = await buildOperationalContextSnapshot(input.dataset, now);
  const memory = buildOperationalMemory(context);
  const reconstruction = reconstructOperationalTimeline(memory, now);
  const findings = runContextualReasoning(context, memory);
  const plans = generateCognitivePlans(findings);
  const copilots = orchestrateCopilots(context, memory, findings, plans);
  const insights = generateExecutiveInsights(context, findings);

  return Object.freeze({
    context,
    memory,
    reconstruction,
    findings,
    plans,
    copilots,
    insights,
    generatedAt: now.toISOString(),
  });
};
