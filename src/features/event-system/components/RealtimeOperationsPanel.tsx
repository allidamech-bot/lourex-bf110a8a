import { RadioTower } from "lucide-react";
import type { EventLanguage, RealtimeSignal } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    title: "Realtime operations signals",
    empty: "No active realtime operational signals.",
  },
  ar: {
    title: "إشارات العمليات المباشرة",
    empty: "لا توجد إشارات تشغيلية نشطة حاليا.",
  },
} as const;

export function RealtimeOperationsPanel({
  signals,
  language,
  locale,
}: {
  signals: RealtimeSignal[];
  language: EventLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <RadioTower className="h-5 w-5 text-emerald-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {signals.map((signal) => (
          <div key={signal.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs leading-5 text-slate-400">{signal.label}</p>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">{signal.severity}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{signal.count.toLocaleString(locale)}</p>
          </div>
        ))}
      </div>
      {signals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
      ) : null}
    </div>
  );
}
