import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CognitivePlanningPanel } from "@/features/cognitive-ops/components/CognitivePlanningPanel";
import { ExecutiveInsightsBoard } from "@/features/cognitive-ops/components/ExecutiveInsightsBoard";
import { OperationalCopilotPanel } from "@/features/cognitive-ops/components/OperationalCopilotPanel";
import { OperationalMemoryTimeline } from "@/features/cognitive-ops/components/OperationalMemoryTimeline";
import { buildCognitiveOperationsLayer } from "@/features/cognitive-ops/services/cognitiveOperationsService";
import type { CognitiveLanguage, CognitiveOperationsResult } from "@/features/cognitive-ops/types/cognitiveTypes";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    eyebrow: "Cognitive Operations",
    title: "AI copilot and cognitive operations layer",
    description: "Deterministic operational memory, contextual reasoning, approval-aware planning, and role-specific copilot recommendations.",
    loading: "Preparing cognitive operations snapshot...",
  },
  ar: {
    eyebrow: "ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„ظ…ط¹ط±ظپظٹط©",
    title: "ط·ط¨ظ‚ط© ظ…ط³ط§ط¹ط¯ظٹ ط§ظ„ط°ظƒط§ط، ط§ظ„طھط´ط؛ظٹظ„ظٹ",
    description: "ط°ط§ظƒط±ط© طھط´ط؛ظٹظ„ظٹط© ط­طھظ…ظٹط©طŒ ط§ط³طھط¯ظ„ط§ظ„ ط³ظٹط§ظ‚ظٹطŒ طھط®ط·ظٹط· ظ…ط±طھط¨ط· ط¨ط§ظ„ظ…ظˆط§ظپظ‚ط©طŒ ظˆطھظˆطµظٹط§طھ ظ…ط³ط§ط¹ط¯ظٹظ† ط­ط³ط¨ ط§ظ„ط¯ظˆط±.",
    loading: "ط¬ط§ط±ظٹ طھط­ط¶ظٹط± ظ„ظ‚ط·ط© ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„ظ…ط¹ط±ظپظٹط©...",
  },
} as const;

export function CognitiveOperationsCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: CognitiveLanguage;
  locale: string;
}) {
  const t = labels[language];
  const [result, setResult] = useState<CognitiveOperationsResult | null>(null);

  useEffect(() => {
    let active = true;
    void buildCognitiveOperationsLayer({ dataset }).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-teal-400/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.14),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-500/10 text-teal-100">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200">{t.eyebrow}</p>
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
          <ExecutiveInsightsBoard insights={result.insights} language={language} />
          <OperationalCopilotPanel copilots={result.copilots} language={language} />
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <OperationalMemoryTimeline memory={result.memory} language={language} locale={locale} />
            <CognitivePlanningPanel plans={result.plans} language={language} />
          </div>
        </>
      )}
    </section>
  );
}

export default CognitiveOperationsCenter;
