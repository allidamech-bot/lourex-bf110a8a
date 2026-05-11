import { GitBranch } from "lucide-react";
import type { AgentFabricLanguage, DelegationProposal, DistributedCoordinationPlan } from "@/features/agent-fabric/types/agentFabricTypes";

export function DelegationFlowPanel({
  delegations,
  plans,
  language,
}: {
  delegations: DelegationProposal[];
  plans: DistributedCoordinationPlan[];
  language: AgentFabricLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
          <GitBranch className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">
            {language === "ar" ? "طھظپظˆظٹط¶ ظˆطھط®ط·ظٹط·" : "Delegation Flow"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "ظ…ط³ط§ط±ط§طھ طھظپظˆظٹط¶ ظ…ط­ظƒظˆظ…ط©" : "Guarded delegation and planning"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {delegations.slice(0, 5).map((delegation) => (
          <div key={delegation.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{delegation.capability}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">{delegation.status}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{delegation.reason}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {plans.slice(0, 3).map((plan) => (
          <div key={plan.id} className="rounded-xl border border-emerald-300/15 bg-emerald-400/5 p-3">
            <p className="text-xs font-semibold text-emerald-100">{plan.objective}</p>
            <p className="mt-1 text-[11px] text-slate-400">{plan.steps.length} step(s) / {plan.approvalGate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
