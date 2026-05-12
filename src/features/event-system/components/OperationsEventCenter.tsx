import { useMemo } from "react";
import { Network } from "lucide-react";
import { ActiveEscalationsFeed } from "@/features/event-system/components/ActiveEscalationsFeed";
import { EventTimelinePanel } from "@/features/event-system/components/EventTimelinePanel";
import { NotificationRoutingPanel } from "@/features/event-system/components/NotificationRoutingPanel";
import { RealtimeOperationsPanel } from "@/features/event-system/components/RealtimeOperationsPanel";
import { processEventPipeline } from "@/features/event-system/pipeline/eventPipeline";
import type { EventLanguage, EventSystemDataset } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    eyebrow: "Event System",
    title: "Operational event pipeline",
    description: "Replay-safe operational events, advisory notifications, realtime signals, and deterministic timeline history.",
  },
  ar: {
    eyebrow: "نظام الأحداث",
    title: "مسار الأحداث التشغيلية",
    description: "أحداث تشغيلية آمنة لإعادة التشغيل، وإشعارات إرشادية، وإشارات مباشرة، وسجل زمني حتمي.",
  },
} as const;

export function OperationsEventCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: EventLanguage;
  locale: string;
}) {
  const t = labels[language];
  const result = useMemo(() => processEventPipeline(dataset), [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-100">
            <Network className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`whitespace-normal text-[11px] font-semibold text-emerald-200 ${language === "ar" ? "tracking-normal" : ""}`}>{t.eyebrow}</p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">{t.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{t.description}</p>
          </div>
        </div>
      </div>

      <RealtimeOperationsPanel signals={result.realtimeSignals} language={language} locale={locale} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ActiveEscalationsFeed events={result.processedEvents} language={language} />
        <NotificationRoutingPanel routes={result.notifications} language={language} />
      </div>
      <EventTimelinePanel timeline={result.timeline} language={language} locale={locale} />
    </section>
  );
}

export default OperationsEventCenter;
