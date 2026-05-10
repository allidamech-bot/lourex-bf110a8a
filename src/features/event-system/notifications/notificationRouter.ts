import { eventRegistry } from "@/features/event-system/events/eventRegistry";
import type {
  NotificationPriority,
  NotificationRoute,
  OperationalEvent,
  OperationalEventSeverity,
} from "@/features/event-system/types/eventTypes";

const priorityFromSeverity = (severity: OperationalEventSeverity): NotificationPriority => {
  if (severity === "critical") return "critical";
  if (severity === "high") return "urgent";
  if (severity === "medium") return "warning";
  return "info";
};

export const routeNotifications = (events: OperationalEvent[]): NotificationRoute[] =>
  events.flatMap((event) => {
    const registry = eventRegistry[event.type];
    return registry.defaultAudiences.map((audience) => ({
      id: `notification:${event.id}:${audience}`,
      eventId: event.id,
      audience,
      priority: priorityFromSeverity(event.severity),
      recommendationOnly: audience === "customers" || event.advisoryOnly,
      reason: `${event.type} routed from ${event.sourceModule}.`,
    }));
  });
