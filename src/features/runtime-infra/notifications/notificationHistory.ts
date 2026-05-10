import type { NotificationDeliveryRecord } from "@/features/runtime-infra/types/runtimeTypes";

export const filterDeliveryHistory = (
  history: NotificationDeliveryRecord[],
  filter: { status?: NotificationDeliveryRecord["status"]; routeId?: string } = {},
) =>
  history.filter((record) => {
    if (filter.status && record.status !== filter.status) return false;
    if (filter.routeId && record.routeId !== filter.routeId) return false;
    return true;
  }).sort((first, second) =>
    new Date(second.attemptedAt).getTime() - new Date(first.attemptedAt).getTime() ||
    first.id.localeCompare(second.id),
  );
