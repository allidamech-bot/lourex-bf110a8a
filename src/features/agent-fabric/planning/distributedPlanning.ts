import { getFabricAgentById } from "@/features/agent-fabric/agents/agentRegistry";
import { fabricPolicy } from "@/features/agent-fabric/coordination/coordinationPolicies";
import type {
  AgentExecutionContext,
  CoordinationSnapshot,
  DistributedCoordinationPlan,
  DistributedPlanStep,
  FabricApprovalGate,
} from "@/features/agent-fabric/types/agentFabricTypes";
import type { ExecutionPriority } from "@/features/execution-runtime/types/executionTypes";

const priorityFromGate = (gate: FabricApprovalGate): ExecutionPriority => {
  if (gate === "executive") return "critical";
  if (gate === "finance_lead" || gate === "operations_lead") return "high";
  return "medium";
};

const mergeGate = (current: FabricApprovalGate, next: FabricApprovalGate): FabricApprovalGate => {
  const rank: Record<FabricApprovalGate, number> = { none: 0, operations_lead: 1, finance_lead: 2, executive: 3 };
  return rank[next] > rank[current] ? next : current;
};

export const synthesizeDistributedPlans = (
  context: AgentExecutionContext,
  snapshot: CoordinationSnapshot,
): DistributedCoordinationPlan[] => {
  const findingById = new Map(context.cognitive.findings.map((finding) => [finding.id, finding]));
  const cognitivePlanByFinding = new Map(context.cognitive.plans.map((plan) => [plan.findingId, plan]));
  const delegationsByCapability = new Map<string, typeof snapshot.delegations>();

  snapshot.delegations.forEach((delegation) => {
    const bucket = delegationsByCapability.get(delegation.capability) || [];
    bucket.push(delegation);
    delegationsByCapability.set(delegation.capability, bucket);
  });

  return [...delegationsByCapability.entries()].slice(0, fabricPolicy.maxDistributedPlans).map(([capability, delegations]) => {
    let approvalGate: FabricApprovalGate = "none";
    const steps: DistributedPlanStep[] = delegations
      .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))
      .slice(0, 5)
      .map((delegation, index) => {
        const signal = snapshot.signals.find((item) => item.id === delegation.signalId);
        const finding = findingById.get(delegation.findingId);
        approvalGate = mergeGate(approvalGate, delegation.approvalGate);
        const agent = getFabricAgentById(delegation.toAgentId);

        return Object.freeze({
          id: `distributed-step-${delegation.id}-${index + 1}`,
          sequence: index + 1,
          agentId: delegation.toAgentId,
          actionType: signal?.proposedAction || "assign_internal_review",
          priority: priorityFromGate(delegation.approvalGate),
          title: `${agent?.label || delegation.toAgentId}: ${finding?.title || capability}`,
          approvalRequired: delegation.approvalGate !== "none",
          replayKey: `distributed-plan-step:${delegation.replayKey}:${index + 1}`,
          destructive: false,
        }) as DistributedPlanStep;
      });

    const sourcePlanIds = delegations
      .map((delegation) => cognitivePlanByFinding.get(delegation.findingId)?.id)
      .filter((planId): planId is string => Boolean(planId));

    return Object.freeze({
      id: `distributed-plan-${capability}-${context.generatedAt}`,
      objective: `Coordinate ${capability.replaceAll("_", " ")} across ${delegations.length} delegated task(s).`,
      delegatedAgentIds: Object.freeze([...new Set(delegations.map((delegation) => delegation.toAgentId))].sort()) as string[],
      sourcePlanIds: Object.freeze([...new Set(sourcePlanIds)].sort()) as string[],
      steps: Object.freeze(steps) as DistributedPlanStep[],
      approvalGate,
      rationale: "Synthesized from immutable cognitive plans and deterministic delegation negotiation.",
      replayKey: `distributed-plan:${capability}:${delegations.map((delegation) => delegation.replayKey).join("|")}`,
      immutable: true,
    }) as DistributedCoordinationPlan;
  });
};
