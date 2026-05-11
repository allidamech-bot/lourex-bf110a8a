import { cognitiveReasoningPolicy } from "@/features/cognitive-ops/reasoning/reasoningPolicies";
import type {
  CopilotRecommendation,
  CopilotRole,
  CognitivePlan,
  OperationalContextSnapshot,
  OperationalMemoryRecord,
  ReasoningFinding,
} from "@/features/cognitive-ops/types/cognitiveTypes";

const roleFilters: Record<CopilotRole, (finding: ReasoningFinding) => boolean> = {
  operations_manager: () => true,
  finance_supervisor: (finding) => finding.kind === "finance_anomaly" || finding.entity.entityType === "financial_entry",
  executive_oversight: (finding) => finding.severity === "critical" || finding.approvalRequired,
  partner_coordination: (finding) => finding.kind === "escalation" || finding.entity.entityType === "settlement",
  escalation_handling: (finding) => finding.kind === "escalation" || finding.severity === "critical",
  shipment_monitoring: (finding) => finding.entity.entityType === "shipment" || finding.kind === "workflow_bottleneck",
};

const roleTitles: Record<CopilotRole, string> = {
  operations_manager: "Operations manager copilot",
  finance_supervisor: "Finance supervisor copilot",
  executive_oversight: "Executive oversight copilot",
  partner_coordination: "Partner coordination copilot",
  escalation_handling: "Escalation handling copilot",
  shipment_monitoring: "Shipment monitoring copilot",
};

export const orchestrateCopilots = (
  context: OperationalContextSnapshot,
  memory: OperationalMemoryRecord[],
  findings: ReasoningFinding[],
  plans: CognitivePlan[],
): CopilotRecommendation[] => {
  const planByFinding = new Map(plans.map((plan) => [plan.findingId, plan]));

  return (Object.keys(roleFilters) as CopilotRole[]).flatMap((role) => {
    const scopedFindings = findings
      .filter(roleFilters[role])
      .slice(0, cognitiveReasoningPolicy.maxCopilotRecommendationsPerRole);

    if (scopedFindings.length === 0) {
      return [
        Object.freeze({
          id: `copilot-${role}-stable-${context.generatedAt}`,
          role,
          title: roleTitles[role],
          message: "No urgent cognitive action is recommended for this role in the current immutable snapshot.",
          recommendedPlanIds: Object.freeze([]) as string[],
          memoryReplayKeys: Object.freeze(memory.slice(0, 3).map((record) => record.replayKey)) as string[],
          approvalNote: "No autonomous execution will be attempted.",
          confidence: 0.72,
          createdAt: context.generatedAt,
          immutable: true,
        }),
      ];
    }

    return scopedFindings.map((finding) => {
      const plan = planByFinding.get(finding.id);
      return Object.freeze({
        id: `copilot-${role}-${finding.id}`,
        role,
        title: `${roleTitles[role]}: ${finding.entity.label}`,
        message: `${finding.title}. ${finding.recommendation}`,
        recommendedPlanIds: Object.freeze(plan ? [plan.id] : []) as string[],
        memoryReplayKeys: Object.freeze(finding.evidenceReplayKeys.slice(0, 6)) as string[],
        approvalNote: plan?.approvalGate && plan.approvalGate !== "none"
          ? `Requires ${plan.approvalGate.replace("_", " ")} approval before action.`
          : "Recommendation is advisory and non-destructive.",
        confidence: Math.min(0.98, 0.65 + finding.priority / 300),
        createdAt: context.generatedAt,
        immutable: true,
      });
    });
  });
};
