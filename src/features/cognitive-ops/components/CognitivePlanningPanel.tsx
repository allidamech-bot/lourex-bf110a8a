import { ListChecks } from "lucide-react";
import type { CognitiveLanguage, CognitivePlan } from "@/features/cognitive-ops/types/cognitiveTypes";

export function CognitivePlanningPanel({
  plans,
  language,
}: {
  plans: CognitivePlan[];
  language: CognitiveLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-100">
          <ListChecks className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
            {language === "ar" ? "تخطيط معرفي" : "Cognitive Planning"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "تسلسل إجراءات مرتبط بالموافقة" : "Approval-aware action sequencing"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {plans.slice(0, 5).map((plan) => (
          <div key={plan.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{plan.objective}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
                {plan.approvalGate}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {plan.steps.map((step) => (
                <div key={step.id} className="flex gap-3 text-xs leading-5 text-slate-400">
                  <span className="text-sky-200">{step.sequence}</span>
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
