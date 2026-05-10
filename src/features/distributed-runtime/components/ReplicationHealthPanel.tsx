import { GitBranch } from "lucide-react";
import type { DistributedLanguage, ReplicationResult } from "@/features/distributed-runtime/types/distributedTypes";

const labels = {
  en: { title: "Replication health", records: "Records", replays: "Replay keys", conflicts: "Conflicts", version: "Version" },
  ar: { title: "صحة النسخ المتماثل", records: "السجلات", replays: "مفاتيح الإعادة", conflicts: "التعارضات", version: "الإصدار" },
} as const;

export function ReplicationHealthPanel({ replication, language, locale }: { replication: ReplicationResult; language: DistributedLanguage; locale: string }) {
  const t = labels[language];
  const cards = [
    { label: t.records, value: replication.records.length },
    { label: t.replays, value: replication.replicatedReplayKeys.length },
    { label: t.conflicts, value: replication.conflicts.length },
    { label: t.version, value: replication.snapshot.version },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <GitBranch className="h-5 w-5 text-fuchsia-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-2 text-lg font-bold text-white">{card.value.toLocaleString(locale)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
