import { Radio } from "lucide-react";
import type { OperationalStream, TransportLanguage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: { title: "Operational streams", empty: "No live stream messages yet." },
  ar: { title: "التدفقات التشغيلية", empty: "لا توجد رسائل تدفق مباشرة بعد." },
} as const;

export function OperationalStreamsPanel({
  streams,
  language,
  locale,
}: {
  streams: OperationalStream[];
  language: TransportLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {streams.map((stream) => (
          <div key={stream.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{stream.label}</p>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{stream.severity}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{stream.messages.length.toLocaleString(locale)}</p>
            <p className="mt-1 text-xs text-slate-500">{stream.channel}</p>
          </div>
        ))}
      </div>
      {streams.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
      ) : null}
    </div>
  );
}
