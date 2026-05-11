import { GitBranch } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { DistributedLanguage, ReplicationResult } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: {
    title: "Replication health",
    records: "Records",
    replays: "Replay keys",
    conflicts: "Conflicts",
    version: "Version",
    helpTitle: "How do I read replication health?",
    helpBody: "Replication health shows whether operational records were copied safely and whether replay keys stayed consistent.",
    helpExample: "If conflicts increase, pause manual action and review which record did not replicate cleanly.",
  },
  ar: {
    title: "صحة النسخ المتطابق",
    records: "السجلات",
    replays: "مفاتيح الإعادة",
    conflicts: "التعارضات",
    version: "الإصدار",
    helpTitle: "كيف أقرأ صحة النسخ؟",
    helpBody: "صحة النسخ توضح هل تم نقل السجلات التشغيلية بأمان وهل بقيت مفاتيح الإعادة متسقة.",
    helpExample: "إذا زادت التعارضات، أوقف القرار اليدوي مؤقتا وراجع السجل الذي لم ينسخ بشكل صحيح.",
  },
} as const;

export function ReplicationHealthPanel({ replication, language, locale }: { replication: ReplicationResult; language: DistributedLanguage; locale: string }) {
  const t = labels[language];
  const cards = [
    { label: t.records, value: replication.records.length.toLocaleString(locale) },
    { label: t.replays, value: replication.replicatedReplayKeys.length.toLocaleString(locale) },
    { label: t.conflicts, value: replication.conflicts.length.toLocaleString(locale) },
    { label: t.version, value: replication.snapshot.version.toLocaleString(locale) },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <GitBranch className="h-5 w-5 text-fuchsia-200" />
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
