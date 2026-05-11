import { RefreshCw } from "lucide-react";
import type { AgentFabricLanguage, CoordinationRecoveryState } from "@/features/agent-fabric/types/agentFabricTypes";

export function CoordinationRecoveryMonitor({
  recovery,
  language,
  locale,
}: {
  recovery: CoordinationRecoveryState;
  language: AgentFabricLanguage;
  locale: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">
            {language === "ar" ? "استرداد التنسيق" : "Coordination Recovery"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "استعادة وترطيب الحالة" : "Replay recovery and hydration"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["Restored", recovery.restoredDelegations.length],
          ["Replayed", recovery.replayedDelegations.length],
          ["Stale cleaned", recovery.staleCleaned.length],
          ["Agents", recovery.hydratedAgentIds.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{Number(value).toLocaleString(locale)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{new Date(recovery.recoveredAt).toLocaleString(locale)}</p>
    </div>
  );
}
