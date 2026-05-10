import { ListChecks } from "lucide-react";
import type { DecisionQueueItem, WorkflowLanguage } from "@/features/workflow-intelligence/types/workflowTypes";

const labels = {
  en: {
    title: "Decision queue",
    empty: "No pending operational recommendations.",
    priority: "Priority",
    advisory: "Review only",
  },
  ar: {
    title: "قائمة القرارات",
    empty: "لا توجد توصيات تشغيلية معلقة.",
    priority: "الأولوية",
    advisory: "للمراجعة فقط",
  },
} as const;

export function DecisionQueuePanel({
  decisions,
  language,
  locale,
}: {
  decisions: DecisionQueueItem[];
  language: WorkflowLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <ListChecks className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {decisions.slice(0, 6).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
                <p className="mt-2 text-xs text-slate-500">{item.entityLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
                  {t.priority}: {item.priority.toLocaleString(locale)}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">{t.advisory}</span>
              </div>
            </div>
          </div>
        ))}
        {decisions.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
