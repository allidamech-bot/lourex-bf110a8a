import { Network } from "lucide-react";
import type { AgentFabricLanguage, FabricAgent } from "@/features/agent-fabric/types/agentFabricTypes";

export function OperationalAgentsGrid({
  agents,
  language,
}: {
  agents: FabricAgent[];
  language: AgentFabricLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">
            {language === "ar" ? "وكلاء تشغيليون" : "Operational Agents"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "سجل الوكلاء المتخصصين" : "Specialized agent registry"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-sm font-semibold text-slate-100">{agent.label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{agent.type}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.capabilities.slice(0, 3).map((capability) => (
                <span key={capability} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300">
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
