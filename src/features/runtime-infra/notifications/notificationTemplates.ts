import type { NotificationRoute, OperationalEvent } from "@/features/event-system/types/eventTypes";
import type { NotificationTemplate } from "@/features/runtime-infra/types/runtimeTypes";

export const buildNotificationTemplate = (
  route: NotificationRoute,
  event?: OperationalEvent,
): NotificationTemplate => ({
  id: `template:${route.id}`,
  audience: route.audience,
  priority: route.priority,
  subject: event ? `[${route.priority.toUpperCase()}] ${event.title}` : `[${route.priority.toUpperCase()}] Lourex operational alert`,
  body: event
    ? `${event.summary}\n\nEntity: ${event.entity.label}\nSource: ${event.sourceModule}`
    : route.reason,
});
