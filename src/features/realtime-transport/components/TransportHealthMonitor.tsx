import { ActivitySquare } from "lucide-react";
import type { TransportHealth, TransportLanguage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: {
    title: "Transport health",
    provider: "Provider",
    status: "Status",
    channels: "Channels",
    stale: "Stale sessions",
    queued: "Messages",
  },
  ar: {
    title: "صحة النقل المباشر",
    provider: "المزود",
    status: "الحالة",
    channels: "القنوات",
    stale: "جلسات خاملة",
    queued: "الرسائل",
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
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-2 break-words text-lg font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
