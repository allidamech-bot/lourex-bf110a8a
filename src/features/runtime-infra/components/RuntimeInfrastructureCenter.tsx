import { useEffect, useMemo, useState } from "react";
import { ServerCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryStatusMonitor } from "@/features/runtime-infra/components/DeliveryStatusMonitor";
import { NotificationDeliveryCenter } from "@/features/runtime-infra/components/NotificationDeliveryCenter";
import { OperationalHistoryExplorer } from "@/features/runtime-infra/components/OperationalHistoryExplorer";
import { PersistentEventTimeline } from "@/features/runtime-infra/components/PersistentEventTimeline";
import { RuntimeRecoveryPanel } from "@/features/runtime-infra/components/RuntimeRecoveryPanel";
import { bootstrapRuntimeInfrastructure, createRuntimeRepository } from "@/features/runtime-infra/services/runtimeInfrastructureService";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { RuntimeBootstrapResult, RuntimeLanguage } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: {
    eyebrow: "Runtime Infrastructure",
    title: "Persistent event store and delivery runtime",
    description: "Durable operational history, replay-safe recovery, notification delivery queues, and status tracking.",
    loading: "Restoring runtime state...",
  },
  ar: {
    eyebrow: "بنية التشغيل",
    title: "مخزن الأحداث الدائم وتشغيل التسليم",
    description: "سجل تشغيلي دائم واسترداد آمن للإعادة وقوائم تسليم الإشعارات وتتبع الحالة.",
    loading: "جاري استرداد حالة التشغيل...",
  },
} as const;

export function RuntimeInfrastructureCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: RuntimeLanguage;
  locale: string;
}) {
  const t = labels[language];
  const repository = useMemo(() => createRuntimeRepository(), []);
  const [result, setResult] = useState<RuntimeBootstrapResult | null>(null);

  useEffect(() => {
    let active = true;
    void bootstrapRuntimeInfrastructure(dataset, repository).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset, repository]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-100">
            <ServerCog className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] text-violet-200 ${language === "ar" ? "tracking-normal" : "uppercase tracking-[0.2em]"}`}>{t.eyebrow}</p>
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
          <RuntimeRecoveryPanel recovery={result.recovery} language={language} locale={locale} />
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <NotificationDeliveryCenter queue={result.deliveryQueue} language={language} />
            <DeliveryStatusMonitor events={result.deliveryEvents} language={language} locale={locale} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <PersistentEventTimeline records={result.persistedEvents} language={language} locale={locale} />
            <OperationalHistoryExplorer records={result.persistedEvents} language={language} />
          </div>
        </>
      )}
    </section>
  );
}

export default RuntimeInfrastructureCenter;
