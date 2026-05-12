import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCoordinationBoard } from "@/features/agent-fabric/components/AgentCoordinationBoard";
import { CoordinationRecoveryMonitor } from "@/features/agent-fabric/components/CoordinationRecoveryMonitor";
import { DelegationFlowPanel } from "@/features/agent-fabric/components/DelegationFlowPanel";
import { OperationalAgentsGrid } from "@/features/agent-fabric/components/OperationalAgentsGrid";
import { buildAgentCoordinationFabric } from "@/features/agent-fabric/services/agentFabricService";
import type { AgentFabricLanguage, AgentFabricResult } from "@/features/agent-fabric/types/agentFabricTypes";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    eyebrow: "Multi-Agent Intelligence",
    title: "Autonomous coordination fabric",
    description: "Specialized deterministic agents coordinate delegation, distributed planning, guarded execution supervision, and replay-safe recovery.",
    loading: "Preparing multi-agent coordination fabric...",
  },
  ar: {
    eyebrow: "ذكاء متعدد الوكلاء",
    title: "نسيج التنسيق الذاتي",
    description: "وكلاء متخصصون وحتميون ينسقون التفويض، والتخطيط الموزع، وإشراف التنفيذ المحكوم، والاسترداد الآمن.",
    loading: "جاري تحضير نسيج التنسيق متعدد الوكلاء...",
  },
} as const;

export function MultiAgentOperationsCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: AgentFabricLanguage;
  locale: string;
}) {
  const t = labels[language];
  const [result, setResult] = useState<AgentFabricResult | null>(null);

  useEffect(() => {
    let active = true;
    void buildAgentCoordinationFabric({ dataset }).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-fuchsia-400/20 bg-[linear-gradient(135deg,rgba(217,70,239,0.13),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`whitespace-normal text-[11px] font-semibold text-fuchsia-200 ${language === "ar" ? "tracking-normal" : ""}`}>{t.eyebrow}</p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">{t.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{t.description}</p>
          </div>
        </div>
      </div>
      {!result ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">{t.loading}</p>
          <Skeleton className="mt-4 h-24 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ) : (
        <>
          <OperationalAgentsGrid agents={result.snapshot.agents} language={language} />
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <AgentCoordinationBoard snapshot={result.snapshot} language={language} />
            <DelegationFlowPanel delegations={result.snapshot.delegations} plans={result.plans} language={language} />
          </div>
          <CoordinationRecoveryMonitor recovery={result.recovery} language={language} locale={locale} />
        </>
      )}
    </section>
  );
}

export default MultiAgentOperationsCenter;
