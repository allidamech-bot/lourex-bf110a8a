import { Siren } from "lucide-react";
import type { TransportLanguage, TransportMessage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: { title: "Live escalation feed", empty: "No live escalation messages." },
  ar: { title: "تدفق التصعيد المباشر", empty: "لا توجد رسائل تصعيد مباشرة." },
} as const;

export function LiveEscalationFeed({
  messages,
  language,
}: {
  messages: TransportMessage[];
  language: TransportLanguage;
}) {
  const t = labels[language];
  const escalations = messages.filter((message) => message.channel === "escalations");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Siren className="h-5 w-5 text-amber-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {escalations.slice(0, 6).map((message) => (
          <div key={message.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">
                {message.payload.kind === "event" ? message.payload.event.title : message.type}
              </p>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-100">#{message.sequence}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{message.timestamp}</p>
          </div>
        ))}
        {escalations.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
