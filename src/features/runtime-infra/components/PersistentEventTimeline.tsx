import { DatabaseZap } from "lucide-react";
import type { EventTimelineItem } from "@/features/event-system/types/eventTypes";
import type { RuntimeLanguage } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: { title: "Persistent event timeline", empty: "No persisted operational events yet." },
  ar: { title: "السجل الدائم للأحداث", empty: "لا توجد أحداث تشغيلية محفوظة حتى الآن." },
} as const;

export function PersistentEventTimeline({
  timeline,
  language,
  locale,
}: {
  timeline: EventTimelineItem[];
  language: RuntimeLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <DatabaseZap className="h-5 w-5 text-violet-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {timeline.slice(0, 7).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                <p className="mt-2 text-xs text-slate-500">{item.entityLabel}</p>
              </div>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                {new Date(item.occurredAt).toLocaleString(locale)}
              </span>
            </div>
          </div>
        ))}
        {timeline.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
