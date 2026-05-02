import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  normalizeBoolean,
  normalizeOptionalText,
  normalizeText,
  success,
} from "@/domain/shared/utils";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationPayload = Partial<NotificationRow> | null | undefined;

export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const MAX_NOTIFICATIONS = 20;

const normalizeNotification = (row: NotificationPayload): NotificationRecord | null => {
  if (!row?.id || !row.user_id) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: normalizeText(row.type),
    title: normalizeText(row.title),
    message: normalizeText(row.message),
    link: normalizeOptionalText(row.link),
    isRead: normalizeBoolean(row.is_read),
    createdAt: normalizeText(row.created_at),
  };
};

export const mergeNotification = (
  notifications: NotificationRecord[],
  incoming: NotificationPayload,
) => {
  const normalized = normalizeNotification(incoming);
  if (!normalized) {
    return notifications;
  }

  const index = notifications.findIndex((item) => item.id === normalized.id);
  if (index === -1) {
    return [normalized, ...notifications]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, MAX_NOTIFICATIONS);
  }

  const next = [...notifications];
  next[index] = normalized;
  return next.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const removeNotificationFromList = (
  notifications: NotificationRecord[],
  incoming: NotificationPayload,
) => {
  const notificationId = normalizeText(incoming?.id);
  if (!notificationId) {
    return notifications;
  }

  return notifications.filter((item) => item.id !== notificationId);
};

export const fetchUserNotifications = async (
  userId: string,
): Promise<DomainResult<NotificationRecord[]>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user id is required.");
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS);

    if (error) {
      return { data: null, error: createDomainError(error, "Unable to load notifications.") };
    }

    return success((data ?? []).map(normalizeNotification).filter(Boolean) as NotificationRecord[]);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load notifications."),
    };
  }
};

export const markAllUserNotificationsRead = async (
  userId: string,
): Promise<DomainResult<null>> => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    return failure("A valid user id is required.");
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", normalizedUserId)
      .eq("is_read", false);

    if (error) {
      return { data: null, error: createDomainError(error, "Unable to mark notifications as read.") };
    }

    return success(null);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to mark notifications as read."),
    };
  }
};

export const markNotificationRead = async (
  notificationId: string,
): Promise<DomainResult<null>> => {
  const normalizedNotificationId = normalizeText(notificationId);
  if (!normalizedNotificationId) {
    return failure("A valid notification id is required.");
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", normalizedNotificationId);

    if (error) {
      return { data: null, error: createDomainError(error, "Unable to mark the notification as read.") };
    }

    return success(null);
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to mark the notification as read."),
    };
  }
};
