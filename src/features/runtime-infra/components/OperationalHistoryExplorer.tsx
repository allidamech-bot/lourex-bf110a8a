import { Search } from "lucide-react";
import type { PersistentEventRecord, RuntimeLanguage } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: { title: "Operational history explorer", empty: "No event history available." },
  ar: { title: "مستكشف السجل التشغيلي", empty: "لا يوجد سجل أحداث متاح." },
} as const;

export function OperationalHistoryExplorer({
  records,
  language,
}: {
  records: PersistentEventRecord[];
  language: RuntimeLanguage;
}) {
  const t = labels[language];
  const safeRecords = Array.isArray(records) ? records : [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {safeRecords.slice(0, 8).map((record) => (
          <div key={record.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{record.event.title}</p>
              <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs text-slate-200">{record.event.severity}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{record.event.entity.label}</p>
            <p className="mt-2 break-words text-[11px] text-slate-500 [overflow-wrap:anywhere]">{record.replayKey}</p>
          </div>
        ))}
      </div>
      {safeRecords.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
      ) : null}
    </div>
  );
}
