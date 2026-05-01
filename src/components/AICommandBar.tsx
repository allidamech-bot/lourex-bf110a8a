import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquareText,
  Package,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type PageContext =
  | "public_home"
  | "public_request"
  | "public_tracking"
  | "customer_portal"
  | "customer_requests"
  | "customer_tracking"
  | "dashboard_home"
  | "dashboard_purchase_requests"
  | "dashboard_tracking"
  | "dashboard_accounting"
  | "dashboard_reports"
  | "unknown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuickCommand {
  icon: typeof Sparkles;
  label: string;
  labelAr: string;
}

const detectPageContext = (pathname: string): PageContext => {
  if (pathname === "/") return "public_home";
  if (pathname === "/request") return "public_request";
  if (pathname === "/track") return "public_tracking";
  if (pathname === "/customer-portal") return "customer_portal";
  if (pathname === "/customer-portal/requests") return "customer_requests";
  if (pathname === "/customer-portal/tracking") return "customer_tracking";
  if (pathname === "/dashboard") return "dashboard_home";
  if (pathname === "/dashboard/requests") return "dashboard_purchase_requests";
  if (pathname === "/dashboard/tracking") return "dashboard_tracking";
  if (pathname === "/dashboard/accounting") return "dashboard_accounting";
  if (pathname === "/dashboard/reports") return "dashboard_reports";
  if (pathname === "/admin") return "dashboard_home";
  if (pathname.startsWith("/dashboard/")) return "dashboard_home";

  return "unknown";
};

const contextLabels: Record<PageContext, { en: string; ar: string }> = {
  public_home: { en: "Lourex Mode", ar: "وضع لوركس" },
  public_request: { en: "Request Mode", ar: "وضع طلب الشراء" },
  public_tracking: { en: "Tracking Mode", ar: "وضع التتبع" },
  customer_portal: { en: "Customer Mode", ar: "وضع العميل" },
  customer_requests: { en: "Request Status Mode", ar: "وضع حالة الطلبات" },
  customer_tracking: { en: "Shipment Mode", ar: "وضع الشحنات" },
  dashboard_home: { en: "Owner Mode", ar: "وضع الإدارة" },
  dashboard_purchase_requests: { en: "Operations Mode", ar: "وضع العمليات" },
  dashboard_tracking: { en: "Logistics Mode", ar: "وضع اللوجستيات" },
  dashboard_accounting: { en: "Accounting Mode", ar: "وضع المحاسبة" },
  dashboard_reports: { en: "Reports Mode", ar: "وضع التقارير" },
  unknown: { en: "Copilot Mode", ar: "وضع المساعد" },
};

const quickCommandsByContext: Record<PageContext, QuickCommand[]> = {
  public_home: [
    { icon: Package, label: "Ask about purchase requests", labelAr: "اسأل عن طلبات الشراء" },
    { icon: Ship, label: "Ask about tracking", labelAr: "اسأل عن التتبع" },
    { icon: Calculator, label: "Ask about accounting", labelAr: "اسأل عن المحاسبة" },
    { icon: HelpCircle, label: "Ask about Lourex process", labelAr: "اسأل عن آلية عمل لوركس" },
  ],
  public_request: [
    { icon: ShieldCheck, label: "Analyze what information is needed for a strong sourcing request", labelAr: "حلل المعلومات المطلوبة لطلب توريد قوي" },
    { icon: Package, label: "Suggest product details I should add", labelAr: "اقترح تفاصيل المنتج التي يجب إضافتها" },
    { icon: HelpCircle, label: "Explain how Lourex reviews purchase requests", labelAr: "اشرح كيف تراجع لوركس طلبات الشراء" },
    { icon: MessageSquareText, label: "Draft a clearer product description", labelAr: "اكتب وصفا أوضح للمنتج" },
  ],
  public_tracking: [
    { icon: Ship, label: "Explain this tracking stage", labelAr: "اشرح مرحلة التتبع هذه" },
    { icon: HelpCircle, label: "What should I expect next?", labelAr: "ماذا أتوقع بعد ذلك؟" },
    { icon: AlertCircle, label: "What can cause delays?", labelAr: "ما الأسباب المحتملة للتأخير؟" },
    { icon: FileText, label: "Explain shipping terms simply", labelAr: "اشرح مصطلحات الشحن ببساطة" },
  ],
  customer_portal: [
    { icon: FileText, label: "Summarize my next steps", labelAr: "لخص خطواتي التالية" },
    { icon: HelpCircle, label: "Explain what Lourex is waiting for", labelAr: "اشرح ما الذي تنتظره لوركس" },
    { icon: Package, label: "Explain what I need to provide", labelAr: "اشرح ما الذي يجب أن أوفره" },
    { icon: ShieldCheck, label: "Help me understand my request status", labelAr: "ساعدني على فهم حالة طلبي" },
  ],
  customer_requests: [
    { icon: HelpCircle, label: "Explain request statuses", labelAr: "اشرح حالات الطلبات" },
    { icon: Package, label: "Help me improve a request", labelAr: "ساعدني على تحسين طلب" },
    { icon: MessageSquareText, label: "Draft a clarification message", labelAr: "اكتب رسالة توضيح" },
    { icon: FileText, label: "What details should I add?", labelAr: "ما التفاصيل التي يجب أن أضيفها؟" },
  ],
  customer_tracking: [
    { icon: Ship, label: "Explain my shipment stage", labelAr: "اشرح مرحلة شحنتي" },
    { icon: HelpCircle, label: "What happens next?", labelAr: "ماذا يحدث بعد ذلك؟" },
    { icon: AlertCircle, label: "Is this delay normal?", labelAr: "هل هذا التأخير طبيعي؟" },
    { icon: MessageSquareText, label: "Draft a message asking for an update", labelAr: "اكتب رسالة لطلب تحديث" },
  ],
  dashboard_home: [
    { icon: BarChart3, label: "Summarize operational priorities", labelAr: "لخص أولويات العمليات" },
    { icon: ShieldCheck, label: "What should the team review first?", labelAr: "ما الذي يجب أن يراجعه الفريق أولا؟" },
    { icon: AlertCircle, label: "List risk indicators to check today", labelAr: "اذكر مؤشرات المخاطر التي يجب فحصها اليوم" },
    { icon: FileText, label: "Explain today's workload", labelAr: "اشرح عبء العمل اليوم" },
  ],
  dashboard_purchase_requests: [
    { icon: FileText, label: "Summarize a purchase request", labelAr: "لخص طلب شراء" },
    { icon: MessageSquareText, label: "Generate customer clarification questions", labelAr: "أنشئ أسئلة توضيحية للعميل" },
    { icon: Package, label: "Generate supplier brief draft", labelAr: "أنشئ مسودة موجز للمورد" },
    { icon: AlertCircle, label: "Identify missing request information", labelAr: "حدد معلومات الطلب الناقصة" },
    { icon: ShieldCheck, label: "Suggest compliance notes", labelAr: "اقترح ملاحظات امتثال" },
  ],
  dashboard_tracking: [
    { icon: AlertCircle, label: "Explain shipment delay risks", labelAr: "اشرح مخاطر تأخير الشحنة" },
    { icon: MessageSquareText, label: "Draft customer shipment update", labelAr: "اكتب تحديث شحنة للعميل" },
    { icon: Ship, label: "Identify shipments needing updates", labelAr: "حدد الشحنات التي تحتاج إلى تحديث" },
    { icon: HelpCircle, label: "Explain next logistics step", labelAr: "اشرح الخطوة اللوجستية التالية" },
  ],
  dashboard_accounting: [
    { icon: Calculator, label: "Explain a financial entry", labelAr: "اشرح قيدا ماليا" },
    { icon: MessageSquareText, label: "Draft customer statement note", labelAr: "اكتب ملاحظة كشف حساب للعميل" },
    { icon: AlertCircle, label: "Identify items needing review", labelAr: "حدد البنود التي تحتاج إلى مراجعة" },
    { icon: HelpCircle, label: "Explain balance in simple terms", labelAr: "اشرح الرصيد بعبارات بسيطة" },
  ],
  dashboard_reports: [
    { icon: FileText, label: "Draft executive summary", labelAr: "اكتب ملخصا تنفيذيا" },
    { icon: BarChart3, label: "Summarize customer activity", labelAr: "لخص نشاط العملاء" },
    { icon: ShieldCheck, label: "Summarize operational performance", labelAr: "لخص الأداء التشغيلي" },
    { icon: Sparkles, label: "Suggest report highlights", labelAr: "اقترح أبرز نقاط التقرير" },
  ],
  unknown: [
    { icon: Package, label: "Ask about purchase requests", labelAr: "اسأل عن طلبات الشراء" },
    { icon: Ship, label: "Ask about tracking", labelAr: "اسأل عن التتبع" },
    { icon: Calculator, label: "Ask about accounting", labelAr: "اسأل عن المحاسبة" },
    { icon: HelpCircle, label: "Ask about Lourex process", labelAr: "اسأل عن آلية عمل لوركس" },
  ],
};

const AICommandBar = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, locale, dir } = useI18n();
  const { profile } = useAuthSession();
  const location = useLocation();

  const pageContext = useMemo(() => detectPageContext(location.pathname), [location.pathname]);
  const activeCommands = quickCommandsByContext[pageContext] ?? quickCommandsByContext.unknown;
  const contextLabel = contextLabels[pageContext] ?? contextLabels.unknown;
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const fallbackMessage =
    lang === "ar"
      ? "مساعد LOUREX AI غير متاح الآن. يمكنك المتابعة يدويا."
      : "LOUREX AI is unavailable right now. You can continue manually.";

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const responseLanguage = lang === "ar" ? "Arabic" : "English";
      const { data, error: invokeError } = await supabase.functions.invoke("lourex-ai-chat", {
        body: {
          message: lang === "ar" ? `${msg}\n\nأجب باللغة العربية فقط.` : `${msg}\n\nRespond in English only.`,
          messages: allMessages,
          pageContext,
          route: location.pathname,
          locale,
          language: lang,
          responseLanguage,
          languageInstruction: `Respond in ${responseLanguage} only.`,
          userRole: profile?.role ?? "guest",
        },
      });

      if (invokeError) throw invokeError;

      const reply =
        data?.reply ||
        data?.choices?.[0]?.message?.content ||
        (lang === "ar"
          ? "لم أتمكن من إنشاء رد مناسب الآن."
          : "I couldn't generate a useful response right now.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError(fallbackMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className={`fixed bottom-4 ${isRtl ? "left-4 sm:left-6" : "right-4 sm:right-6"} z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-gradient-gold text-primary-foreground shadow-[0_18px_40px_-20px_hsl(var(--gold)/0.75)] transition-shadow hover:shadow-[0_24px_48px_-18px_hsl(var(--gold)/0.85)] sm:bottom-6`}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            aria-label={lang === "ar" ? "افتح مساعد LOUREX AI" : "Open LOUREX AI Copilot"}
          >
            <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`fixed bottom-3 ${isRtl ? "left-3 sm:left-6" : "right-3 sm:right-6"} z-50 flex h-[min(620px,calc(100vh-1.5rem))] w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-primary/30 bg-[#0b0b0b] shadow-2xl shadow-black/70 sm:bottom-6`}
            dir={dir}
          >
            <div className="border-b border-primary/20 bg-[linear-gradient(180deg,#151515,#0d0d0d)] px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">LOUREX AI Copilot</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lang === "ar" ? "مساعد عمليات استشاري" : "Advisory operations assistant"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    {lang === "ar" ? contextLabel.ar : contextLabel.en}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border/80 bg-card p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    aria-label={lang === "ar" ? "إغلاق" : "Close"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-between gap-5 py-2">
                  <div className="rounded-2xl border border-primary/20 bg-card/80 p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {lang === "ar" ? "كيف أساعدك في عمليات لوركس؟" : "How can I support this Lourex workflow?"}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                          {lang === "ar"
                            ? "أستطيع إعداد ملخصات، مسودات، تفسيرات، وأسئلة مراجعة. لا أنفذ إجراءات تشغيلية أو تعديلات على البيانات."
                            : "I can draft summaries, explanations, review questions, and advisory notes. I do not perform operational actions or data changes."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeCommands.map((cmd) => (
                      <button
                        key={cmd.label}
                        type="button"
                        onClick={() => void sendMessage(lang === "ar" ? cmd.labelAr : cmd.label)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-[#111111] px-3.5 py-3 text-start text-xs font-semibold text-muted-foreground transition-all hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                      >
                        <cmd.icon className="h-4 w-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
                        <span className="leading-5">{lang === "ar" ? cmd.labelAr : cmd.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg, index) => (
                <div key={`${msg.role}-${index}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 ${
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-primary/15 bg-secondary text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-primary/15 bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {lang === "ar" ? "يقوم مساعد لوركس بإعداد رد استشاري..." : "LOUREX AI is preparing advisory guidance..."}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-primary/20 bg-[#0d0d0d] p-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={lang === "ar" ? "اكتب طلبا استشاريا..." : "Ask for an advisory summary, draft, or explanation..."}
                  className="min-w-0 flex-1 rounded-xl border border-primary/15 bg-secondary px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
                  disabled={loading}
                  dir={dir}
                />
                <Button
                  type="submit"
                  variant="gold"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl"
                  disabled={loading || !input.trim()}
                  aria-label={lang === "ar" ? "إرسال" : "Send"}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default AICommandBar;
