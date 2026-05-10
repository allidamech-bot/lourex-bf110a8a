import type { NotificationAudience, OperationalEventType } from "@/features/event-system/types/eventTypes";

export type EventRegistryEntry = {
  type: OperationalEventType;
  defaultAudiences: NotificationAudience[];
  replaySafe: boolean;
  retrySafe: boolean;
};

export const eventRegistry: Record<OperationalEventType, EventRegistryEntry> = {
  shipment_delay: {
    type: "shipment_delay",
    defaultAudiences: ["operations", "partners"],
    replaySafe: true,
    retrySafe: true,
  },
  shipment_update: {
    type: "shipment_update",
    defaultAudiences: ["operations"],
    replaySafe: true,
    retrySafe: true,
  },
  escalation_trigger: {
    type: "escalation_trigger",
    defaultAudiences: ["operations", "executives"],
    replaySafe: true,
    retrySafe: true,
  },
  finance_alert: {
    type: "finance_alert",
    defaultAudiences: ["finance", "executives"],
    replaySafe: true,
    retrySafe: true,
  },
  settlement_issue: {
    type: "settlement_issue",
    defaultAudiences: ["finance", "partners"],
    replaySafe: true,
    retrySafe: true,
  },
  workflow_blockage: {
    type: "workflow_blockage",
    defaultAudiences: ["operations"],
    replaySafe: true,
    retrySafe: true,
  },
  dispute_escalation: {
    type: "dispute_escalation",
    defaultAudiences: ["operations", "finance", "executives"],
    replaySafe: true,
    retrySafe: true,
  },
  customer_operational_event: {
    type: "customer_operational_event",
    defaultAudiences: ["operations", "customers"],
    replaySafe: true,
    retrySafe: true,
  },
  ai_recommendation: {
    type: "ai_recommendation",
    defaultAudiences: ["operations"],
    replaySafe: true,
    retrySafe: true,
  },
};
