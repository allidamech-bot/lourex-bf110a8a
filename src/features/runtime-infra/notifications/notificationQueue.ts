import type { NotificationRoute, OperationalEvent } from "@/features/event-system/types/eventTypes";
import { getDeliveryPolicy } from "@/features/runtime-infra/notifications/deliveryPolicies";
import type { NotificationQueueItem, NotificationPriority } from "@/features/runtime-infra/types/runtimeTypes";

const priorityRank: Record<NotificationPriority, number> = {
  critical: 4,
  urgent: 3,
  warning: 2,
  info: 1,
};

export const createNotificationQueue = (
  routes: NotificationRoute[],
  events: OperationalEvent[],
  queuedAt: string = new Date().toISOString(),
): NotificationQueueItem[] => {
  const eventById = new Map(events.map((event) => [event.id, event]));

  return routes.map((route) => {
    const policy = getDeliveryPolicy(route.priority);
    return Object.freeze({
      id: `delivery:${route.id}`,
      route,
      event: eventById.get(route.eventId),
      priority: route.priority,
      channels: policy.channels,
      attempts: 0,
      status: "queued" as const,
      queuedAt,
    });
  }).sort((first, second) =>
    priorityRank[second.priority] - priorityRank[first.priority] ||
    first.id.localeCompare(second.id),
  );
};

export const markNotificationAcknowledged = (
  item: NotificationQueueItem,
  acknowledgedAt: string = new Date().toISOString(),
): NotificationQueueItem => Object.freeze({
  ...item,
  status: "acknowledged",
  acknowledgedAt,
});
