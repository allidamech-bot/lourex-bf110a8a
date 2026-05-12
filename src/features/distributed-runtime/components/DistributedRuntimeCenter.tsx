import { useEffect, useState } from "react";
import { CloudCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createDistributedRuntimeSnapshot } from "@/features/distributed-runtime/services/distributedRuntimeService";
import { DistributedStateExplorer } from "@/features/distributed-runtime/components/DistributedStateExplorer";
import { ReplicatedOperationalTimeline } from "@/features/distributed-runtime/components/ReplicatedOperationalTimeline";
import { ReplicationHealthPanel } from "@/features/distributed-runtime/components/ReplicationHealthPanel";
import { RuntimeConsistencyMonitor } from "@/features/distributed-runtime/components/RuntimeConsistencyMonitor";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { DistributedLanguage, DistributedRuntimeResult } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: {
    eyebrow: "Distributed Runtime",
    title: "Persistent operational cloud runtime",
    description: "Replicated event history, shared workflow state, consistency checks, and distributed recovery foundations.",
    loading: "Hydrating distributed runtime...",
  },
  ar: {
    eyebrow: "التشغيل الموزع",
    title: "تشغيل سحابي تشغيلي دائم",
    description: "سجل أحداث منسوخ، وحالة سير عمل مشتركة، وفحوص اتساق، وأساسات استرداد موزعة.",
    loading: "جار تهيئة التشغيل الموزع...",
  },
} as const;

export function DistributedRuntimeCenter({ dataset, language, locale }: { dataset: EventSystemDataset; language: DistributedLanguage; locale: string }) {
  const t = labels[language];
  const [result, setResult] = useState<DistributedRuntimeResult | null>(null);

  useEffect(() => {
    let active = true;
    void createDistributedRuntimeSnapshot({ dataset }).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-fuchsia-400/20 bg-[linear-gradient(135deg,rgba(217,70,239,0.14),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100">
            <CloudCog className="h-5 w-5" />
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
          <ReplicationHealthPanel replication={result.replication} language={language} locale={locale} />
          <RuntimeConsistencyMonitor consistency={result.consistency} language={language} locale={locale} />
          <DistributedStateExplorer snapshot={result.snapshot} language={language} />
          <ReplicatedOperationalTimeline snapshot={result.snapshot} language={language} locale={locale} />
        </>
      )}
    </section>
  );
}

export default DistributedRuntimeCenter;
