import { RadioTower } from "lucide-react";
import { ArabicSafeText, ResponsiveInfoGrid, SectionHelpBox, ValueDisplay } from "@/components/readable/ReadableCards";
import type { EventLanguage, RealtimeSignal } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    title: "Realtime operations signals",
    empty: "No active realtime operational signals.",
    helpTitle: "What do realtime signals mean?",
    helpBody: "Signals show live operational events that may need review, such as shipment delay or elevated alert volume.",
    helpExample: "If a high-severity signal appears, review its count and category before taking action.",
  },
  ar: {
    title: "إشارات العمليات المباشرة",
    empty: "لا توجد إشارات تشغيلية نشطة حاليا.",
    helpTitle: "ماذا تعني إشارات العمليات؟",
    helpBody: "الإشارات تعرض الأحداث الجارية التي قد تحتاج متابعة، مثل تأخر شحنة أو ارتفاع تنبيه.",
    helpExample: "إذا ظهر تنبيه عالي الشدة، راجع العدد والتصنيف ثم افتح سجل الحدث قبل اتخاذ إجراء.",
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
      <SectionHelpBox className="mt-4" title={t.helpTitle} body={t.helpBody} example={t.helpExample} />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {signals.map((signal) => (
          <div key={signal.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <ArabicSafeText className="text-xs text-slate-400">{signal.label}</ArabicSafeText>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">{signal.severity}</span>
            </div>
            <ValueDisplay className="mt-3 text-2xl font-bold text-white">{signal.count.toLocaleString(locale)}</ValueDisplay>
          </div>
        ))}
      </ResponsiveInfoGrid>
      {signals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
      ) : null}
    </div>
  );
}
