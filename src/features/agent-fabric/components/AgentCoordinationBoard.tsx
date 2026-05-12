import { Share2 } from "lucide-react";
import type { AgentFabricLanguage, CoordinationSnapshot } from "@/features/agent-fabric/types/agentFabricTypes";

export function AgentCoordinationBoard({
  snapshot,
  language,
}: {
  snapshot: CoordinationSnapshot;
  language: AgentFabricLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-400/10 text-indigo-100">
          <Share2 className="h-4 w-4" />
        </div>
        <div>
          <p className="whitespace-normal text-[11px] font-semibold text-indigo-200">
            {language === "ar" ? "نسيج التنسيق" : "Coordination Fabric"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "إشارات وسجلات التنسيق" : "Signals and coordination records"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {snapshot.signals.slice(0, 6).map((signal) => (
          <div key={signal.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{signal.capability}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">{signal.severity}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{signal.explanation}</p>
            <p className="mt-2 text-[11px] text-indigo-200">{signal.approvalGate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
