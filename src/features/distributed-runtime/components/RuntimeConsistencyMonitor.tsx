import { ShieldCheck } from "lucide-react";
import type { DistributedLanguage, RuntimeConsistencyReport } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: { title: "Runtime consistency", score: "Health score", stale: "Stale", isolated: "Isolated", conflicts: "Conflicts" },
  ar: { title: "اتساق التشغيل", score: "درجة الصحة", stale: "خامدة", isolated: "معزولة", conflicts: "تعارضات" },
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
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
