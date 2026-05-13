import { useState } from "react";
import { Mail, MessageSquareText, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publicContactInfo, getWhatsAppUrl } from "@/lib/contactInfo";
import { useI18n } from "@/lib/i18n";
import {
  getSupportFallbackCopy,
  getSupportReceivedMessage,
  submitSupportConversation,
} from "@/domain/support/conversations";

type SupportConversationWidgetProps = {
  relatedReference?: string;
  compact?: boolean;
};

export const SupportConversationWidget = ({ relatedReference, compact = false }: SupportConversationWidgetProps) => {
  const { lang, dir } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const copy = {
    title: lang === "ar" ? "تواصل مع LOUREX" : "Contact LOUREX support",
    description:
      lang === "ar"
        ? "أرسل رسالة للفريق. إذا لم يكن الرد المباشر متاحاً، سيعود إليك مشرف قريباً."
        : "Send a message to the team. If live support is unavailable, a supervisor will reply soon.",
    name: lang === "ar" ? "الاسم" : "Name",
    contact: lang === "ar" ? "البريد أو الهاتف" : "Email or phone",
    message: lang === "ar" ? "الرسالة" : "Message",
    submit: lang === "ar" ? "إرسال" : "Send",
    sending: lang === "ar" ? "جارٍ الإرسال..." : "Sending...",
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await submitSupportConversation({ name, contact, message, relatedReference }, lang);
    setStatus(result.message || getSupportReceivedMessage(lang));
    setSubmitting(false);

    if (!result.error) {
      setMessage("");
    }
  };

  return (
    <section
      className={`rounded-2xl border border-primary/20 bg-card/90 ${compact ? "p-4" : "p-5"} shadow-[0_18px_42px_-34px_rgba(0,0,0,0.55)]`}
      dir={dir}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-semibold">{copy.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.name} />
        <Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder={copy.contact} />
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={copy.message}
          rows={compact ? 3 : 4}
        />
        <Button type="button" variant="gold" onClick={() => void handleSubmit()} disabled={submitting}>
          <Send className="h-4 w-4" />
          {submitting ? copy.sending : copy.submit}
        </Button>
      </div>

      {status ? (
        <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm leading-6 text-emerald-200">
          {status}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <a className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-primary" href={`tel:${publicContactInfo.phoneTel}`}>
          <Phone className="h-4 w-4" />
          {publicContactInfo.phone}
        </a>
        <a className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-primary" href={`mailto:${publicContactInfo.email}`}>
          <Mail className="h-4 w-4" />
          {publicContactInfo.email}
        </a>
        <a className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-primary" href={getWhatsAppUrl("Hello LOUREX, I need support.")} target="_blank" rel="noreferrer">
          <MessageSquareText className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{getSupportFallbackCopy(lang)}</p>
    </section>
  );
};
