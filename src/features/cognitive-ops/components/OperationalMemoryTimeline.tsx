import { History } from "lucide-react";
import type { CognitiveLanguage, OperationalMemoryRecord } from "@/features/cognitive-ops/types/cognitiveTypes";

const formatDate = (value: string, locale: string) => new Date(value).toLocaleString(locale);

export function OperationalMemoryTimeline({
  memory,
  language,
  locale,
}: {
  memory: OperationalMemoryRecord[];
  language: CognitiveLanguage;
  locale: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
          <History className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">
            {language === "ar" ? "ذاكرة تشغيلية" : "Operational Memory"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "خط زمني غير قابل للتغيير" : "Immutable memory timeline"}
          </h3>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {memory.slice(0, 8).map((record) => (
          <div key={record.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">{record.title}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">{record.severity}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-400">{record.summary}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              {record.kind} / {formatDate(record.occurredAt, locale)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
