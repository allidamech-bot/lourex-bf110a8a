import { Database } from "lucide-react";
import type { DistributedLanguage, DistributedSnapshot } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: { title: "Distributed state explorer", empty: "No replicated workflow state." },
  ar: { title: "مستكشف الحالة الموزعة", empty: "لا توجد حالة سير عمل منسوخة." },
} as const;

export function DistributedStateExplorer({ snapshot, language }: { snapshot: DistributedSnapshot; language: DistributedLanguage }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Database className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.workflows.slice(0, 8).map((workflow) => (
          <div key={workflow.entityKey} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{workflow.label}</p>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-100">{workflow.severity}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{workflow.status} · v{workflow.version}</p>
          </div>
        ))}
      </div>
      {snapshot.workflows.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p> : null}
    </div>
  );
}
