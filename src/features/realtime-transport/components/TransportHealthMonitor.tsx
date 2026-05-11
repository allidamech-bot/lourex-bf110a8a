import { ActivitySquare } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { TransportHealth, TransportLanguage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: {
    title: "Transport health",
    provider: "Provider",
    status: "Status",
    channels: "Channels",
    stale: "Stale sessions",
    queued: "Messages",
    helpTitle: "How do I read transport health?",
    helpBody: "Transport health explains whether live channels are connected and whether messages are waiting or sessions became stale.",
    helpExample: "If queued messages rise, review connection status before assuming the operation is complete.",
  },
  ar: {
    title: "صحة النقل المباشر",
    provider: "المزود",
    status: "الحالة",
    channels: "القنوات",
    stale: "جلسات خامدة",
    queued: "الرسائل",
    helpTitle: "كيف أقرأ صحة النقل المباشر؟",
    helpBody: "صحة النقل توضح هل القنوات المباشرة متصلة وهل توجد رسائل معلقة أو جلسات خامدة.",
    helpExample: "إذا زادت الرسائل المعلقة، راجع حالة الاتصال قبل اعتبار العملية مكتملة.",
  },
} as const;

export function TransportHealthMonitor({
  health,
  language,
  locale,
}: {
  health: TransportHealth;
  language: TransportLanguage;
  locale: string;
}) {
  const t = labels[language];
  const cards = [
    { label: t.provider, value: health.provider },
    { label: t.status, value: health.status },
    { label: t.channels, value: health.connectedChannels.length.toLocaleString(locale) },
    { label: t.stale, value: health.staleSessions.toLocaleString(locale) },
    { label: t.queued, value: health.queuedMessages.toLocaleString(locale) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <ActivitySquare className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <SectionHelpBox className="mt-4" title={t.helpTitle} body={t.helpBody} example={t.helpExample} />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {cards.map((card) => (
          <ReadableMetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </ResponsiveInfoGrid>
    </div>
  );
}
