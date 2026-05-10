import { RotateCcw } from "lucide-react";
import type { RuntimeLanguage, RuntimeRecoveryState } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: {
    title: "Runtime recovery",
    restored: "Restored events",
    replayKeys: "Replay keys",
    latest: "Latest event",
  },
  ar: {
    title: "استرداد التشغيل",
    restored: "الأحداث المستردة",
    replayKeys: "مفاتيح الإعادة",
    latest: "آخر حدث",
  },
} as const;

export function RuntimeRecoveryPanel({
  recovery,
  language,
  locale,
}: {
  recovery: RuntimeRecoveryState;
  language: RuntimeLanguage;
  locale: string;
}) {
  const t = labels[language];
  const cards = [
    { label: t.restored, value: recovery.restoredEvents.length.toLocaleString(locale) },
    { label: t.replayKeys, value: recovery.replayKeys.length.toLocaleString(locale) },
    { label: t.latest, value: recovery.snapshot.latestEventAt ? new Date(recovery.snapshot.latestEventAt).toLocaleDateString(locale) : "-" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <RotateCcw className="h-5 w-5 text-amber-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
