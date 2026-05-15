import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import {
  ensureOfficialOrderConversation,
  getOfficialOrderConversation,
  isOfficialConversationEligibleStatus,
  markOfficialConversationRead,
  sendOfficialConversationMessage,
  type OfficialConversationMessage,
  type OfficialOrderConversation,
} from "@/domain/support/orderConversations";

type OfficialOrderConversationBoxProps = {
  requestId: string;
  requestNumber?: string;
  dealId?: string | null;
  customerId?: string | null;
  status?: string | null;
  role: "customer" | "admin";
  assignedAdminId?: string | null;
};

const formatTime = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const senderLabel = (senderType: OfficialConversationMessage["senderType"], lang: string) => {
  if (senderType === "system") return lang === "ar" ? "النظام" : "System";
  if (senderType === "admin") return lang === "ar" ? "LOUREX" : "LOUREX";
  return lang === "ar" ? "العميل" : "Customer";
};

export const OfficialOrderConversationBox = ({
  requestId,
  requestNumber,
  dealId,
  customerId,
  status,
  role,
  assignedAdminId,
}: OfficialOrderConversationBoxProps) => {
  const { lang, locale, dir } = useI18n();
  const { profile } = useAuthSession();
  const [conversation, setConversation] = useState<OfficialOrderConversation | null>(null);
  const [messages, setMessages] = useState<OfficialConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const latestRef = useRef<HTMLDivElement>(null);

  const isEligible = isOfficialConversationEligibleStatus(status);
  const isAdmin = role === "admin";

  const copy = {
    title: lang === "ar" ? "محادثة رسمية" : "Official conversation",
    unavailable:
      lang === "ar"
        ? "المحادثة الرسمية غير مهيأة حالياً. يمكن لفريق LOUREX متابعة الطلب من قناة الدعم."
        : "The official conversation is not configured yet. LOUREX can continue through the support channel.",
    loading: lang === "ar" ? "جاري تحميل المحادثة..." : "Loading conversation...",
    empty:
      lang === "ar"
        ? "تم فتح المحادثة الرسمية. اكتب أول رسالة لمتابعة التفاصيل."
        : "The official conversation is open. Send the first follow-up message.",
    placeholder: lang === "ar" ? "اكتب رسالة رسمية مرتبطة بهذا الطلب..." : "Write an official message for this order...",
    send: lang === "ar" ? "إرسال" : "Send",
    sending: lang === "ar" ? "جاري الإرسال..." : "Sending...",
    notOpen:
      lang === "ar"
        ? "تظهر المحادثة الرسمية بعد قبول الطلب."
        : "The official conversation appears after the request is accepted.",
    unread: lang === "ar" ? "غير مقروء" : "unread",
  };

  const unreadCount = useMemo(
    () =>
      messages.filter((message) => {
        if (message.readAt) return false;
        return role === "customer" ? message.senderType === "admin" || message.senderType === "system" : message.senderType === "customer";
      }).length,
    [messages, role],
  );

  const loadConversation = useCallback(async () => {
    if (!isEligible) return;

    setLoading(true);
    setError("");

    try {
      let thread = await getOfficialOrderConversation({ requestId, dealId });

      if (!thread.conversation && isAdmin) {
        await ensureOfficialOrderConversation({
          requestId,
          requestNumber,
          dealId,
          customerId,
          assignedAdminId: assignedAdminId || profile?.id || null,
          lang,
        });
        thread = await getOfficialOrderConversation({ requestId, dealId });
      }

      setConversation(thread.conversation);
      setMessages(thread.messages);

      if (thread.conversation) {
        void markOfficialConversationRead({ conversationId: thread.conversation.id, viewerType: role });
      }

      if (thread.unavailable) {
        setError(copy.unavailable);
      }
    } catch (loadError) {
      logOperationalError("official_order_conversation_load", loadError, { requestId, dealId });
      setError(copy.unavailable);
    } finally {
      setLoading(false);
    }
  }, [assignedAdminId, copy.unavailable, customerId, dealId, isAdmin, isEligible, lang, profile?.id, requestId, requestNumber, role]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    latestRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!conversation || sending || !draft.trim()) return;

    setSending(true);
    setError("");

    const result = await sendOfficialConversationMessage({
      conversationId: conversation.id,
      senderId: profile?.id || null,
      senderType: role === "customer" ? "customer" : "admin",
      message: draft,
      requestId: conversation.requestId || requestId,
      customerId: conversation.customerId || customerId,
      dealId: conversation.dealId || dealId,
    });

    setSending(false);

    if (result.error || !result.message) {
      setError(copy.unavailable);
      return;
    }

    setDraft("");
    setMessages((current) => [...current, result.message as OfficialConversationMessage]);
  };

  if (!isEligible) {
    return (
    <section className="min-w-0 rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4 text-sm text-muted-foreground" dir={dir}>
        {copy.notOpen}
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-[1.35rem] border border-primary/25 bg-primary/5 p-4 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.55)]" dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg font-semibold leading-tight">{copy.title}</h3>
              <span className="max-w-full truncate rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {copy.title}
              </span>
            </div>
            {requestNumber ? <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{requestNumber}</p> : null}
          </div>
        </div>

        {unreadCount > 0 ? (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
            {unreadCount} {copy.unread}
          </span>
        ) : null}
      </div>

      <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto rounded-[1rem] border border-white/10 bg-background/40 p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.loading}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
            <span>{copy.empty}</span>
          </div>
        ) : (
          messages.map((message, index) => {
            const ownMessage = role === "customer" ? message.senderType === "customer" : message.senderType === "admin";
            const systemMessage = message.senderType === "system";

            return (
              <div
                key={message.id}
                className={`flex ${systemMessage ? "justify-center" : ownMessage ? "justify-end" : "justify-start"}`}
                ref={index === messages.length - 1 ? latestRef : undefined}
              >
                <div
                  className={`max-w-full rounded-2xl px-3 py-2 text-sm leading-6 sm:max-w-[88%] ${
                    systemMessage
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : ownMessage
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] opacity-75">
                    <span>{senderLabel(message.senderType, lang)}</span>
                    <span>{formatTime(message.createdAt, locale)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{message.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={latestRef} />
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.placeholder}
          rows={3}
          disabled={!conversation || sending}
        />
        <Button type="button" variant="gold" className="min-w-fit whitespace-nowrap" onClick={() => void handleSend()} disabled={!conversation || sending || !draft.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? copy.sending : copy.send}
        </Button>
      </div>
    </section>
  );
};
