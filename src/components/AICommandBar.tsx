import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Ship, Calculator, TrendingUp, Package, Loader2, DollarSign, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AICommandBar = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, dir } = useI18n();
  const location = useLocation();

  // Context-aware: determine current page context
  const getPageContext = () => {
    const path = location.pathname;
    if (path.includes("track")) return "shipping";
    if (path.includes("orders")) return "orders";
    if (path.includes("catalog")) return "catalog";
    if (path.includes("admin")) return "admin";
    if (path.includes("factory")) return "factory";
    if (path.includes("dashboard")) return "dashboard";
    return "general";
  };

  const contextCommands: Record<string, typeof quickCommands> = {
    shipping: [
      { icon: Ship, label: "Track my latest shipment", labelAr: "تتبع آخر شحنة" },
      { icon: Calculator, label: "Calculate landed cost for 500 units to Jeddah", labelAr: "حساب تكلفة 500 وحدة إلى جدة" },
      { icon: TrendingUp, label: "Show current FX rates USD/SAR/TRY", labelAr: "أسعار الصرف الحالية" },
    ],
    orders: [
      { icon: Package, label: "Summarize my pending orders", labelAr: "ملخص طلباتي المعلقة" },
      { icon: DollarSign, label: "Calculate total outstanding balance", labelAr: "حساب الرصيد المستحق" },
      { icon: FileText, label: "List orders awaiting deposit", labelAr: "الطلبات بانتظار العربون" },
    ],
    factory: [
      { icon: Package, label: "Show production status for all orders", labelAr: "حالة الإنتاج لجميع الطلبات" },
      { icon: Users, label: "List my team members and roles", labelAr: "قائمة أعضاء فريقي" },
      { icon: Calculator, label: "Forecast next month's order volume", labelAr: "توقعات حجم الطلبات" },
    ],
    admin: [
      { icon: TrendingUp, label: "Show platform analytics summary", labelAr: "ملخص تحليلات المنصة" },
      { icon: Users, label: "List pending KYC applications", labelAr: "طلبات التحقق المعلقة" },
      { icon: DollarSign, label: "Total revenue this month", labelAr: "إجمالي الإيرادات هذا الشهر" },
    ],
    general: [
      { icon: Ship, label: "Ship 500 units of food to Jeddah", labelAr: "شحن 500 وحدة غذائية إلى جدة" },
      { icon: Calculator, label: "Calculate landed cost for cosmetics", labelAr: "حساب تكلفة استيراد مستحضرات التجميل" },
      { icon: TrendingUp, label: "Show exchange rates USD/TRY/SAR", labelAr: "أسعار الصرف USD/TRY/SAR" },
      { icon: Package, label: "Recommend container for 2000 cartons", labelAr: "اقتراح حاوية لـ 2000 كرتون" },
    ],
  };

  const quickCommands = [
    { icon: Ship, label: "Ship 500 units to Jeddah", labelAr: "شحن 500 وحدة إلى جدة" },
    { icon: Calculator, label: "Calculate landed cost for food items", labelAr: "حساب تكلفة الاستيراد للمواد الغذائية" },
    { icon: TrendingUp, label: "Show exchange rates USD/TRY/SAR", labelAr: "أسعار الصرف USD/TRY/SAR" },
    { icon: Package, label: "Recommend container for 2000 cartons", labelAr: "اقتراح حاوية لـ 2000 كرتون" },
  ];

  const activeCommands = contextCommands[getPageContext()] || contextCommands.general;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
        body: {
          messages: allMessages,
          context: getPageContext(),
          language: lang,
        },
      });
      if (error) throw error;
      const reply = data?.reply || data?.choices?.[0]?.message?.content || "I couldn't process that request.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: lang === "ar" ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, I'm temporarily unavailable. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const contextLabel = {
    shipping: lang === "ar" ? "📦 وضع الشحن" : "📦 Shipping Mode",
    orders: lang === "ar" ? "📋 وضع الطلبات" : "📋 Orders Mode",
    factory: lang === "ar" ? "🏭 وضع المصنع" : "🏭 Factory Mode",
    admin: lang === "ar" ? "🔒 وضع الإدارة" : "🔒 Admin Mode",
    catalog: lang === "ar" ? "📂 وضع الكتالوج" : "📂 Catalog Mode",
    dashboard: lang === "ar" ? "📊 وضع اللوحة" : "📊 Dashboard Mode",
    general: lang === "ar" ? "🌐 وضع عام" : "🌐 General Mode",
  }[getPageContext()];

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
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 w-14 h-14 rounded-full bg-gradient-gold shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open LOUREX AI"
          >
            <Sparkles className="w-6 h-6 text-background group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Command Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[75vh] rounded-2xl border border-primary/20 bg-card shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-gradient-gold">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-background" />
                <div>
                  <span className="font-serif text-sm font-bold text-background tracking-wide">LOUREX AI</span>
                  <p className="text-[10px] text-background/70 font-medium">
                    {lang === "ar" ? "مدير العمليات الذكي" : "Intelligent Operations Manager"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-background/20 text-background px-2 py-0.5 rounded-full font-medium">
                  {contextLabel}
                </span>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-background/10 transition-colors text-background">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="py-4">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === "ar" ? "مرحباً! كيف أساعدك اليوم؟" : "How can I help you today?"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === "ar" ? "اكتب أمرك وسأتولى الباقي" : "Type a command and I'll handle the rest"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {activeCommands.map((cmd) => (
                      <button
                        key={cmd.label}
                        onClick={() => sendMessage(lang === "ar" ? cmd.labelAr : cmd.label)}
                        className="w-full flex items-center gap-3 text-start px-3.5 py-2.5 rounded-xl border border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all text-xs group"
                      >
                        <cmd.icon className="w-4 h-4 text-primary/50 group-hover:text-primary shrink-0 transition-colors" />
                        <span>{lang === "ar" ? cmd.labelAr : cmd.label}</span>
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
                      : "bg-secondary text-foreground rounded-bl-sm border border-primary/10"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-4 py-3 rounded-bl-sm border border-primary/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        {lang === "ar" ? "جاري المعالجة..." : "Processing..."}
                      </span>
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
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={lang === "ar" ? "اكتب أمرك هنا..." : "Type your command..."}
                  className="flex-1 bg-secondary border border-primary/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground text-foreground"
                  disabled={loading}
                  dir={dir}
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

export default AICommandBar;
