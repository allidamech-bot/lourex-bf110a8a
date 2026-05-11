import { Workflow } from "lucide-react";
import { useMemo } from "react";
import { AutomationPolicyOverview } from "@/features/workflow-intelligence/components/AutomationPolicyOverview";
import { DecisionQueuePanel } from "@/features/workflow-intelligence/components/DecisionQueuePanel";
import { EscalationMonitor } from "@/features/workflow-intelligence/components/EscalationMonitor";
import { WorkflowHealthPanel } from "@/features/workflow-intelligence/components/WorkflowHealthPanel";
import { buildWorkflowIntelligence } from "@/features/workflow-intelligence/orchestrators/workflowOrchestrator";
import type { WorkflowIntelligenceDataset, WorkflowLanguage } from "@/features/workflow-intelligence/types/workflowTypes";

const labels = {
  en: {
    eyebrow: "Workflow Intelligence",
    title: "Autonomous workflow command layer",
    description: "Deterministic, review-only orchestration for triggers, escalation routing, recovery queues, and automation policy visibility.",
  },
  ar: {
    eyebrow: "ذكاء سير العمل",
    title: "طبقة قيادة سير العمل الذاتية",
    description: "تنسيق حتمي وإرشادي للتنبيهات ومسارات التصعيد وقوائم الاسترداد وشفافية سياسات الأتمتة.",
  },
} as const;

export function WorkflowIntelligenceCenter({
  dataset,
  language,
  locale,
}: {
  dataset: WorkflowIntelligenceDataset;
  language: WorkflowLanguage;
  locale: string;
}) {
  const t = labels[language];
  const result = useMemo(() => buildWorkflowIntelligence(dataset), [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,145,178,0.16),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-100">
            <Workflow className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] text-cyan-200 ${language === "ar" ? "tracking-normal" : "uppercase tracking-[0.2em]"}`}>{t.eyebrow}</p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">{t.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{t.description}</p>
          </div>
        </div>
      </div>

      <WorkflowHealthPanel health={result.health} language={language} locale={locale} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DecisionQueuePanel decisions={result.decisions} language={language} locale={locale} />
        <EscalationMonitor escalations={result.escalations} triggers={result.triggers} language={language} />
      </div>
      <AutomationPolicyOverview policies={result.policies} language={language} locale={locale} />
    </section>
  );
}

export default WorkflowIntelligenceCenter;
