import { useEffect, useState } from "react";
import { SatelliteDish } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveEscalationFeed } from "@/features/realtime-transport/components/LiveEscalationFeed";
import { OperationalStreamsPanel } from "@/features/realtime-transport/components/OperationalStreamsPanel";
import { RealtimePresenceBoard } from "@/features/realtime-transport/components/RealtimePresenceBoard";
import { TransportHealthMonitor } from "@/features/realtime-transport/components/TransportHealthMonitor";
import { buildRealtimeTransportRuntime } from "@/features/realtime-transport/services/realtimeTransportService";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { RealtimeTransportRuntime, TransportLanguage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: {
    eyebrow: "Realtime Transport",
    title: "Live operational transport",
    description: "Adapter-driven realtime channels for presence, workflow synchronization, escalation propagation, and recovery-safe operational streams.",
    loading: "Connecting realtime transport...",
  },
  ar: {
    eyebrow: "النقل المباشر",
    title: "النقل التشغيلي المباشر",
    description: "قنوات مباشرة قابلة لتبديل المزود للحضور والمزامنة وتصعيد العمليات وتدفقات الاسترداد الآمنة.",
    loading: "جار الاتصال بطبقة النقل المباشر...",
  },
} as const;

export function LiveOperationsCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: TransportLanguage;
  locale: string;
}) {
  const t = labels[language];
  const [runtime, setRuntime] = useState<RealtimeTransportRuntime | null>(null);

  useEffect(() => {
    let active = true;
    void buildRealtimeTransportRuntime({ dataset }).then((result) => {
      if (active) setRuntime(result);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-100">
            <SatelliteDish className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`whitespace-normal text-[11px] font-semibold text-sky-200 ${language === "ar" ? "tracking-normal" : ""}`}>{t.eyebrow}</p>
            <h2 className="mt-1 break-words font-serif text-2xl font-semibold text-white">{t.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{t.description}</p>
          </div>
        </div>
      </div>

      {!runtime ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">{t.loading}</p>
          <Skeleton className="mt-4 h-24 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ) : (
        <>
          <TransportHealthMonitor health={runtime.health} language={language} locale={locale} />
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <RealtimePresenceBoard health={runtime.health} language={language} />
            <LiveEscalationFeed messages={runtime.messages} language={language} />
          </div>
          <OperationalStreamsPanel streams={runtime.streams} language={language} locale={locale} />
        </>
      )}
    </section>
  );
}

export default LiveOperationsCenter;
