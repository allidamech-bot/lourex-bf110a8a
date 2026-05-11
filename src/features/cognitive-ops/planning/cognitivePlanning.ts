import type { CognitivePlan, PlanningStep, ReasoningFinding } from "@/features/cognitive-ops/types/cognitiveTypes";
import type { ExecutionActionType, ExecutionPriority } from "@/features/execution-runtime/types/executionTypes";

const priorityFromFinding = (finding: ReasoningFinding): ExecutionPriority => {
  if (finding.severity === "critical") return "critical";
  if (finding.severity === "high") return "high";
  if (finding.severity === "medium") return "medium";
  return "low";
};

const approvalGateFor = (finding: ReasoningFinding): CognitivePlan["approvalGate"] => {
  if (!finding.approvalRequired) return "none";
  if (finding.kind === "finance_anomaly") return "finance_lead";
  if (finding.severity === "critical") return "executive";
  return "operations_lead";
};

const actionFor = (finding: ReasoningFinding): ExecutionActionType => {
  if (finding.kind === "finance_anomaly") return "prepare_finance_review";
  if (finding.kind === "escalation") return "prepare_partner_escalation";
  if (finding.kind === "workflow_bottleneck") return "prepare_workflow_recovery";
  if (finding.kind === "execution_impact") return "assign_internal_review";
  return "prepare_customer_update";
};

const step = (
  finding: ReasoningFinding,
  sequence: number,
  actionType: ExecutionActionType,
  title: string,
  detail: string,
): PlanningStep =>
  Object.freeze({
    id: `plan-step-${finding.id}-${sequence}`,
    sequence,
    actionType,
    title,
    detail,
    approvalRequired: finding.approvalRequired || sequence > 1,
    priority: priorityFromFinding(finding),
    replayKey: `planning:${finding.id}:${sequence}:${actionType}`,
    destructive: false,
  });

export const generateCognitivePlans = (findings: ReasoningFinding[]): CognitivePlan[] =>
  findings.slice(0, 12).map((finding) => {
    const primaryAction = actionFor(finding);
    const steps = [
      step(finding, 1, "assign_internal_review", "Validate operational evidence", finding.explanation),
      step(finding, 2, primaryAction, finding.title, finding.recommendation),
      step(
        finding,
        3,
        finding.approvalRequired ? "prepare_notification_dispatch" : "prepare_customer_update",
        "Prepare governed communication",
        "Draft advisory communication only after human review confirms the operational path.",
      ),
    ];

    return Object.freeze({
      id: `plan-${finding.id}`,
      findingId: finding.id,
      objective: `Resolve ${finding.kind.replaceAll("_", " ")} for ${finding.entity.label}`,
      steps: Object.freeze(steps) as PlanningStep[],
      approvalGate: approvalGateFor(finding),
      rationale: "Plan is advisory, non-destructive, replay-keyed, and approval-aware.",
      replayKey: `plan:${finding.id}:${finding.createdAt}`,
      immutable: true,
    });
  });
