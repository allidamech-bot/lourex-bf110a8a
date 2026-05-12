import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CollaborativeEscalationBoard } from "@/features/realtime-collaboration/components/CollaborativeEscalationBoard";
import { OperationalPresencePanel } from "@/features/realtime-collaboration/components/OperationalPresencePanel";
import { SharedWorkflowStatePanel } from "@/features/realtime-collaboration/components/SharedWorkflowStatePanel";
import { SynchronizationHealthPanel } from "@/features/realtime-collaboration/components/SynchronizationHealthPanel";
import { createLocalCollaborationSnapshot } from "@/features/realtime-collaboration/services/collaborationService";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { CollaborationLanguage, SynchronizationResult } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: {
    eyebrow: "Realtime Collaboration",
    title: "Shared operational state",
    description: "Lightweight multi-user awareness, deterministic state synchronization, and escalation coordination without websocket coupling.",
    loading: "Hydrating collaborative runtime...",
  },
  ar: {
    eyebrow: "التعاون المباشر",
    title: "الحالة التشغيلية المشتركة",
    description: "وعي تشغيلي متعدد المستخدمين ومزامنة حتمية للحالة وتنسيق للتصعيد دون الاعتماد على بنية WebSocket حاليا.",
    loading: "جار تهيئة تشغيل التعاون...",
  },
} as const;

export function RealtimeOperationsCenter({
  dataset,
  language,
  locale,
}: {
  dataset: EventSystemDataset;
  language: CollaborationLanguage;
  locale: string;
}) {
  const t = labels[language];
  const [result, setResult] = useState<SynchronizationResult | null>(null);

  useEffect(() => {
    let active = true;
    void createLocalCollaborationSnapshot(dataset).then((snapshot) => {
      if (active) setResult(snapshot);
    });
    return () => {
      active = false;
    };
  }, [dataset]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-teal-400/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.16),rgba(15,23,42,0.94))] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-500/10 text-teal-100">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`whitespace-normal text-[11px] font-semibold text-teal-200 ${language === "ar" ? "tracking-normal" : ""}`}>{t.eyebrow}</p>
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
          <SynchronizationHealthPanel result={result} language={language} locale={locale} />
          <OperationalPresencePanel presence={result.snapshot.presence} language={language} locale={locale} />
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <SharedWorkflowStatePanel workflows={result.snapshot.workflows} language={language} />
            <CollaborativeEscalationBoard workflows={result.snapshot.workflows} language={language} />
          </div>
        </>
      )}
    </section>
  );
}

export default RealtimeOperationsCenter;
