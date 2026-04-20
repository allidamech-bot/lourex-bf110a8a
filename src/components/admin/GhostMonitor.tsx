import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Eye, MessageSquare, User } from "lucide-react";

interface MessageLog {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  order_id: string | null;
}

export const GhostMonitor = () => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (data) {
        setMessages(data);
        // Fetch sender profiles
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        if (senderIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, company_name")
            .in("id", senderIds);
          
          const map: Record<string, string> = {};
          profileData?.forEach((p) => {
            map[p.id] = p.full_name || p.company_name || p.id.slice(0, 8);
          });
          setProfiles(map);
        }
      }
      setLoading(false);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel("ghost-monitor")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => [payload.new as MessageLog, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Eye className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("ghost.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("ghost.subtitle")}</p>
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500">{t("ghost.live")}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {t("ghost.noMessages")}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {messages.map((msg) => (
              <div key={msg.id} className="p-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {profiles[msg.sender_id] || msg.sender_id.slice(0, 8)}
                      </span>
                      {msg.order_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                          #{msg.order_id.slice(0, 8)}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ms-auto">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
