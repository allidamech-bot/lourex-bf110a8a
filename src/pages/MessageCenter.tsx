import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const MessageCenter = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      if (orderId) {
        const { data: order } = await supabase.from("orders").select("order_number").eq("id", orderId).maybeSingle();
        setOrderNumber(order?.order_number || orderId);

        const { data } = await supabase
          .from("messages" as any)
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });
        setMessages((data as unknown as Message[]) || []);
      }
    };
    init();
  }, [orderId, navigate]);

  // Realtime subscription
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`messages-${orderId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !orderId) return;
    setSending(true);

    const { error } = await supabase.from("messages" as any).insert({
      order_id: orderId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) setNewMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-20 pb-4 flex-1 flex flex-col">
        <div className="container mx-auto px-4 md:px-8 flex-1 flex flex-col max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 py-4 border-b border-border/50">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-serif text-lg font-semibold">{t("msg.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("msg.order")}: {orderNumber}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? "bg-gold text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 py-3 border-t border-border/50">
            <Input
              placeholder={t("msg.placeholder")}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="bg-secondary border-border flex-1"
            />
            <Button variant="gold" size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessageCenter;
