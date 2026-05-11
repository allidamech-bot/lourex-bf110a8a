import { ShieldCheck } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { DistributedLanguage, RuntimeConsistencyReport } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: {
    title: "Runtime consistency",
    score: "Health score",
    stale: "Stale",
    isolated: "Isolated",
    conflicts: "Conflicts",
    helpTitle: "What does runtime consistency mean?",
    helpBody: "This checks whether distributed runtime replicas agree and whether any replica is stale, isolated, or conflicting.",
    helpExample: "If conflicts appear, review the affected replica before approving recovery or replay.",
  },
  ar: {
    title: "اتساق التشغيل",
    score: "درجة الصحة",
    stale: "نسخ خامدة",
    isolated: "نسخ معزولة",
    conflicts: "تعارضات",
    helpTitle: "ماذا يعني اتساق التشغيل؟",
    helpBody: "هذا القسم يوضح هل نسخ التشغيل الموزعة متفقة أم توجد نسخة خامدة أو معزولة أو بها تعارض.",
    helpExample: "عند ظهور تعارضات، راجع النسخة المتأثرة قبل الموافقة على الاسترداد أو إعادة التشغيل.",
  },
} as const;

export function RuntimeConsistencyMonitor({ consistency, language, locale }: { consistency: RuntimeConsistencyReport; language: DistributedLanguage; locale: string }) {
  const t = labels[language];
  const cards = [
    { label: t.score, value: `${consistency.healthScore.toLocaleString(locale)}%` },
    { label: t.stale, value: consistency.staleReplicas.length.toLocaleString(locale) },
    { label: t.isolated, value: consistency.isolatedReplicas.length.toLocaleString(locale) },
    { label: t.conflicts, value: consistency.conflicts.length.toLocaleString(locale) },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-200" />
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
