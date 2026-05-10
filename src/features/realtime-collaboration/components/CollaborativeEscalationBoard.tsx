import { ShieldAlert } from "lucide-react";
import type { CollaborationLanguage, SharedWorkflowState } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: { title: "Collaborative escalation board", empty: "No high-priority escalation workflows need coordination." },
  ar: { title: "لوحة التصعيد التعاونية", empty: "لا توجد مسارات تصعيد عالية الأولوية تحتاج تنسيقا." },
} as const;

export function CollaborativeEscalationBoard({
  workflows,
  language,
}: {
  workflows: SharedWorkflowState[];
  language: CollaborationLanguage;
}) {
  const t = labels[language];
  const escalations = workflows.filter((workflow) => workflow.severity === "critical" || workflow.severity === "high");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {escalations.slice(0, 6).map((workflow) => (
          <div key={workflow.entityKey} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{workflow.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{workflow.owner ? workflow.owner.ownerName : "Unassigned"}</p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-100">{workflow.severity}</span>
            </div>
          </div>
        ))}
        {escalations.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
