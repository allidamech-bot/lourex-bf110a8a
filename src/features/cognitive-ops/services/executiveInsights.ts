import type {
  ExecutiveInsight,
  OperationalContextSnapshot,
  ReasoningFinding,
} from "@/features/cognitive-ops/types/cognitiveTypes";
import type { WorkflowSeverity } from "@/features/workflow-intelligence/types/workflowTypes";

const topSeverity = (findings: ReasoningFinding[]): WorkflowSeverity => {
  if (findings.some((finding) => finding.severity === "critical")) return "critical";
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  return "low";
};

const insight = (
  context: OperationalContextSnapshot,
  category: ExecutiveInsight["category"],
  severity: WorkflowSeverity,
  title: string,
  narrative: string,
  supportingFindingIds: string[],
): ExecutiveInsight =>
  Object.freeze({
    id: `insight-${category}-${context.generatedAt}`,
    category,
    severity,
    title,
    narrative,
    supportingFindingIds: Object.freeze(supportingFindingIds) as string[],
    createdAt: context.generatedAt,
    immutable: true,
  });

export const generateExecutiveInsights = (
  context: OperationalContextSnapshot,
  findings: ReasoningFinding[],
): ExecutiveInsight[] => {
  const critical = findings.filter((finding) => finding.severity === "critical");
  const finance = findings.filter((finding) => finding.kind === "finance_anomaly");
  const workflow = findings.filter((finding) => finding.kind === "workflow_bottleneck");
  const execution = findings.filter((finding) => finding.kind === "execution_impact");
  const escalation = findings.filter((finding) => finding.kind === "escalation");

  return [
    insight(
      context,
      "operational_summary",
      topSeverity(findings),
      "Operational cognitive summary",
      `${context.datasetCounts.shipments} shipments, ${context.datasetCounts.deals} deals, and ${context.activeRiskCounts.workflowTriggers} workflow signals are represented in the cognitive snapshot.`,
      findings.slice(0, 5).map((finding) => finding.id),
    ),
    insight(
      context,
      "strategic_risk",
      topSeverity(critical.length > 0 ? critical : findings),
      "Strategic risk brief",
      `${critical.length} critical cognitive finding(s) require governed review before any operational action is taken.`,
      critical.map((finding) => finding.id),
    ),
    insight(
      context,
      "workflow_stability",
      topSeverity(workflow),
      "Workflow stability insight",
      `${workflow.length} bottleneck-oriented finding(s) were generated from timeline and workflow memory.`,
      workflow.map((finding) => finding.id),
    ),
    insight(
      context,
      "execution_health",
      topSeverity(execution),
      "Execution health insight",
      `${context.activeRiskCounts.pendingApprovals} pending approval(s) and ${context.activeRiskCounts.blockedExecutions} blocked execution record(s) are visible to the cognitive layer.`,
      execution.map((finding) => finding.id),
    ),
    insight(
      context,
      "escalation_intelligence",
      topSeverity(escalation),
      "Escalation intelligence",
      `${escalation.length} escalation-oriented recommendation(s) are routed through review-only planning.`,
      escalation.map((finding) => finding.id),
    ),
    insight(
      context,
      "efficiency_recommendation",
      topSeverity(finance.length > 0 ? finance : findings),
      "Operational efficiency recommendation",
      "Prioritize high-severity plans with approval gates, then batch low-risk communications to protect dashboard responsiveness and operator focus.",
      finance.slice(0, 5).map((finding) => finding.id),
    ),
  ];
};
