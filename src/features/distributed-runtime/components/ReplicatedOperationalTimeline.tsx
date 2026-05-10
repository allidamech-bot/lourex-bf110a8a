import { History } from "lucide-react";
import type { DistributedLanguage, DistributedSnapshot } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: { title: "Replicated operational timeline", empty: "No replicated timeline events." },
  ar: { title: "السجل التشغيلي المنسوخ", empty: "لا توجد أحداث منسوخة في السجل." },
} as const;

export function ReplicatedOperationalTimeline({ snapshot, language, locale }: { snapshot: DistributedSnapshot; language: DistributedLanguage; locale: string }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {snapshot.timeline.slice(0, 7).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{item.title}</p>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{new Date(item.occurredAt).toLocaleString(locale)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
      {snapshot.timeline.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p> : null}
    </div>
  );
}
