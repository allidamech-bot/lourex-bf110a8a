import { buildNotificationTemplate } from "@/features/runtime-infra/notifications/notificationTemplates";
import { getDeliveryPolicy } from "@/features/runtime-infra/notifications/deliveryPolicies";
import type {
  DeliveryChannel,
  NotificationDeliveryRecord,
  NotificationQueueItem,
} from "@/features/runtime-infra/types/runtimeTypes";

export type DeliverySimulation = {
  failChannels?: DeliveryChannel[];
  now?: Date;
};

const shouldFailChannel = (channel: DeliveryChannel, simulation?: DeliverySimulation) =>
  Boolean(simulation?.failChannels?.includes(channel));

export const deliverNotificationQueue = (
  queue: NotificationQueueItem[],
  simulation: DeliverySimulation = {},
): { queue: NotificationQueueItem[]; history: NotificationDeliveryRecord[] } => {
  const attemptedAt = (simulation.now || new Date()).toISOString();
  const history: NotificationDeliveryRecord[] = [];

  const updatedQueue = queue.map((item) => {
    const policy = getDeliveryPolicy(item.priority);
    const template = buildNotificationTemplate(item.route, item.event);
    const failed = item.channels.some((channel) => shouldFailChannel(channel, simulation));
    const attempts = item.attempts + 1;
    const canRetry = failed && attempts < policy.maxAttempts;
    const status = failed ? (canRetry ? "retry_scheduled" : "failed") : (item.route.recommendationOnly ? "mocked" : "delivered");

    item.channels.forEach((channel) => {
      history.push(Object.freeze({
        id: `delivery-history:${item.id}:${channel}:${attempts}`,
        queueItemId: item.id,
        routeId: item.route.id,
        status,
        channel,
        attemptedAt,
        attempts,
        message: failed
          ? `${template.subject} delivery attempt requires retry or manual follow-up.`
          : `${template.subject} prepared for ${channel}.`,
        recommendationOnly: item.route.recommendationOnly,
      }));
    });

    return Object.freeze({
      ...item,
      attempts,
      status,
      nextAttemptAt: canRetry
        ? new Date(new Date(attemptedAt).getTime() + policy.retryAfterMinutes * 60_000).toISOString()
        : item.nextAttemptAt,
    });
  });

  return { queue: updatedQueue, history };
};
