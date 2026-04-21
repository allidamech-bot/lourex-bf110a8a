import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { locale, t } = useI18n();

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  useEffect(() => {
    let isMounted = true;

    const cleanupExistingNotificationChannels = async () => {
      const channels = supabase.getChannels();
      const notificationChannels = channels.filter((channel) =>
        channel.topic.includes("user-notifications:"),
      );

      await Promise.all(notificationChannels.map((channel) => supabase.removeChannel(channel)));
    };

    const setup = async () => {
      if (!userId) {
        setNotifications([]);
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        return;
      }

      await cleanupExistingNotificationChannels();

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
      } else {
        setNotifications((data as Notification[]) || []);
      }

      const channel = supabase.channel(`user-notifications:${userId}:${Date.now()}`);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return;

          const incoming = payload.new as Notification;

          setNotifications((prev) => {
            const exists = prev.some((item) => item.id === incoming.id);
            if (exists) return prev;
            return [incoming, ...prev].slice(0, 20);
          });
        },
      );

      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Notification channel error");
        }
      });

      channelRef.current = channel;
    };

    void setup();

    return () => {
      isMounted = false;

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.is_read);
    if (!userId || unread.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all notifications as read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true })),
    );
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
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
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -end-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  {t("notifications.markAllRead")}
                </button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => void handleClick(notification)}
                  className={`w-full border-b border-border/30 px-4 py-3 text-start transition-colors hover:bg-secondary/30 ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.is_read ? (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {new Date(notification.created_at).toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
