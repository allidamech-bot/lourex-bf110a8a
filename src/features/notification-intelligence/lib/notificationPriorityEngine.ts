export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Escalation = "NORMAL" | "ATTENTION" | "HIGH" | "CRITICAL";

type NotificationData = Record<string, unknown>;
type NotificationRecord = { priority?: string; [key: string]: unknown };

export const calculateNotificationPriority = (type: string, data: NotificationData): Priority => {
  if (type === "shipment_delayed" || type === "finance_action_required") return "CRITICAL";
  if (type === "overdue_settlement") return "HIGH";
  if (type === "missing_document") return "MEDIUM";
  return "LOW";
};

export const calculateEscalationLevel = (priority: Priority): Escalation => {
  if (priority === "CRITICAL") return "CRITICAL";
  if (priority === "HIGH") return "HIGH";
  if (priority === "MEDIUM") return "ATTENTION";
  return "NORMAL";
};

export const generateNotificationReason = (type: string): string => {
  switch (type) {
    case "shipment_delayed": return "Shipment transit timeline exceeded thresholds.";
    case "finance_action_required": return "Immediate accounting verification needed.";
    case "overdue_settlement": return "Partner settlement payment is past due.";
    case "missing_document": return "Required compliance document not found.";
    default: return "Routine operational update.";
  }
};

export const generateSuggestedAction = (type: string): string => {
  if (type === "shipment_delayed") return "Contact logistics provider for status.";
  if (type === "finance_action_required") return "Review accounting entry in dashboard.";
  return "Monitor status.";
};

export const generateDigestSummary = (notifications: NotificationRecord[]) => ({
  count: notifications.length,
  criticalCount: notifications.filter(n => n.priority === "CRITICAL").length
});
