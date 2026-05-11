import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { ApprovalWorkflowBoard } from "@/features/execution-runtime/components/ApprovalWorkflowBoard";
import { ExecutionAuditTimeline } from "@/features/execution-runtime/components/ExecutionAuditTimeline";
import { ExecutionQueuePanel } from "@/features/execution-runtime/components/ExecutionQueuePanel";
import { OperationalAgentsMonitor } from "@/features/execution-runtime/components/OperationalAgentsMonitor";
import { buildExecutionRuntime } from "@/features/execution-runtime/services/executionRuntimeService";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { ExecutionLanguage, ExecutionRuntimeResult } from "@/features/execution-runtime/types/executionTypes";

const labels = {
  en: {
    eyebrow: "Autonomous Execution",
    title: "Guarded operational execution runtime",
    description: "Approval-aware execution queues, deterministic operational agents, guarded mutation preparation, and immutable audit recovery.",
    loading: "Preparing guarded execution runtime...",
  },
  ar: {
    eyebrow: "التنفيذ الذاتي",
    title: "تشغيل التنفيذ التشغيلي المحكوم",
    description: "قوائم تنفيذ مرتبطة بالموافقة، ووكلاء تشغيليون حتميون، وتحضير محكوم للتغييرات، واسترداد تدقيق غير قابل للتغيير.",
    loading: "جار تجهيز تشغيل التنفيذ المحكوم...",
  },
} as const;

export function AutonomousExecutionCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: ExecutionLanguage;
  locale: string;
}) {
  const t = labels[language];
  const [result, setResult] = useState<ExecutionRuntimeResult | null>(null);

  useEffect(() => {
    let active = true;
    void buildExecutionRuntime({ dataset }).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <PageHelpBox pageKey="ai_operations" />
      <div className="rounded-2xl border border-indigo-400/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-100">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-200">{t.eyebrow}</p>
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
          <OperationalAgentsMonitor agents={result.agents} language={language} />
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <ExecutionQueuePanel queue={result.queue} language={language} />
            <ApprovalWorkflowBoard approvals={result.approvals} language={language} />
          </div>
          <ExecutionAuditTimeline audit={result.audit} language={language} locale={locale} />
        </>
      )}
    </section>
  );
}

export default AutonomousExecutionCenter;

