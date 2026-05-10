import { GitMerge } from "lucide-react";
import type { CollaborationLanguage, SharedWorkflowState } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: { title: "Shared workflow state", empty: "No shared workflow state has been derived." },
  ar: { title: "حالة سير العمل المشتركة", empty: "لم يتم اشتقاق حالة مشتركة لسير العمل بعد." },
} as const;

export function SharedWorkflowStatePanel({
  workflows,
  language,
}: {
  workflows: SharedWorkflowState[];
  language: CollaborationLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <GitMerge className="h-5 w-5 text-blue-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {workflows.slice(0, 7).map((workflow) => (
          <div key={workflow.entityKey} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{workflow.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{workflow.entityType} · {workflow.status}</p>
                {workflow.owner ? <p className="mt-2 text-xs text-slate-500">{workflow.owner.ownerName}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-100">{workflow.severity}</span>
                <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs text-slate-200">v{workflow.version}</span>
              </div>
            </div>
          </div>
        ))}
        {workflows.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
