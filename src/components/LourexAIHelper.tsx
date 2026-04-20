import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LourexAIHelper = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, dir } = useI18n();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
        body: { messages: allMessages },
      });

      if (error) throw error;
      const reply = data?.reply || data?.choices?.[0]?.message?.content || "I couldn't process that request.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm temporarily unavailable. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 w-14 h-14 rounded-full bg-gradient-gold text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-gold">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
                <span className="font-serif text-sm font-bold text-primary-foreground tracking-wide">LOUREX AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors text-primary-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                  <p className="text-sm font-medium text-foreground">LOUREX AI Assistant</p>
                  <p className="text-xs text-muted-foreground mt-1">Ask about sourcing, logistics, pricing, or analytics.</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {["What factories produce FMCG?", "Calculate shipping to Riyadh", "Show me exchange rates"].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-xs text-start px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-4 py-3 rounded-bl-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask LOUREX AI..."
                  className="flex-1 bg-secondary border border-border/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="gold"
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0"
                  disabled={loading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LourexAIHelper;
