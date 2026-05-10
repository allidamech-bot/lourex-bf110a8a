import type { OperationalEvent, RealtimeSignal, RealtimeSignalType, OperationalEventSeverity } from "@/features/event-system/types/eventTypes";

const severityRank: Record<OperationalEventSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const maxSeverity = (events: OperationalEvent[]): OperationalEventSeverity => {
  if (events.some((event) => event.severity === "critical")) return "critical";
  if (events.some((event) => event.severity === "high")) return "high";
  if (events.some((event) => event.severity === "medium")) return "medium";
  return "low";
};

const signal = (
  type: RealtimeSignalType,
  events: OperationalEvent[],
  label: string,
  now: Date,
): RealtimeSignal | null => {
  if (events.length === 0) return null;
  return {
    id: `signal:${type}`,
    type,
    severity: maxSeverity(events),
    count: events.length,
    label,
    updatedAt: now.toISOString(),
  };
};

export const evaluateRealtimeSignals = (
  events: OperationalEvent[],
  now: Date = new Date(),
): RealtimeSignal[] => {
  const highSeverity = events.filter((event) => severityRank[event.severity] >= severityRank.high);
  const workflow = events.filter((event) => event.type === "workflow_blockage" || event.type === "dispute_escalation");
  const escalations = events.filter((event) => event.type === "escalation_trigger");
  const finance = events.filter((event) => event.type === "finance_alert" || event.type === "settlement_issue");
  const bottlenecks = events.filter((event) => event.type === "shipment_delay" || event.type === "workflow_blockage");

  return [
    signal("active_operational_alerts", highSeverity, "Active operational alerts", now),
    signal("workflow_instability", workflow, "Workflow instability", now),
    signal("unresolved_escalations", escalations, "Unresolved escalations", now),
    signal("finance_risk_spike", finance, "Finance risk spikes", now),
    signal("operational_bottleneck", bottlenecks, "Operational bottlenecks", now),
  ].filter((item): item is RealtimeSignal => Boolean(item));
};
