import { RefreshCcwDot } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { CollaborationLanguage, SynchronizationResult } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: {
    title: "Synchronization health",
    signals: "Signals",
    applied: "Applied patches",
    skipped: "Skipped replays",
    conflicts: "Conflicts resolved",
    helpTitle: "What does synchronization health mean?",
    helpBody: "This shows whether live workflow updates were applied safely and whether replay-safe updates were skipped correctly.",
    helpExample: "If conflicts were resolved, review the related workflow before making another manual update.",
  },
  ar: {
    title: "صحة المزامنة",
    signals: "الإشارات",
    applied: "التحديثات المطبقة",
    skipped: "الإعادات المتجاوزة",
    conflicts: "التعارضات المعالجة",
    helpTitle: "ماذا تعني صحة المزامنة؟",
    helpBody: "هذا القسم يوضح هل تم تطبيق تحديثات سير العمل المباشرة بأمان وهل تم تجاوز الإعادات المتكررة بشكل صحيح.",
    helpExample: "إذا تمت معالجة تعارضات، راجع سير العمل المرتبط قبل تنفيذ تعديل يدوي جديد.",
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
    { label: t.signals, value: result.signals.length.toLocaleString(locale) },
    { label: t.applied, value: result.appliedPatches.length.toLocaleString(locale) },
    { label: t.skipped, value: result.skippedReplayKeys.length.toLocaleString(locale) },
    { label: t.conflicts, value: result.conflictsResolved.toLocaleString(locale) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <RefreshCcwDot className="h-5 w-5 text-cyan-200" />
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
