import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchUserNotifications,
  markAllUserNotificationsRead,
  markNotificationRead,
  mergeNotification,
  removeNotificationFromList,
  type NotificationRecord,
} from "@/domain/notifications/service";
import { useI18n } from "@/lib/i18n";

const POLL_INTERVAL_MS = 60_000;
const REALTIME_TIMEOUT_MS = 8_000;

const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const fallbackActiveRef = useRef(false);
  const loggedRealtimeIssueRef = useRef(false);
  const realtimeReadyRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );
  const latestNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);

  const logDevIssue = useCallback((message: string, details?: unknown) => {
    if (!import.meta.env.DEV) {
      return;
    }

    if (details) {
      console.warn(message, details);
      return;
    }

    console.warn(message);
  }, []);

  const clearSubscriptionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const removeCurrentChannel = useCallback(async () => {
    if (!channelRef.current) {
      return;
    }

    const activeChannel = channelRef.current;
    channelRef.current = null;
    await supabase.removeChannel(activeChannel);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const result = await fetchUserNotifications(userId);
    if (result.error || !result.data) {
      logDevIssue("Failed to load notifications.", result.error);
      return;
    }

    setNotifications(result.data);
  }, [logDevIssue, userId]);

  const startPolling = useCallback(() => {
    if (pollRef.current !== null) {
      return;
    }

    void fetchNotifications();
    pollRef.current = window.setInterval(() => {
      void fetchNotifications();
    }, POLL_INTERVAL_MS);
  }, [fetchNotifications]);

  const enableFallback = useCallback(
    (reason: string, details?: unknown) => {
      if (!fallbackActiveRef.current) {
        fallbackActiveRef.current = true;
        startPolling();
      }

      if (!loggedRealtimeIssueRef.current) {
        loggedRealtimeIssueRef.current = true;
        logDevIssue(
          `Notification realtime unavailable, falling back to polling (${reason}).`,
          details,
        );
      }
    },
    [logDevIssue, startPolling],
  );

  useEffect(() => {
    let isActive = true;

    const cleanup = async () => {
      clearSubscriptionTimeout();
      stopPolling();
      realtimeReadyRef.current = false;
      await removeCurrentChannel();
    };

    const setup = async () => {
      if (!userId) {
        await cleanup();
        setNotifications([]);
        return;
      }

      loggedRealtimeIssueRef.current = false;
      fallbackActiveRef.current = false;
      realtimeReadyRef.current = false;
      await fetchNotifications();

      if (!isActive) {
        return;
      }

      await removeCurrentChannel();

      if (!isActive) {
        return;
      }

      const channel = supabase.channel(`user-notifications:${userId}`);
      channelRef.current = channel;

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((current) => mergeNotification(current, payload.new));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((current) => mergeNotification(current, payload.new));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((current) => removeNotificationFromList(current, payload.old));
          },
        );

      channel.subscribe((status, error) => {
        if (!isActive || channelRef.current !== channel) {
          return;
        }

        if (status === "SUBSCRIBED") {
          clearSubscriptionTimeout();
          stopPolling();
          fallbackActiveRef.current = false;
          realtimeReadyRef.current = true;
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          enableFallback(status, error);
          return;
        }

        if (status === "CLOSED" && !realtimeReadyRef.current) {
          enableFallback(status, error);
        }
      });

      timeoutRef.current = window.setTimeout(() => {
        if (!isActive || fallbackActiveRef.current || realtimeReadyRef.current) {
          return;
        }

        enableFallback("timeout");
      }, REALTIME_TIMEOUT_MS);
    };

    void setup();

    return () => {
      isActive = false;
      void cleanup();
    };
  }, [
    clearSubscriptionTimeout,
    enableFallback,
    fetchNotifications,
    removeCurrentChannel,
    stopPolling,
    userId,
  ]);

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);

    if (!userId || unread.length === 0) {
      return;
    }

    const result = await markAllUserNotificationsRead(userId);
    if (result.error) {
      logDevIssue("Failed to mark all notifications as read.", result.error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  };

  const handleClick = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      const result = await markNotificationRead(notification.id);
      if (result.error) {
        logDevIssue("Failed to mark a notification as read.", result.error);
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }

    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        aria-label={t("notifications.title")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /> : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute end-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <h4 className="text-sm font-semibold">{t("notifications.title")}</h4>
              {unreadCount > 0 ? (
                <button onClick={() => void markAllRead()} className="text-xs text-primary hover:underline">
                  {t("notifications.markAllRead")}
                </button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              latestNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => void handleClick(notification)}
                  className={`w-full border-b border-border/30 px-4 py-3 text-start transition-colors hover:bg-secondary/30 ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead ? (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {new Date(notification.createdAt).toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="w-full px-4 py-3 text-center text-xs font-medium text-primary transition-colors hover:bg-secondary/30"
            >
              {locale === "ar" ? "عرض كل الإشعارات" : "View all notifications"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
