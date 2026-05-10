import { RefreshCcwDot } from "lucide-react";
import type { CollaborationLanguage, SynchronizationResult } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: {
    title: "Synchronization health",
    signals: "Signals",
    applied: "Applied patches",
    skipped: "Skipped replays",
    conflicts: "Conflicts resolved",
  },
  ar: {
    title: "صحة المزامنة",
    signals: "الإشارات",
    applied: "التحديثات المطبقة",
    skipped: "الإعادات المتجاوزة",
    conflicts: "التعارضات المعالجة",
  },
} as const;

export function SynchronizationHealthPanel({
  result,
  language,
  locale,
}: {
  result: SynchronizationResult;
  language: CollaborationLanguage;
  locale: string;
}) {
  const t = labels[language];
  const cards = [
    { label: t.signals, value: result.signals.length },
    { label: t.applied, value: result.appliedPatches.length },
    { label: t.skipped, value: result.skippedReplayKeys.length },
    { label: t.conflicts, value: result.conflictsResolved },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <RefreshCcwDot className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-2 text-lg font-bold text-white">{card.value.toLocaleString(locale)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
