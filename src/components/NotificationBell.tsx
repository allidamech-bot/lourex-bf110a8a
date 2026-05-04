import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();
  const { locale, t, lang } = useI18n();
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
  const getNotificationDisplay = useCallback(
    (notification: NotificationRecord) => {
      switch (notification.type) {
        case "purchase_request_created":
          return {
            title: t("notifications.events.purchaseRequestCreated.title"),
            message: t("notifications.events.purchaseRequestCreated.message"),
          };
        case "purchase_request_approved":
          return {
            title: t("notifications.events.purchaseRequestApproved.title"),
            message: t("notifications.events.purchaseRequestApproved.message"),
          };
        case "purchase_request_cancelled":
          return {
            title: t("notifications.events.purchaseRequestCancelled.title"),
            message: t("notifications.events.purchaseRequestCancelled.message"),
          };
        case "purchase_request_ready_for_conversion":
          return {
            title: t("notifications.events.purchaseRequestReady.title"),
            message: t("notifications.events.purchaseRequestReady.message"),
          };
        case "request_conversion":
          return {
            title: t("notifications.events.dealCreated.title"),
            message: t("notifications.events.dealCreated.message"),
          };
        case "tracking_update":
          return {
            title: t("notifications.events.shipmentUpdated.title"),
            message: t("notifications.events.shipmentUpdated.message"),
          };
        case "financial_edit_request":
          return {
            title: t("notifications.events.editRequestSubmitted.title"),
            message: t("notifications.events.editRequestSubmitted.message"),
          };
        case "financial_edit_request_review":
          return notification.title.toLowerCase().includes("rejected")
            ? {
                title: t("notifications.events.editRequestRejected.title"),
                message: t("notifications.events.editRequestRejected.message"),
              }
            : {
                title: t("notifications.events.editRequestApproved.title"),
                message: t("notifications.events.editRequestApproved.message"),
              };
        default:
          return {
            title: notification.title,
            message: notification.message,
          };
      }
    },
    [t],
  );

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
      setLoadError("");
      return;
    }

    setLoading(true);
    const result = await fetchUserNotifications(userId);
    if (result.error || !result.data) {
      logDevIssue("Failed to load notifications.", result.error);
      setLoadError(t("notifications.loadError"));
      setLoading(false);
      return;
    }

    setNotifications(result.data);
    setLoadError("");
    setLoading(false);
  }, [logDevIssue, t, userId]);

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

      // We use a unique instance ID for each channel to prevent race conditions
      // during rapid re-mounts or session switches.
      const instanceId = Date.now();
      const channel = supabase
        .channel(`user-notifications:${userId}:${instanceId}`)
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

      channelRef.current = channel;
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
    <div className="relative shrink-0">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
          unreadCount > 0
            ? "bg-gold/15 border border-gold/30 text-gold hover:bg-gold/22 hover:border-gold/45 shadow-[0_0_12px_rgba(212,166,58,0.2)]"
            : "border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-slate-200"
        }`}
        aria-label={t("notifications.title")}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span
            className="absolute -end-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-background"
            style={{ background: "var(--gold)", boxShadow: "0 0 10px rgba(212,166,58,0.6)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /> : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass-dropdown fixed inset-x-3 top-20 z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[340px]"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <h4 className="text-sm font-semibold text-white">{t("notifications.title")}</h4>
                {unreadCount > 0 ? (
                  <p className="mt-0.5 text-[11px] text-gold/80">
                    {t("notifications.unreadCount", { count: unreadCount })}
                  </p>
                ) : null}
              </div>
              {unreadCount > 0 ? (
                <button
                  onClick={() => void markAllRead()}
                  disabled={loading}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/10 hover:text-gold-light disabled:opacity-50"
                  aria-busy={loading}
                >
                  {t("notifications.markAllRead")}
                </button>
              ) : null}
            </div>

            {/* Body */}
            <div className="max-h-[22rem] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  {t("common.loading")}
                </div>
              ) : loadError ? (
                <div className="px-4 py-10 text-center text-sm text-red-400">
                  {loadError}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-slate-400">
                  <Bell className="h-8 w-8 opacity-20" />
                  <p>{t("notifications.empty")}</p>
                </div>
              ) : (
                latestNotifications.map((notification) => {
                  const display = getNotificationDisplay(notification);
                  const typeMap: Record<string, string> = {
                    purchase_request_created: "info",
                    purchase_request_approved: "success",
                    purchase_request_cancelled: "error",
                    purchase_request_ready_for_conversion: "success",
                    request_conversion: "success",
                    tracking_update: "info",
                    financial_edit_request: "warning",
                    financial_edit_request_review: notification.title.toLowerCase().includes("rejected") ? "error" : "success",
                  };
                  const notifType = typeMap[notification.type] ?? "info";
                  const typeClass = `notif-${notifType}`;

                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(notification.createdAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return lang === "ar" ? "الآن" : "Just now";
                    if (mins < 60) return lang === "ar" ? `منذ ${mins} د` : `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return lang === "ar" ? `منذ ${hrs} س` : `${hrs}h ago`;
                    return new Date(notification.createdAt).toLocaleDateString(locale);
                  })();

                  return (
                    <button
                      key={notification.id}
                      onClick={() => void handleClick(notification)}
                      className={`w-full text-start transition-colors hover:bg-white/[0.03] ${typeClass} ${
                        !notification.isRead ? "" : "opacity-75"
                      }`}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          {!notification.isRead ? (
                            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 animate-soft-pulse" />
                          ) : (
                            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${!notification.isRead ? "text-white" : "text-slate-300"}`}>
                              {display.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">
                              {display.message}
                            </p>
                            <p className="mt-1.5 text-[10px] text-slate-500">{timeAgo}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <button
              type="button"
              onClick={() => { setOpen(false); navigate("/profile"); }}
              className="w-full py-3 text-center text-[11px] font-medium text-blue-300 transition-colors hover:bg-blue-500/10 hover:text-blue-100"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {t("notifications.viewAll")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
